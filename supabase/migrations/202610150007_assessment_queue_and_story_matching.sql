-- Reliable collected-item backlog processing and reviewable updates to existing stories.

alter table public.source_items
  add column assessment_status text not null default 'pending'
    check (assessment_status in ('pending', 'processing', 'assessed', 'failed', 'expired')),
  add column assessment_attempts integer not null default 0,
  add column assessment_started_at timestamptz,
  add column assessed_at timestamptz,
  add column assessment_error text;

update public.source_items item
set assessment_status = 'assessed',
    assessed_at = coalesce(item.updated_at, now())
where exists (
  select 1 from public.story_cluster_items link where link.source_item_id = item.id
);

create index source_items_assessment_queue_idx
  on public.source_items (assessment_status, published_at desc, discovered_at desc);

-- A feed item describes one underlying editorial event. This also makes
-- interrupted assessment retries incapable of attaching it twice.
create unique index story_cluster_items_source_item_unique_idx
  on public.story_cluster_items (source_item_id);

create or replace function public.claim_source_items_for_assessment(
  batch_size integer default 50,
  freshness_days integer default 7
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.source_items
  set assessment_status = 'pending',
      assessment_started_at = null,
      assessment_error = 'Recovered after an interrupted assessment.'
  where assessment_status = 'processing'
    and assessment_started_at < now() - interval '15 minutes';

  update public.source_items
  set assessment_status = 'pending',
      assessment_started_at = null
  where assessment_status = 'failed'
    and assessment_attempts < 3;

  update public.source_items
  set assessment_status = 'expired',
      assessed_at = now(),
      assessment_error = 'Expired before assessment because the item was older than the editorial freshness window.'
  where assessment_status = 'pending'
    and coalesce(published_at, discovered_at) < now() - make_interval(days => greatest(1, freshness_days));

  return query
  with claimable as (
    select item.id
    from public.source_items item
    where item.assessment_status = 'pending'
      and coalesce(item.published_at, item.discovered_at) >= now() - make_interval(days => greatest(1, freshness_days))
    order by coalesce(item.published_at, item.discovered_at) desc
    for update skip locked
    limit least(greatest(batch_size, 1), 100)
  )
  update public.source_items item
  set assessment_status = 'processing',
      assessment_attempts = item.assessment_attempts + 1,
      assessment_started_at = now(),
      assessment_error = null
  from claimable
  where item.id = claimable.id
  returning item.id;
end;
$$;

revoke all on function public.claim_source_items_for_assessment(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_source_items_for_assessment(integer, integer) to service_role;

alter table public.story_clusters
  add column last_source_at timestamptz;

update public.story_clusters cluster
set last_source_at = dates.latest_at
from (
  select link.cluster_id, max(coalesce(item.published_at, item.discovered_at)) as latest_at
  from public.story_cluster_items link
  join public.source_items item on item.id = link.source_item_id
  group by link.cluster_id
) dates
where dates.cluster_id = cluster.id;

create index story_clusters_recent_matching_idx
  on public.story_clusters (last_source_at desc, created_at desc);

create table public.story_cluster_updates (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  relationship text not null check (relationship in ('same_event', 'meaningful_update')),
  status text not null default 'pending_review' check (status in ('pending_review', 'incorporated', 'dismissed')),
  rationale text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (cluster_id, source_item_id)
);

create index story_cluster_updates_status_created_idx
  on public.story_cluster_updates (status, created_at desc);

alter table public.story_cluster_updates enable row level security;

create policy admins_manage_story_cluster_updates on public.story_cluster_updates for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.story_cluster_updates to authenticated;
grant all on public.story_cluster_updates to service_role;
