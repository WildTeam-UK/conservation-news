-- Evidence-led conservation outlook classification and configurable Good News archive.

create table if not exists public.good_news_settings (
  id boolean primary key default true check (id),
  minimum_score integer not null default 75 check (minimum_score between 0 and 100),
  minimum_confidence integer not null default 75 check (minimum_confidence between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.good_news_settings (id) values (true)
on conflict (id) do nothing;

create table if not exists public.story_conservation_outlooks (
  story_id uuid primary key references public.stories(id) on delete cascade,
  classification text not null check (classification in ('positive', 'mixed', 'neutral', 'negative')),
  score integer not null check (score between 0 and 100),
  confidence integer not null check (confidence between 0 and 100),
  rationale text not null,
  prompt_version text not null,
  assessed_at timestamptz not null default now()
);

create index if not exists story_conservation_outlooks_archive_idx
  on public.story_conservation_outlooks (classification, score desc, confidence desc);

create trigger good_news_settings_set_updated_at
before update on public.good_news_settings
for each row execute function public.set_updated_at();

alter table public.good_news_settings enable row level security;
alter table public.story_conservation_outlooks enable row level security;

create policy public_reads_good_news_settings on public.good_news_settings
  for select to anon, authenticated using (true);

create policy admins_manage_good_news_settings on public.good_news_settings
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy public_reads_published_story_outlooks on public.story_conservation_outlooks
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_conservation_outlooks.story_id
      and stories.status = 'published'
      and stories.published_at <= now()
  ));

create policy admins_manage_story_outlooks on public.story_conservation_outlooks
  for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select on public.good_news_settings, public.story_conservation_outlooks to anon;
grant select, insert, update, delete on public.good_news_settings, public.story_conservation_outlooks to authenticated;
grant all on public.good_news_settings, public.story_conservation_outlooks to service_role;
