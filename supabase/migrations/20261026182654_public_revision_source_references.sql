-- Expose only the numbered public sources associated with each applied revision.

alter table public.story_editorial_revisions
  add column public_source_ids text[] not null default '{}'::text[];

update public.story_editorial_revisions revision
set public_source_ids = coalesce((
  select array_agg(reference.source_id order by reference.source_number)
  from (
    select distinct
      source_record ->> 'id' as source_id,
      substring(source_record ->> 'id' from '[0-9]+$')::integer as source_number
    from jsonb_array_elements(revision.source_list) source_record
    join public.story_editorial_revision_updates revision_update
      on revision_update.revision_id = revision.id
    join public.story_cluster_updates coverage_update
      on coverage_update.id = revision_update.update_id
     and source_record ->> 'source_item_id' = coverage_update.source_item_id::text
    where source_record ->> 'id' ~ '^source-[1-9][0-9]*$'
  ) reference
), '{}'::text[]);

grant select (public_source_ids)
on public.story_editorial_revisions to anon;
