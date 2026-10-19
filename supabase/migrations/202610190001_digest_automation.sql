-- Atomically claim one due digest from the existing one-minute editorial heartbeat.
-- Friday creates the weekly edition instead of a daily edition. Interrupted work
-- can be recovered after fifteen minutes; completed and failed runs are not repeated.

create or replace function public.claim_due_digest_run()
returns table (
  claimed_run_id uuid,
  claimed_digest_type text,
  claimed_period_end timestamptz,
  should_publish boolean,
  is_recovery boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.digest_settings%rowtype;
  local_now timestamp;
  due_type text;
  due_period_end timestamptz;
  existing_run public.digest_runs%rowtype;
begin
  select * into settings
  from public.digest_settings
  where id = true
  for update;

  update public.digest_settings
  set last_automation_tick_at = now()
  where id = true;

  if not settings.automation_enabled then
    return;
  end if;

  local_now := timezone(settings.automation_timezone, now());
  if local_now::time < settings.run_time then
    return;
  end if;

  due_type := case when extract(isodow from local_now)::integer = settings.weekly_day then 'weekly' else 'daily' end;
  due_period_end := (local_now::date + settings.run_time) at time zone settings.automation_timezone;

  select * into existing_run
  from public.digest_runs
  where digest_type = due_type
    and period_end = due_period_end
  for update;

  if existing_run.id is null then
    insert into public.digest_runs (
      digest_type,
      trigger_type,
      status,
      period_start,
      period_end,
      social_status,
      email_status,
      started_at
    ) values (
      due_type,
      'scheduled',
      'queued',
      due_period_end - case when due_type = 'weekly' then interval '7 days' else interval '1 day' end,
      due_period_end,
      'disabled',
      'disabled',
      now()
    ) returning * into existing_run;

    update public.digest_settings
    set last_automation_error = null,
        consecutive_automation_failures = 0
    where id = true;

    return query select existing_run.id, due_type, due_period_end, settings.publish_immediately, false;
    return;
  end if;

  if existing_run.status = 'generated' and settings.publish_immediately and existing_run.story_id is not null then
    update public.digest_runs
    set status = 'publishing',
        trigger_type = 'scheduled',
        started_at = now(),
        error_summary = null,
        completed_at = null
    where id = existing_run.id;
    return query select existing_run.id, due_type, due_period_end, true, true;
    return;
  end if;

  if existing_run.status in ('queued', 'generating', 'publishing')
    and existing_run.updated_at < now() - interval '15 minutes' then
    update public.digest_runs
    set status = 'queued',
        trigger_type = 'retry',
        started_at = now(),
        error_summary = null,
        completed_at = null
    where id = existing_run.id;
    return query select existing_run.id, due_type, due_period_end, settings.publish_immediately, true;
  end if;
end;
$$;

revoke all on function public.claim_due_digest_run() from public, anon, authenticated;
grant execute on function public.claim_due_digest_run() to service_role;
