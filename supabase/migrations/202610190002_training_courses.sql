-- Controlled WildTeam course catalogue and article-to-course recommendations.

create table public.training_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_title text,
  slug text not null unique,
  description text not null,
  course_url text not null unique,
  primary_colour text not null default '#6e0f6c'
    check (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  ad_headline text not null,
  ad_description text not null,
  cta_label text not null default 'Explore the course',
  matching_guidance text not null,
  matching_terms text[] not null default '{}'::text[],
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_course_recommendations (
  story_id uuid not null references public.stories(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  placement text not null check (placement in ('featured', 'contextual')),
  confidence integer check (confidence between 0 and 100),
  rationale text,
  anchor_text text,
  target_section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id, placement)
);

create index training_courses_active_order_idx
  on public.training_courses (active, display_order, title);

create index story_course_recommendations_course_idx
  on public.story_course_recommendations (course_id, placement);

create trigger training_courses_set_updated_at
before update on public.training_courses
for each row execute function public.set_updated_at();

create trigger story_course_recommendations_set_updated_at
before update on public.story_course_recommendations
for each row execute function public.set_updated_at();

alter table public.training_courses enable row level security;
alter table public.story_course_recommendations enable row level security;

create policy training_courses_public_read on public.training_courses
  for select to anon, authenticated
  using (active = true);

create policy story_course_recommendations_public_read on public.story_course_recommendations
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.stories
      where stories.id = story_course_recommendations.story_id
        and stories.status = 'published'
        and stories.published_at is not null
        and stories.published_at <= now()
    )
    and exists (
      select 1
      from public.training_courses
      where training_courses.id = story_course_recommendations.course_id
        and training_courses.active = true
    )
  );

create policy admins_manage_training_courses on public.training_courses
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy admins_manage_story_course_recommendations on public.story_course_recommendations
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select on public.training_courses, public.story_course_recommendations to anon;
grant select, insert, update, delete on public.training_courses, public.story_course_recommendations to authenticated;
grant all on public.training_courses, public.story_course_recommendations to service_role;
