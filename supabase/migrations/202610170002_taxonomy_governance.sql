-- Automated taxonomy governance, SEO archive copy and ranked story tags.

alter table public.topics
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists seo_generated_at timestamptz;

alter table public.content_tags
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists seo_generated_at timestamptz;

alter table public.story_tags
  add column if not exists confidence integer check (confidence between 0 and 100),
  add column if not exists rationale text;

create table if not exists public.taxonomy_settings (
  id boolean primary key default true check (id),
  automation_enabled boolean not null default true,
  min_published_stories integer not null default 3 check (min_published_stories between 1 and 100),
  last_governance_run_at timestamptz,
  last_governance_error text,
  last_estimated_cost_usd numeric(12, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.taxonomy_settings (id) values (true)
on conflict (id) do nothing;

update public.story_tags as story_tag
set
  confidence = cluster_tag.confidence,
  rationale = cluster_tag.rationale
from public.stories as story
join public.story_cluster_tags as cluster_tag
  on cluster_tag.cluster_id = story.cluster_id
where story.id = story_tag.story_id
  and cluster_tag.tag_id = story_tag.tag_id
  and story_tag.confidence is null;

create index if not exists story_tags_story_confidence_idx
  on public.story_tags (story_id, confidence desc nulls last);

create trigger taxonomy_settings_set_updated_at
before update on public.taxonomy_settings
for each row execute function public.set_updated_at();

alter table public.taxonomy_settings enable row level security;

create policy admins_manage_taxonomy_settings on public.taxonomy_settings
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.taxonomy_settings to authenticated;
grant all on public.taxonomy_settings to service_role;
