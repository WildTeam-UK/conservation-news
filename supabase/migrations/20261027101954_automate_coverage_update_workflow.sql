-- Let the existing heartbeat prepare and apply source-grounded article updates
-- without removing the recoverable manual review path.

alter table public.editorial_run_settings
  add column auto_coverage_updates_enabled boolean not null default true;

alter table public.story_cluster_updates
  drop constraint story_cluster_updates_status_check,
  add constraint story_cluster_updates_status_check check (
    status in ('pending_review', 'processing', 'in_revision', 'incorporated', 'no_change', 'dismissed')
  ),
  add column automation_attempt_count integer not null default 0 check (automation_attempt_count >= 0),
  add column automation_claimed_at timestamptz,
  add column automation_next_attempt_at timestamptz,
  add column automation_last_error text;

alter table public.story_editorial_revisions
  add column automation_attempt_count integer not null default 0 check (automation_attempt_count >= 0),
  add column automation_claimed_at timestamptz,
  add column automation_next_attempt_at timestamptz,
  add column automation_last_error text;

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select current_user = 'service_role' or exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_content_admin() from public, anon;
grant execute on function public.is_content_admin() to authenticated, service_role;

create index story_cluster_updates_automation_idx
  on public.story_cluster_updates (status, automation_next_attempt_at, created_at)
  where status in ('pending_review', 'processing');

create index story_editorial_revisions_automation_idx
  on public.story_editorial_revisions (automation_next_attempt_at, created_at)
  where status = 'draft' and created_by is null;

create or replace function public.claim_coverage_update_work(
  lease_seconds integer default 900,
  batch_size integer default 5
)
returns table (
  work_type text,
  revision_id uuid,
  update_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_revision_id uuid;
  selected_cluster_id uuid;
  lease_interval interval := make_interval(secs => greatest(60, least(lease_seconds, 3600)));
  safe_batch_size integer := greatest(1, least(batch_size, 10));
begin
  if current_user <> 'service_role' then
    raise exception 'Service role access is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.editorial_run_settings
    where id = true and auto_coverage_updates_enabled = true
  ) then
    return;
  end if;

  update public.story_cluster_updates
  set status = 'pending_review',
      automation_claimed_at = null,
      automation_next_attempt_at = null,
      automation_last_error = coalesce(automation_last_error, 'Automatic update processing stopped after three interrupted attempts.')
  where status = 'processing'
    and automation_attempt_count >= 3
    and automation_claimed_at < now() - lease_interval;

  select revision.id into selected_revision_id
  from public.story_editorial_revisions revision
  join public.stories story on story.id = revision.story_id
  where revision.status = 'draft'
    and revision.created_by is null
    and story.status in ('draft', 'published')
    and revision.automation_attempt_count < 3
    and not exists (
      select 1
      from public.story_cluster_updates coverage
      where coverage.cluster_id = story.cluster_id
        and coverage.status in ('pending_review', 'processing')
        and coverage.automation_attempt_count < 3
        and (
          (coverage.status = 'pending_review'
            and (coverage.automation_last_error is null or coverage.automation_next_attempt_at <= now()))
          or (coverage.status = 'processing' and coverage.automation_claimed_at < now() - lease_interval)
        )
    )
    and (
      (revision.automation_claimed_at is null and (revision.automation_next_attempt_at is null or revision.automation_next_attempt_at <= now()))
      or revision.automation_claimed_at < now() - lease_interval
    )
  order by revision.created_at
  for update of revision skip locked
  limit 1;

  if selected_revision_id is not null then
    update public.story_editorial_revisions
    set automation_attempt_count = automation_attempt_count + 1,
        automation_claimed_at = now(),
        automation_next_attempt_at = null,
        automation_last_error = null
    where id = selected_revision_id;

    return query select 'apply_revision'::text, selected_revision_id, null::uuid;
    return;
  end if;

  select coverage.cluster_id into selected_cluster_id
  from public.story_cluster_updates coverage
  join public.stories story
    on story.cluster_id = coverage.cluster_id
   and story.content_type = 'news'
   and story.status in ('draft', 'published')
  where coverage.status in ('pending_review', 'processing')
    and coverage.automation_attempt_count < 3
    and not exists (
      select 1
      from public.story_editorial_revisions manual_revision
      where manual_revision.story_id = story.id
        and manual_revision.status = 'draft'
        and manual_revision.created_by is not null
    )
    and (
      (coverage.status = 'pending_review'
        and (coverage.automation_last_error is null or coverage.automation_next_attempt_at <= now()))
      or (coverage.status = 'processing' and coverage.automation_claimed_at < now() - lease_interval)
    )
  order by coverage.created_at
  for update of coverage skip locked
  limit 1;

  if selected_cluster_id is null then
    return;
  end if;

  return query
  with selected_updates as (
    select coverage.id
    from public.story_cluster_updates coverage
    where coverage.cluster_id = selected_cluster_id
      and coverage.status in ('pending_review', 'processing')
      and coverage.automation_attempt_count < 3
      and (
        (coverage.status = 'pending_review'
          and (coverage.automation_last_error is null or coverage.automation_next_attempt_at <= now()))
        or (coverage.status = 'processing' and coverage.automation_claimed_at < now() - lease_interval)
      )
    order by coverage.created_at
    for update skip locked
    limit safe_batch_size
  ), claimed as (
    update public.story_cluster_updates coverage
    set status = 'processing',
        automation_attempt_count = coverage.automation_attempt_count + 1,
        automation_claimed_at = now(),
        automation_next_attempt_at = null,
        automation_last_error = null
    from selected_updates
    where coverage.id = selected_updates.id
    returning coverage.id
  )
  select 'prepare_updates'::text, null::uuid, claimed.id
  from claimed;
end;
$$;

create or replace function public.release_coverage_update_work(
  update_ids uuid[],
  error_detail text,
  retry_seconds integer default 300
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'Service role access is required.' using errcode = '42501';
  end if;

  update public.story_cluster_updates
  set status = 'pending_review',
      automation_claimed_at = null,
      automation_next_attempt_at = case
        when automation_attempt_count < 3 then now() + make_interval(secs => greatest(60, least(retry_seconds, 3600)))
        else null
      end,
      automation_last_error = left(coalesce(nullif(trim(error_detail), ''), 'Automatic update processing failed.'), 1000)
  where id = any(update_ids)
    and status = 'processing';
end;
$$;

create or replace function public.release_coverage_revision_work(
  target_revision_id uuid,
  error_detail text,
  retry_seconds integer default 300
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'Service role access is required.' using errcode = '42501';
  end if;

  update public.story_editorial_revisions
  set automation_claimed_at = null,
      automation_next_attempt_at = case
        when automation_attempt_count < 3 then now() + make_interval(secs => greatest(60, least(retry_seconds, 3600)))
        else null
      end,
      automation_last_error = left(coalesce(nullif(trim(error_detail), ''), 'Automatic revision application failed.'), 1000)
  where id = target_revision_id
    and status = 'draft'
    and created_by is null;
end;
$$;

revoke all on function public.claim_coverage_update_work(integer, integer) from public, anon, authenticated;
revoke all on function public.release_coverage_update_work(uuid[], text, integer) from public, anon, authenticated;
revoke all on function public.release_coverage_revision_work(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_coverage_update_work(integer, integer) to service_role;
grant execute on function public.release_coverage_update_work(uuid[], text, integer) to service_role;
grant execute on function public.release_coverage_revision_work(uuid, text, integer) to service_role;

create or replace function public.apply_story_editorial_revision_v2(
  target_revision_id uuid,
  has_public_content_changes boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_story_id uuid;
  applied_story_id uuid;
  previous_editorial_updated_at timestamptz;
  previous_editorial_change_summary text;
begin
  if current_user <> 'service_role' and not public.is_content_admin() then
    raise exception 'Content administrator access is required.' using errcode = '42501';
  end if;

  select revision.story_id, story.editorial_updated_at, story.editorial_change_summary
    into target_story_id, previous_editorial_updated_at, previous_editorial_change_summary
  from public.story_editorial_revisions revision
  join public.stories story on story.id = revision.story_id
  where revision.id = target_revision_id
  for update of revision, story;

  if target_story_id is null then
    raise exception 'Editorial revision not found.' using errcode = 'P0002';
  end if;

  update public.story_editorial_revisions
  set public_content_changed = has_public_content_changes
  where id = target_revision_id;

  applied_story_id := public.apply_story_editorial_revision(target_revision_id);

  if not has_public_content_changes then
    update public.stories
    set editorial_updated_at = previous_editorial_updated_at,
        editorial_change_summary = previous_editorial_change_summary
    where id = applied_story_id;
  end if;

  update public.editorial_actions
  set notes = case
        when has_public_content_changes then notes
        else 'Additional source coverage applied without changing the public article copy or editorial update date.'
      end,
      changes = changes || jsonb_build_object('public_content_changed', has_public_content_changes, 'automated', auth.uid() is null)
  where story_id = applied_story_id
    and action = 'edited'
    and changes ->> 'revision_id' = target_revision_id::text;

  return applied_story_id;
end;
$$;

revoke all on function public.apply_story_editorial_revision_v2(uuid, boolean) from public, anon;
grant execute on function public.apply_story_editorial_revision_v2(uuid, boolean) to authenticated, service_role;
