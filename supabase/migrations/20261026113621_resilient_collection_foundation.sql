-- Split each ingestion run into resumable, independently leased source checks.
-- Existing collection behaviour remains compatible until the application starts
-- creating task rows and claiming them through these functions.

alter table public.editorial_run_settings
  add column collection_batch_size integer not null default 10
    check (collection_batch_size between 1 and 25),
  add column collection_concurrency integer not null default 5
    check (collection_concurrency between 1 and 10),
  add column source_item_raw_retention_days integer not null default 30
    check (source_item_raw_retention_days between 7 and 365);

create unique index ingestion_runs_one_active_idx
  on public.ingestion_runs ((true))
  where status in ('queued', 'collecting');

create table public.ingestion_run_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'checking', 'completed', 'failed')),
  attempt_count integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  items_found integer not null default 0,
  items_new integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, source_id)
);

create index ingestion_run_sources_claim_idx
  on public.ingestion_run_sources (run_id, status, created_at)
  where status in ('queued', 'checking');

create trigger ingestion_run_sources_set_updated_at
before update on public.ingestion_run_sources
for each row execute function public.set_updated_at();

alter table public.ingestion_run_sources enable row level security;

create policy admins_manage_ingestion_run_sources
on public.ingestion_run_sources for all to authenticated
using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.ingestion_run_sources to authenticated;
grant all on public.ingestion_run_sources to service_role;

create or replace function public.claim_ingestion_source_batch(
  target_run_id uuid,
  batch_size integer default 10,
  lease_seconds integer default 90
)
returns table (
  task_id uuid,
  task_lease_token uuid,
  source_id uuid,
  source_name text,
  feed_url text,
  source_kind text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_token uuid := gen_random_uuid();
begin
  update public.ingestion_run_sources task
  set status = 'queued',
      lease_token = null,
      lease_until = null,
      error_summary = 'Recovered after an interrupted source check.'
  where task.run_id = target_run_id
    and task.status = 'checking'
    and task.lease_until < now();

  update public.ingestion_runs
  set status = 'collecting',
      started_at = coalesce(started_at, now()),
      completed_at = null
  where id = target_run_id
    and status in ('queued', 'collecting');

  return query
  with claimable as (
    select task.id
    from public.ingestion_run_sources task
    join public.ingestion_runs run on run.id = task.run_id
    where task.run_id = target_run_id
      and task.status = 'queued'
      and run.status in ('queued', 'collecting')
    order by task.created_at, task.id
    for update of task skip locked
    limit least(greatest(batch_size, 1), 25)
  ), claimed as (
    update public.ingestion_run_sources task
    set status = 'checking',
        attempt_count = task.attempt_count + 1,
        lease_token = batch_token,
        lease_until = now() + make_interval(secs => greatest(30, least(lease_seconds, 300))),
        started_at = coalesce(task.started_at, now()),
        completed_at = null
    from claimable
    where task.id = claimable.id
    returning task.id, task.source_id
  )
  select claimed.id, batch_token, source.id, source.name, source.feed_url, source.source_kind
  from claimed
  join public.sources source on source.id = claimed.source_id
  order by source.name;
end;
$$;

revoke all on function public.claim_ingestion_source_batch(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_ingestion_source_batch(uuid, integer, integer) to service_role;

create or replace function public.refresh_ingestion_run(target_run_id uuid)
returns table (
  run_status text,
  sources_checked integer,
  items_found integer,
  items_new integer,
  remaining_sources integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  total_count integer;
  completed_count integer;
  failed_count integer;
  found_count integer;
  new_count integer;
  next_status text;
  failures text;
begin
  select
    count(*)::integer,
    count(*) filter (where task.status = 'completed')::integer,
    count(*) filter (where task.status = 'failed')::integer,
    coalesce(sum(task.items_found), 0)::integer,
    0,
    string_agg(source.name || ': ' || task.error_summary, E'\n' order by source.name)
      filter (where task.status = 'failed' and task.error_summary is not null)
  into total_count, completed_count, failed_count, found_count, new_count, failures
  from public.ingestion_run_sources task
  join public.sources source on source.id = task.source_id
  where task.run_id = target_run_id;

  select count(*)::integer
  into new_count
  from public.source_items item
  where item.ingestion_run_id = target_run_id;

  next_status := case
    when total_count = 0 then 'failed'
    when completed_count + failed_count < total_count then 'collecting'
    when completed_count = 0 then 'failed'
    when failed_count = 0 then 'completed'
    else 'partial'
  end;

  update public.ingestion_runs
  set status = next_status,
      started_at = coalesce(started_at, now()),
      completed_at = case when next_status in ('completed', 'partial', 'failed') then now() else null end,
      sources_checked = completed_count + failed_count,
      items_found = found_count,
      items_new = new_count,
      error_summary = left(failures, 2000)
  where id = target_run_id;

  return query select
    next_status,
    completed_count + failed_count,
    found_count,
    new_count,
    greatest(total_count - completed_count - failed_count, 0);
end;
$$;

revoke all on function public.refresh_ingestion_run(uuid) from public, anon, authenticated;
grant execute on function public.refresh_ingestion_run(uuid) to service_role;

create table public.data_retention_runs (
  id bigint generated always as identity primary key,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  raw_payloads_pruned integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

alter table public.data_retention_runs enable row level security;

create policy admins_read_data_retention_runs
on public.data_retention_runs for select to authenticated
using (public.is_content_admin());

grant select on public.data_retention_runs to authenticated;
grant all on public.data_retention_runs to service_role;
grant usage, select on sequence public.data_retention_runs_id_seq to authenticated, service_role;

create index source_items_raw_retention_idx
  on public.source_items (discovered_at, id)
  where raw_content is not null and assessment_status in ('assessed', 'expired');

-- Raw feed payloads are the large, replaceable part of collection storage. Keep
-- the item, URL, title, summary and audit relationships, but prune old payloads
-- in a small daily batch after assessment has finished. Record deletion is
-- deliberately deferred until the 365-day policy has real production history.
create or replace function public.prune_source_item_payloads(batch_size integer default 250)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  retention_days integer;
  pruned_count integer := 0;
  lock_acquired boolean;
begin
  lock_acquired := pg_try_advisory_xact_lock(hashtext('wildnews_source_item_payload_retention'));
  if not lock_acquired then
    return 0;
  end if;

  if exists (
    select 1
    from public.data_retention_runs
    where (status = 'completed' and created_at >= now() - interval '24 hours')
       or (status = 'failed' and created_at >= now() - interval '1 hour')
  ) then
    return 0;
  end if;

  select source_item_raw_retention_days
  into retention_days
  from public.editorial_run_settings
  where id = true;

  with candidates as (
    select item.id
    from public.source_items item
    where item.raw_content is not null
      and item.assessment_status in ('assessed', 'expired')
      and item.discovered_at < now() - make_interval(days => coalesce(retention_days, 30))
      and not exists (
        select 1 from public.story_sources source
        where source.source_item_id = item.id
      )
      and not exists (
        select 1
        from public.story_cluster_items link
        join public.stories story on story.cluster_id = link.cluster_id
        where link.source_item_id = item.id
      )
      and not exists (
        select 1
        from public.story_cluster_items link
        join public.research_packs pack on pack.cluster_id = link.cluster_id
        where link.source_item_id = item.id
      )
      and not exists (
        select 1 from public.story_cluster_updates coverage
        where coverage.source_item_id = item.id
          and coverage.status = 'pending_review'
      )
    order by item.discovered_at, item.id
    for update skip locked
    limit least(greatest(batch_size, 1), 1000)
  )
  update public.source_items item
  set raw_content = null
  from candidates
  where item.id = candidates.id;

  get diagnostics pruned_count = row_count;

  insert into public.data_retention_runs (raw_payloads_pruned)
  values (pruned_count);

  return pruned_count;
exception when others then
  insert into public.data_retention_runs (status, error_summary)
  values ('failed', left(sqlerrm, 1000));
  return -1;
end;
$$;

revoke all on function public.prune_source_item_payloads(integer) from public, anon, authenticated;
grant execute on function public.prune_source_item_payloads(integer) to service_role;
