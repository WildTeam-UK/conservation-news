-- Durable, independently retryable delivery of published digests to Buffer and Brevo.
-- Distribution remains disabled in digest_settings until an editor enables it.

alter table public.digest_runs
  drop constraint digest_runs_social_status_check,
  add constraint digest_runs_social_status_check
    check (social_status in ('disabled', 'pending', 'ready', 'queued', 'published', 'partial', 'failed')),
  drop constraint digest_runs_email_status_check,
  add constraint digest_runs_email_status_check
    check (email_status in ('disabled', 'pending', 'ready', 'scheduled', 'sent', 'failed'));

create table public.digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.digest_runs(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  provider text not null check (provider in ('buffer', 'brevo')),
  destination text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'submitted', 'completed', 'failed', 'uncertain', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  provider_reference text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, provider, destination)
);

create index digest_deliveries_due_idx
  on public.digest_deliveries (next_attempt_at, created_at)
  where status = 'pending';
create index digest_deliveries_run_idx on public.digest_deliveries (run_id, provider, status);

create trigger digest_deliveries_set_updated_at
before update on public.digest_deliveries
for each row execute function public.set_updated_at();

alter table public.digest_deliveries enable row level security;

create policy admins_manage_digest_deliveries on public.digest_deliveries
for all to authenticated
using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.digest_deliveries to authenticated;
grant all on public.digest_deliveries to service_role;

create or replace function public.claim_due_digest_delivery(lease_seconds integer default 90)
returns table (delivery_id uuid, delivery_lease_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
  claimed_token uuid := gen_random_uuid();
begin
  -- A request that disappears after claiming may already have reached the provider.
  -- Do not replay it automatically because that could duplicate a post or campaign.
  update public.digest_runs
  set status = 'partial',
      error_summary = 'An external delivery has an uncertain provider outcome.',
      completed_at = now()
  where id in (
    select run_id from public.digest_deliveries
    where status = 'processing' and lease_expires_at < now()
  );

  update public.digest_deliveries
  set status = 'uncertain',
      last_error = coalesce(last_error, 'Delivery claim expired before the provider result was recorded.'),
      lease_token = null,
      lease_expires_at = null
  where status = 'processing'
    and lease_expires_at < now();

  select delivery.id into claimed_id
  from public.digest_deliveries delivery
  where delivery.status = 'pending'
    and delivery.next_attempt_at <= now()
    and exists (
      select 1 from public.digest_settings settings
      where settings.id = true
        and (
          (delivery.provider = 'buffer' and settings.social_distribution_enabled)
          or (delivery.provider = 'brevo' and settings.email_distribution_enabled)
        )
    )
  order by delivery.next_attempt_at, delivery.created_at
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  update public.digest_deliveries
  set status = 'processing',
      attempt_count = attempt_count + 1,
      lease_token = claimed_token,
      lease_expires_at = now() + make_interval(secs => greatest(30, least(lease_seconds, 300))),
      last_error = null
  where id = claimed_id;

  return query select claimed_id, claimed_token;
end;
$$;

revoke all on function public.claim_due_digest_delivery(integer) from public, anon, authenticated;
grant execute on function public.claim_due_digest_delivery(integer) to service_role;
