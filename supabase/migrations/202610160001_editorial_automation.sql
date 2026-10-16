-- Configurable, resumable editorial automation controlled from the admin dashboard.

alter table public.editorial_run_settings
  add column automation_enabled boolean not null default false,
  add column daily_run_time time not null default '10:00',
  add column automation_timezone text not null default 'Europe/London',
  add column last_scheduled_date date,
  add column last_automation_tick_at timestamptz,
  add column last_automation_error text,
  add column consecutive_automation_failures integer not null default 0,
  add column last_periodic_collection_at timestamptz;

alter table public.editorial_runs
  add column step_lease_token uuid,
  add column step_lease_until timestamptz;

alter table public.editorial_run_settings
  add constraint editorial_run_settings_timezone_check
  check (automation_timezone = 'Europe/London');

-- Atomically returns an existing active run or starts today's scheduled run.
-- Locking the singleton settings row prevents two heartbeat requests from
-- starting overlapping runs.
create or replace function public.claim_due_editorial_run()
returns table (claimed_run_id uuid, newly_started boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.editorial_run_settings%rowtype;
  local_now timestamp;
  active_run_id uuid;
begin
  select * into settings
  from public.editorial_run_settings
  where id = true
  for update;

  update public.editorial_run_settings
  set last_automation_tick_at = now()
  where id = true;

  if not settings.automation_enabled then
    return;
  end if;

  select run.id into active_run_id
  from public.editorial_runs run
  where run.status = 'running'
  order by run.created_at
  limit 1;

  if active_run_id is not null then
    return query select active_run_id, false;
    return;
  end if;

  local_now := timezone(settings.automation_timezone, now());
  if local_now::time < settings.daily_run_time
    or settings.last_scheduled_date is not distinct from local_now::date then
    return;
  end if;

  insert into public.editorial_runs (
    trigger_type,
    status,
    current_stage,
    max_new_drafts,
    max_estimated_cost_usd,
    triggered_by
  ) values (
    'scheduled',
    'running',
    'collecting',
    settings.max_new_drafts,
    settings.max_estimated_cost_usd,
    null
  )
  returning id into active_run_id;

  update public.editorial_run_settings
  set last_scheduled_date = local_now::date,
      last_automation_error = null,
      consecutive_automation_failures = 0
  where id = true;

  return query select active_run_id, true;
end;
$$;

revoke all on function public.claim_due_editorial_run() from public, anon, authenticated;
grant execute on function public.claim_due_editorial_run() to service_role;

-- Claims one collection check every two hours while automation is enabled and
-- no editorial run is active. The daily workflow still performs its own fresh
-- collection immediately before assessment.
create or replace function public.claim_periodic_collection(interval_hours integer default 2)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.editorial_run_settings%rowtype;
begin
  select * into settings
  from public.editorial_run_settings
  where id = true
  for update;

  if not settings.automation_enabled
    or exists (select 1 from public.editorial_runs where status = 'running')
    or settings.last_periodic_collection_at >= now() - make_interval(hours => greatest(1, interval_hours)) then
    return false;
  end if;

  update public.editorial_run_settings
  set last_periodic_collection_at = now()
  where id = true;
  return true;
end;
$$;

revoke all on function public.claim_periodic_collection(integer) from public, anon, authenticated;
grant execute on function public.claim_periodic_collection(integer) to service_role;

-- A short lease prevents the browser and scheduler (or two scheduler ticks)
-- from advancing the same run simultaneously. An interrupted request releases
-- itself automatically when the lease expires.
create or replace function public.claim_editorial_run_step(target_run_id uuid, lease_seconds integer default 90)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lease_token uuid := gen_random_uuid();
begin
  update public.editorial_runs
  set step_lease_token = lease_token,
      step_lease_until = now() + make_interval(secs => greatest(30, least(lease_seconds, 300)))
  where id = target_run_id
    and status = 'running'
    and (step_lease_until is null or step_lease_until < now());

  if found then return lease_token; end if;
  return null;
end;
$$;

create or replace function public.release_editorial_run_step(target_run_id uuid, target_lease_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.editorial_runs
  set step_lease_token = null,
      step_lease_until = null
  where id = target_run_id
    and step_lease_token = target_lease_token;
$$;

revoke all on function public.claim_editorial_run_step(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_editorial_run_step(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_editorial_run_step(uuid, integer) to service_role;
grant execute on function public.release_editorial_run_step(uuid, uuid) to service_role;
