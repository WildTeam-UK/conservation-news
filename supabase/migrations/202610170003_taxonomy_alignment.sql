-- Replace the mixed topic list with nine stable editorial sections and align
-- tag archive visibility with the configured published-story threshold.

alter table public.stories
  add column if not exists taxonomy_review_required boolean not null default false,
  add column if not exists taxonomy_review_reason text,
  add column if not exists taxonomy_confidence integer check (taxonomy_confidence between 0 and 100),
  add column if not exists taxonomy_version text;

insert into public.topics (name, slug) values
  ('Wildlife', 'wildlife'),
  ('Oceans & Coasts', 'oceans-and-coasts'),
  ('Forests', 'forests'),
  ('Freshwater', 'freshwater'),
  ('Climate', 'climate'),
  ('Land & Food', 'land-and-food'),
  ('People & Communities', 'people-and-communities'),
  ('Policy & Governance', 'policy-and-governance'),
  ('Conservation Practice', 'conservation-practice')
on conflict (slug) do update set
  name = excluded.name,
  active = true;

-- Move existing article relationships to their nearest broad replacement.
-- The AI reconciliation that follows deployment will then classify each
-- article individually rather than relying on these provisional mappings.
with replacements(old_slug, new_slug) as (values
  ('oceans', 'oceans-and-coasts'),
  ('land-and-climate', 'climate'),
  ('solutions', 'conservation-practice')
)
insert into public.story_topics (story_id, topic_id)
select story_topic.story_id, replacement_topic.id
from public.story_topics as story_topic
join public.topics as old_topic on old_topic.id = story_topic.topic_id
join replacements on replacements.old_slug = old_topic.slug
join public.topics as replacement_topic on replacement_topic.slug = replacements.new_slug
on conflict (story_id, topic_id) do nothing;

with replacements(old_slug, new_slug) as (values
  ('oceans', 'oceans-and-coasts'),
  ('land-and-climate', 'climate'),
  ('solutions', 'conservation-practice')
)
update public.stories as story
set primary_topic_id = replacement_topic.id
from public.topics as old_topic
join replacements on replacements.old_slug = old_topic.slug
join public.topics as replacement_topic on replacement_topic.slug = replacements.new_slug
where story.primary_topic_id = old_topic.id;

update public.topics
set description = null,
    seo_title = null,
    meta_description = null,
    seo_generated_at = null
where slug in (
  'wildlife',
  'oceans-and-coasts',
  'forests',
  'freshwater',
  'climate',
  'land-and-food',
  'people-and-communities',
  'policy-and-governance',
  'conservation-practice'
);

update public.topics
set active = false
where slug not in (
  'wildlife',
  'oceans-and-coasts',
  'forests',
  'freshwater',
  'climate',
  'land-and-food',
  'people-and-communities',
  'policy-and-governance',
  'conservation-practice'
);

insert into public.story_tags (story_id, tag_id, confidence, rationale)
select story.id, cluster_tag.tag_id, cluster_tag.confidence, cluster_tag.rationale
from public.stories as story
join public.story_cluster_tags as cluster_tag on cluster_tag.cluster_id = story.cluster_id
on conflict (story_id, tag_id) do update set
  confidence = excluded.confidence,
  rationale = excluded.rationale;

with published_counts as (
  select story_tag.tag_id, count(distinct story_tag.story_id)::integer as article_count
  from public.story_tags as story_tag
  join public.stories as story on story.id = story_tag.story_id
  where story.status = 'published' and story.published_at is not null
  group by story_tag.tag_id
), settings as (
  select min_published_stories from public.taxonomy_settings where id = true
)
update public.content_tags as tag
set status = 'proposed'
from settings
where tag.status = 'approved'
  and coalesce((select article_count from published_counts where tag_id = tag.id), 0) < settings.min_published_stories;
