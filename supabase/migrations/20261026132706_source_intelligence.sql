-- Turn the source library into an evidence-led editorial workspace without
-- changing candidate scores or automatically enabling/disabling publishers.

create index if not exists source_items_source_discovered_idx
  on public.source_items (source_id, discovered_at desc);

create index if not exists story_cluster_updates_source_item_idx
  on public.story_cluster_updates (source_item_id);

create table public.source_network_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_key text not null unique,
  kind text not null check (kind in ('dominance', 'coverage_gap', 'collection_failure', 'low_yield')),
  source_id uuid references public.sources(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  status text not null default 'open' check (status in ('open', 'accepted', 'dismissed', 'obsolete')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index source_network_recommendations_status_seen_idx
  on public.source_network_recommendations (status, last_seen_at desc);

create trigger source_network_recommendations_set_updated_at
before update on public.source_network_recommendations
for each row execute function public.set_updated_at();

alter table public.source_network_recommendations enable row level security;

create policy admins_manage_source_network_recommendations
on public.source_network_recommendations for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

grant select, insert, update, delete on public.source_network_recommendations to authenticated;
grant all on public.source_network_recommendations to service_role;

create view public.source_performance
with (security_invoker = true)
as
with item_stats as (
  select
    item.source_id,
    count(*)::integer as items_collected,
    count(*) filter (where item.discovered_at >= now() - interval '30 days')::integer as items_collected_30d,
    count(*) filter (where item.assessment_status = 'assessed')::integer as items_assessed,
    count(*) filter (where item.assessment_status = 'expired')::integer as items_expired,
    count(*) filter (where item.assessment_status in ('pending', 'processing', 'failed'))::integer as items_unresolved,
    max(item.discovered_at) as last_item_at
  from public.source_items item
  group by item.source_id
), cluster_stats as (
  select
    item.source_id,
    count(distinct cluster.id) filter (where cluster.status <> 'rejected')::integer as candidate_clusters,
    count(distinct cluster.id) filter (
      where cluster.status <> 'rejected'
        and item.discovered_at >= now() - interval '30 days'
    )::integer as candidate_clusters_30d,
    count(distinct cluster.id) filter (where cluster.status = 'rejected')::integer as rejected_clusters
  from public.story_cluster_items link
  join public.source_items item on item.id = link.source_item_id
  join public.story_clusters cluster on cluster.id = link.cluster_id
  group by item.source_id
), research_stats as (
  select
    item.source_id,
    count(distinct pack.cluster_id) filter (where pack.status = 'completed')::integer as research_uses,
    count(distinct pack.cluster_id) filter (
      where pack.status = 'completed'
        and pack.updated_at >= now() - interval '30 days'
    )::integer as research_uses_30d
  from public.research_packs pack
  join public.story_cluster_items link on link.cluster_id = pack.cluster_id
  join public.source_items item on item.id = link.source_item_id
  group by item.source_id
), story_stats as (
  select
    item.source_id,
    count(distinct story.id) filter (
      where story.status = 'published' and story.content_type = 'news'
    )::integer as published_story_uses,
    count(distinct story.id) filter (
      where story.status = 'published'
        and story.content_type = 'news'
        and story.published_at >= now() - interval '30 days'
    )::integer as published_story_uses_30d
  from public.stories story
  join public.story_cluster_items link on link.cluster_id = story.cluster_id
  join public.source_items item on item.id = link.source_item_id
  group by item.source_id
), update_stats as (
  select
    item.source_id,
    count(distinct coverage.id)::integer as coverage_updates,
    count(distinct coverage.id) filter (where coverage.status = 'incorporated')::integer as incorporated_updates
  from public.story_cluster_updates coverage
  join public.source_items item on item.id = coverage.source_item_id
  group by item.source_id
), collection_stats as (
  select
    task.source_id,
    count(*) filter (where task.created_at >= now() - interval '30 days')::integer as checks_30d,
    count(*) filter (
      where task.created_at >= now() - interval '30 days' and task.status = 'completed'
    )::integer as successful_checks_30d,
    count(*) filter (
      where task.created_at >= now() - interval '30 days' and task.status = 'failed'
    )::integer as failed_checks_30d,
    coalesce(sum(task.items_new) filter (where task.created_at >= now() - interval '30 days'), 0)::integer as new_items_30d
  from public.ingestion_run_sources task
  group by task.source_id
), published_total as (
  select count(*)::integer as story_count
  from public.stories
  where status = 'published'
    and content_type = 'news'
    and published_at >= now() - interval '30 days'
)
select
  source.id,
  source.name,
  source.homepage_url,
  source.feed_url,
  source.source_kind,
  source.enabled,
  source.last_checked_at,
  source.last_success_at,
  source.last_error,
  coalesce(items.items_collected, 0) as items_collected,
  coalesce(items.items_collected_30d, 0) as items_collected_30d,
  coalesce(items.items_assessed, 0) as items_assessed,
  coalesce(items.items_expired, 0) as items_expired,
  coalesce(items.items_unresolved, 0) as items_unresolved,
  items.last_item_at,
  coalesce(clusters.candidate_clusters, 0) as candidate_clusters,
  coalesce(clusters.candidate_clusters_30d, 0) as candidate_clusters_30d,
  coalesce(clusters.rejected_clusters, 0) as rejected_clusters,
  coalesce(research.research_uses, 0) as research_uses,
  coalesce(research.research_uses_30d, 0) as research_uses_30d,
  coalesce(stories.published_story_uses, 0) as published_story_uses,
  coalesce(stories.published_story_uses_30d, 0) as published_story_uses_30d,
  coalesce(updates.coverage_updates, 0) as coverage_updates,
  coalesce(updates.incorporated_updates, 0) as incorporated_updates,
  coalesce(collection.checks_30d, 0) as checks_30d,
  coalesce(collection.successful_checks_30d, 0) as successful_checks_30d,
  coalesce(collection.failed_checks_30d, 0) as failed_checks_30d,
  coalesce(collection.new_items_30d, 0) as new_items_30d,
  published_total.story_count as published_news_30d,
  case
    when coalesce(items.items_collected_30d, 0) = 0 then null
    else round(coalesce(clusters.candidate_clusters_30d, 0)::numeric / items.items_collected_30d, 4)
  end as candidate_yield_30d,
  case
    when published_total.story_count = 0 then 0::numeric
    else round(coalesce(stories.published_story_uses_30d, 0)::numeric / published_total.story_count, 4)
  end as contribution_share_30d
from public.sources source
left join item_stats items on items.source_id = source.id
left join cluster_stats clusters on clusters.source_id = source.id
left join research_stats research on research.source_id = source.id
left join story_stats stories on stories.source_id = source.id
left join update_stats updates on updates.source_id = source.id
left join collection_stats collection on collection.source_id = source.id
cross join published_total;

revoke all on public.source_performance from public, anon;
grant select on public.source_performance to authenticated, service_role;

create or replace function public.refresh_source_network_recommendations()
returns table (open_recommendations integer, created_or_updated integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  refresh_started_at timestamptz := clock_timestamp();
  affected_count integer := 0;
  change_count integer := 0;
begin
  insert into public.source_network_recommendations (
    recommendation_key, kind, source_id, title, summary, evidence, last_seen_at
  )
  select
    'dominance:' || performance.id,
    'dominance',
    performance.id,
    performance.name || ' is contributing a large share of recent coverage',
    performance.name || ' contributed to ' || performance.published_story_uses_30d || ' of ' || performance.published_news_30d || ' published news articles in the last 30 days. Keep the source active, but prioritise finding strong publishers that broaden the source mix.',
    jsonb_build_object(
      'published_story_uses_30d', performance.published_story_uses_30d,
      'published_news_30d', performance.published_news_30d,
      'contribution_share_30d', performance.contribution_share_30d,
      'threshold', 0.25
    ),
    refresh_started_at
  from public.source_performance performance
  where performance.published_news_30d >= 20
    and performance.contribution_share_30d > 0.25
  on conflict (recommendation_key) do update
    set title = excluded.title,
        summary = excluded.summary,
        evidence = excluded.evidence,
        last_seen_at = excluded.last_seen_at,
        status = case when source_network_recommendations.status = 'obsolete' then 'open' else source_network_recommendations.status end;
  get diagnostics change_count = row_count;
  affected_count := affected_count + change_count;

  insert into public.source_network_recommendations (
    recommendation_key, kind, source_id, title, summary, evidence, last_seen_at
  )
  select
    'collection_failure:' || performance.id,
    'collection_failure',
    performance.id,
    'Review repeated collection failures for ' || performance.name,
    performance.failed_checks_30d || ' collection checks failed for ' || performance.name || ' in the last 30 days. Check the feed before deciding whether to repair, replace or pause it.',
    jsonb_build_object(
      'checks_30d', performance.checks_30d,
      'failed_checks_30d', performance.failed_checks_30d,
      'last_error', performance.last_error
    ),
    refresh_started_at
  from public.source_performance performance
  where performance.enabled and performance.failed_checks_30d >= 3
  on conflict (recommendation_key) do update
    set title = excluded.title,
        summary = excluded.summary,
        evidence = excluded.evidence,
        last_seen_at = excluded.last_seen_at,
        status = case when source_network_recommendations.status = 'obsolete' then 'open' else source_network_recommendations.status end;
  get diagnostics change_count = row_count;
  affected_count := affected_count + change_count;

  insert into public.source_network_recommendations (
    recommendation_key, kind, source_id, title, summary, evidence, last_seen_at
  )
  select
    'low_yield:' || performance.id,
    'low_yield',
    performance.id,
    'Review the recent yield from ' || performance.name,
    performance.name || ' produced ' || performance.items_collected_30d || ' collected items but only ' || performance.candidate_clusters_30d || ' candidate contributions in the last 30 days. Review relevance before changing the source.',
    jsonb_build_object(
      'items_collected_30d', performance.items_collected_30d,
      'candidate_clusters_30d', performance.candidate_clusters_30d,
      'candidate_yield_30d', performance.candidate_yield_30d,
      'minimum_sample', 20,
      'threshold', 0.05
    ),
    refresh_started_at
  from public.source_performance performance
  where performance.enabled
    and performance.items_collected_30d >= 20
    and coalesce(performance.candidate_yield_30d, 0) < 0.05
  on conflict (recommendation_key) do update
    set title = excluded.title,
        summary = excluded.summary,
        evidence = excluded.evidence,
        last_seen_at = excluded.last_seen_at,
        status = case when source_network_recommendations.status = 'obsolete' then 'open' else source_network_recommendations.status end;
  get diagnostics change_count = row_count;
  affected_count := affected_count + change_count;

  insert into public.source_network_recommendations (
    recommendation_key, kind, topic_id, title, summary, evidence, last_seen_at
  )
  select
    'coverage_gap:' || topic.id,
    'coverage_gap',
    topic.id,
    'Broaden recent coverage of ' || topic.name,
    'Only ' || count(distinct story.id) || ' published news article' || case when count(distinct story.id) = 1 then '' else 's' end || ' covered ' || topic.name || ' in the last 30 days. This may indicate a source-network gap, so review relevant publishers before adding anything.',
    jsonb_build_object(
      'topic_name', topic.name,
      'published_stories_30d', count(distinct story.id),
      'window_days', 30
    ),
    refresh_started_at
  from public.topics topic
  left join public.story_topics story_topic on story_topic.topic_id = topic.id
  left join public.stories story on story.id = story_topic.story_id
    and story.status = 'published'
    and story.content_type = 'news'
    and story.published_at >= now() - interval '30 days'
  where topic.active
    and (select count(*) from public.stories recent where recent.status = 'published' and recent.content_type = 'news' and recent.published_at >= now() - interval '30 days') >= 20
  group by topic.id, topic.name
  having count(distinct story.id) <= 1
  on conflict (recommendation_key) do update
    set title = excluded.title,
        summary = excluded.summary,
        evidence = excluded.evidence,
        last_seen_at = excluded.last_seen_at,
        status = case when source_network_recommendations.status = 'obsolete' then 'open' else source_network_recommendations.status end;
  get diagnostics change_count = row_count;
  affected_count := affected_count + change_count;

  update public.source_network_recommendations
  set status = 'obsolete'
  where status = 'open'
    and last_seen_at < refresh_started_at;

  return query
  select
    count(*) filter (where status = 'open')::integer,
    affected_count
  from public.source_network_recommendations;
end;
$$;

revoke all on function public.refresh_source_network_recommendations() from public, anon, authenticated;
grant execute on function public.refresh_source_network_recommendations() to service_role;
