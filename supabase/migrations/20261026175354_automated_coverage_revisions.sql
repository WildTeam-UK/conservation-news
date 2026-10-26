alter table public.story_editorial_revisions
  add column public_content_changed boolean not null default true;

alter table public.ai_generations drop constraint if exists ai_generations_purpose_check;

alter table public.ai_generations add constraint ai_generations_purpose_check
  check (purpose in ('assessment', 'research', 'draft', 'regeneration', 'revision_draft', 'revision_summary'));

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
  if not public.is_content_admin() then
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
      changes = changes || jsonb_build_object('public_content_changed', has_public_content_changes)
  where story_id = applied_story_id
    and action = 'edited'
    and changes ->> 'revision_id' = target_revision_id::text;

  return applied_story_id;
end;
$$;

revoke all on function public.apply_story_editorial_revision_v2(uuid, boolean) from public, anon;
grant execute on function public.apply_story_editorial_revision_v2(uuid, boolean) to authenticated, service_role;

-- Correct the first source-only production revision. Keep its source and audit history,
-- but remove the public implication that the article copy changed.
update public.stories
set editorial_updated_at = null,
    editorial_change_summary = null
where id = '7b70e86c-b583-4ab3-a3c1-02cddcd5e59b'
  and editorial_change_summary = 'Additional Mongabay reporting on public and political attention and renewed calls to address human-elephant conflict has been added; the article’s wording and conclusions remain unchanged.';

update public.story_editorial_revisions
set public_content_changed = false,
    change_summary = 'Mongabay was added to the source list; the published article copy was unchanged.'
where id = 'ee031669-a4d5-4cb0-8a78-1651ffb88538'
  and base_content = proposed_content;

update public.editorial_actions
set notes = 'Additional source coverage applied without changing the public article copy or editorial update date.',
    changes = changes || jsonb_build_object('public_content_changed', false)
where story_id = '7b70e86c-b583-4ab3-a3c1-02cddcd5e59b'
  and action = 'edited'
  and changes ->> 'revision_id' = 'ee031669-a4d5-4cb0-8a78-1651ffb88538';
