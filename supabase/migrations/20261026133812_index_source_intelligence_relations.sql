-- Cover source-intelligence relationship lookups and the reverse topic join
-- used when assessing recent coverage gaps.

create index source_network_recommendations_source_idx
  on public.source_network_recommendations (source_id)
  where source_id is not null;

create index source_network_recommendations_topic_idx
  on public.source_network_recommendations (topic_id)
  where topic_id is not null;

create index source_network_recommendations_reviewer_idx
  on public.source_network_recommendations (reviewed_by)
  where reviewed_by is not null;

create index story_topics_topic_idx
  on public.story_topics (topic_id);
