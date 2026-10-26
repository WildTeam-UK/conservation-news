-- Expose only the safe, applied revision timeline for published stories.

create policy story_editorial_revisions_public_read
on public.story_editorial_revisions for select to anon
using (
  status = 'applied'
  and applied_at is not null
  and exists (
    select 1
    from public.stories
    where stories.id = story_editorial_revisions.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  )
);

grant select (id, story_id, change_summary, applied_at, public_content_changed)
on public.story_editorial_revisions to anon;
