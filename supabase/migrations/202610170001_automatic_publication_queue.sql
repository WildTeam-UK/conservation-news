-- Automatically queue complete drafts and publish them throughout a controlled
-- daily window. Queue records retain the reason whenever a draft is held back.

alter table public.editorial_run_settings
  add column auto_publish_enabled boolean not null default false,
  add column publish_window_start time not null default '11:00',
  add column publish_window_end time not null default '19:00',
  add column max_auto_publishes_per_day integer not null default 10,
  add column min_auto_publish_overall_score integer not null default 55,
  add column min_auto_publish_evidence_score integer not null default 40;

alter table public.editorial_run_settings
  add constraint editorial_run_settings_publish_window_check
    check (publish_window_end > publish_window_start),
  add constraint editorial_run_settings_publish_limit_check
    check (max_auto_publishes_per_day between 1 and 200),
  add constraint editorial_run_settings_publish_overall_check
    check (min_auto_publish_overall_score between 0 and 100),
  add constraint editorial_run_settings_publish_evidence_check
    check (min_auto_publish_evidence_score between 0 and 100);

create table public.publication_queue (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  source_run_id uuid references public.editorial_runs(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'scheduled', 'publishing', 'published', 'held', 'cancelled')),
  priority_rank integer,
  scheduled_for timestamptz,
  published_at timestamptz,
  hold_reason text,
  attempt_count integer not null default 0,
  claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index publication_queue_due_idx
  on public.publication_queue (scheduled_for)
  where status = 'scheduled';

create index publication_queue_status_created_idx
  on public.publication_queue (status, created_at);

create trigger publication_queue_set_updated_at
before update on public.publication_queue
for each row execute function public.set_updated_at();

alter table public.publication_queue enable row level security;

create policy admins_manage_publication_queue
on public.publication_queue for all to authenticated
using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.publication_queue to authenticated;
grant all on public.publication_queue to service_role;

-- Claim at most one due article on each heartbeat. A five-minute stale timeout
-- makes a request interruption recoverable without allowing double publishing.
create or replace function public.claim_due_publication()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  queue_id uuid;
begin
  if not exists (
    select 1 from public.editorial_run_settings
    where id = true and auto_publish_enabled = true
  ) then
    return null;
  end if;

  update public.publication_queue queue
  set status = 'published', published_at = story.published_at,
      claimed_at = null, hold_reason = null
  from public.stories story
  where queue.story_id = story.id
    and story.status = 'published'
    and queue.status <> 'published';

  update public.publication_queue
  set status = 'scheduled', claimed_at = null,
      last_error = 'Recovered after an interrupted publication request.'
  where status = 'publishing'
    and claimed_at < now() - interval '5 minutes';

  select id into queue_id
  from public.publication_queue
  where status = 'scheduled'
    and scheduled_for <= now()
  order by scheduled_for, created_at
  for update skip locked
  limit 1;

  if queue_id is null then return null; end if;

  update public.publication_queue
  set status = 'publishing', claimed_at = now(), attempt_count = attempt_count + 1
  where id = queue_id;

  return queue_id;
end;
$$;

revoke all on function public.claim_due_publication() from public, anon, authenticated;
grant execute on function public.claim_due_publication() to service_role;
