-- Repair the first tag test, where confidence was returned on a 0-1 scale.

update public.story_cluster_tags
set confidence = 100
where confidence = 1;

update public.research_packs
set content = jsonb_set(
  content,
  '{tags}',
  coalesce((
    select jsonb_agg(
      case
        when jsonb_typeof(tag -> 'confidence') = 'number'
          and (tag ->> 'confidence')::numeric > 0
          and (tag ->> 'confidence')::numeric <= 1
        then jsonb_set(
          tag,
          '{confidence}',
          to_jsonb(round((tag ->> 'confidence')::numeric * 100)::integer)
        )
        else tag
      end
    )
    from jsonb_array_elements(content -> 'tags') as tag
  ), '[]'::jsonb)
)
where jsonb_typeof(content -> 'tags') = 'array';
