-- Anonymous, aggregate learning signals for published stories and digests.
-- Writes are service-role only so the public API can validate every event.

create table public.content_interactions (
  id bigint generated always as identity primary key,
  event_key uuid not null unique,
  story_id uuid not null references public.stories(id) on delete cascade,
  event_type text not null check (event_type in (
    'view',
    'usefulness_positive',
    'usefulness_negative',
    'share_linkedin',
    'share_facebook',
    'share_x',
    'copy_link',
    'outbound_source',
    'digest_story'
  )),
  related_story_id uuid references public.stories(id) on delete set null,
  story_source_id uuid references public.story_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  check (event_type <> 'digest_story' or related_story_id is not null),
  check (event_type <> 'outbound_source' or story_source_id is not null)
);

create index content_interactions_story_created_idx
  on public.content_interactions (story_id, created_at desc);
create index content_interactions_type_created_idx
  on public.content_interactions (event_type, created_at desc);
create index content_interactions_source_created_idx
  on public.content_interactions (story_source_id, created_at desc)
  where story_source_id is not null;
create index content_interactions_related_story_idx
  on public.content_interactions (related_story_id)
  where related_story_id is not null;

alter table public.content_interactions enable row level security;

create policy admins_read_content_interactions
on public.content_interactions for select to authenticated
using (public.is_content_admin());

grant select on public.content_interactions to authenticated;
grant all on public.content_interactions to service_role;
grant usage, select on sequence public.content_interactions_id_seq to service_role;

create or replace function public.record_content_interaction(
  p_event_key uuid,
  p_story_id uuid,
  p_event_type text,
  p_related_story_id uuid default null,
  p_story_source_id uuid default null
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into public.content_interactions (
    event_key,
    story_id,
    event_type,
    related_story_id,
    story_source_id
  ) values (
    p_event_key,
    p_story_id,
    p_event_type,
    p_related_story_id,
    p_story_source_id
  )
  on conflict (event_key) do update
  set event_type = excluded.event_type
  where content_interactions.story_id = excluded.story_id
    and (
      (
        content_interactions.event_type in ('usefulness_positive', 'usefulness_negative')
        and excluded.event_type in ('usefulness_positive', 'usefulness_negative')
      )
      or (
        content_interactions.event_type = excluded.event_type
        and content_interactions.related_story_id is not distinct from excluded.related_story_id
        and content_interactions.story_source_id is not distinct from excluded.story_source_id
      )
    );

  return found;
end;
$$;

revoke all on function public.record_content_interaction(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_content_interaction(uuid, uuid, text, uuid, uuid) to service_role;

create view public.content_outcomes_30d
with (security_invoker = true)
as
select
  story.id as story_id,
  story.slug,
  story.headline,
  story.content_type,
  story.published_at,
  count(interaction.id) filter (where interaction.event_type = 'view')::integer as views,
  count(interaction.id) filter (where interaction.event_type = 'usefulness_positive')::integer as usefulness_positive,
  count(interaction.id) filter (where interaction.event_type = 'usefulness_negative')::integer as usefulness_negative,
  count(interaction.id) filter (where interaction.event_type in ('share_linkedin', 'share_facebook', 'share_x', 'copy_link'))::integer as share_actions,
  count(interaction.id) filter (where interaction.event_type = 'outbound_source')::integer as outbound_source_clicks,
  count(interaction.id) filter (where interaction.event_type = 'digest_story')::integer as digest_story_clicks
from public.stories story
left join public.content_interactions interaction
  on interaction.story_id = story.id
 and interaction.created_at >= now() - interval '30 days'
where story.status = 'published'
  and story.published_at <= now()
group by story.id, story.slug, story.headline, story.content_type, story.published_at;

create view public.source_outcomes_30d
with (security_invoker = true)
as
select
  monitored.id as source_id,
  cited.source_name,
  count(interaction.id)::integer as outbound_clicks,
  count(distinct interaction.story_id)::integer as stories_clicked
from public.content_interactions interaction
join public.story_sources cited on cited.id = interaction.story_source_id
left join public.source_items item on item.id = cited.source_item_id
left join public.sources monitored on monitored.id = item.source_id
where interaction.event_type = 'outbound_source'
  and interaction.created_at >= now() - interval '30 days'
group by monitored.id, cited.source_name;

grant select on public.content_outcomes_30d, public.source_outcomes_30d to authenticated, service_role;

-- Calibration must demonstrate stable recommendation quality before a future
-- migration can enable automatic source-list changes.
create table public.source_learning_policy (
  id boolean primary key default true check (id = true),
  observation_days integer not null default 90 check (observation_days between 30 and 365),
  minimum_reviewed_recommendations integer not null default 20 check (minimum_reviewed_recommendations between 10 and 1000),
  minimum_decisions_per_rule integer not null default 10 check (minimum_decisions_per_rule between 5 and 500),
  minimum_acceptance_rate numeric(5, 4) not null default 0.8000 check (minimum_acceptance_rate between 0.5 and 1),
  automatic_source_changes_enabled boolean not null default false check (automatic_source_changes_enabled = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.source_learning_policy (id) values (true);

create trigger source_learning_policy_set_updated_at
before update on public.source_learning_policy
for each row execute function public.set_updated_at();

alter table public.source_learning_policy enable row level security;

create policy admins_read_source_learning_policy
on public.source_learning_policy for select to authenticated
using (public.is_content_admin());

grant select on public.source_learning_policy to authenticated;
grant all on public.source_learning_policy to service_role;
