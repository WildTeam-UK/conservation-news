-- Controlled contextual links for new and existing WildNews articles.
-- Keeping links separate avoids changing a published story's editorial updated_at date.

create table public.story_contextual_links (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  link_type text not null check (link_type in ('article', 'topic', 'tag', 'course', 'source')),
  target_id text not null,
  href text not null,
  anchor_text text not null,
  section_key text not null check (section_key in ('key_takeaways', 'why_it_matters', 'what_happens_next', 'what_we_know', 'what_we_dont_know')),
  item_index integer not null default 0 check (item_index between 0 and 20),
  external boolean not null default false,
  confidence integer not null check (confidence between 0 and 100),
  rationale text,
  created_at timestamptz not null default now(),
  unique (story_id, section_key, item_index, anchor_text)
);

create table public.story_linking_assessments (
  story_id uuid primary key references public.stories(id) on delete cascade,
  prompt_version text not null,
  link_count integer not null default 0 check (link_count between 0 and 20),
  estimated_cost_usd numeric(12, 6) not null default 0,
  assessed_at timestamptz not null default now()
);

create index story_contextual_links_story_location_idx
  on public.story_contextual_links (story_id, section_key, item_index);

alter table public.story_contextual_links enable row level security;
alter table public.story_linking_assessments enable row level security;

create policy public_read_published_story_contextual_links on public.story_contextual_links
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_contextual_links.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  ));

create policy admins_manage_story_contextual_links on public.story_contextual_links
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy admins_manage_story_linking_assessments on public.story_linking_assessments
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select on public.story_contextual_links to anon;
grant select, insert, update, delete on public.story_contextual_links, public.story_linking_assessments to authenticated;
grant all on public.story_contextual_links, public.story_linking_assessments to service_role;

