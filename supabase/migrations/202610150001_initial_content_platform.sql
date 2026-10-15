-- WildTeam Content Platform: initial news ingestion and publishing schema.
-- New tables are private by default. Public access is limited to published content.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'editor' check (role in ('editor', 'publisher', 'owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage_url text,
  feed_url text not null unique,
  source_kind text not null default 'rss' check (source_kind in ('rss', 'api', 'website')),
  trust_status text not null default 'provisional' check (trust_status in ('trusted', 'provisional', 'blocked')),
  enabled boolean not null default true,
  auto_draft_allowed boolean not null default false,
  country_code text,
  notes text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_topics (
  source_id uuid not null references public.sources(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (source_id, topic_id)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'scheduled' check (run_type in ('scheduled', 'manual', 'retry')),
  status text not null default 'queued' check (status in ('queued', 'collecting', 'assessing', 'drafting', 'completed', 'failed', 'partial')),
  started_at timestamptz,
  completed_at timestamptz,
  sources_checked integer not null default 0,
  items_found integer not null default 0,
  items_new integer not null default 0,
  candidates_rejected integer not null default 0,
  drafts_created integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  external_id text,
  url text not null unique,
  canonical_url text,
  title text not null,
  summary text,
  author text,
  published_at timestamptz,
  raw_content text,
  content_hash text,
  language_code text,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create table public.story_clusters (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  working_title text not null,
  status text not null default 'candidate' check (status in ('candidate', 'selected', 'rejected', 'drafted')),
  relevance_score integer check (relevance_score between 0 and 100),
  evidence_score integer check (evidence_score between 0 and 100),
  practitioner_value_score integer check (practitioner_value_score between 0 and 100),
  novelty_score integer check (novelty_score between 0 and 100),
  overall_score integer check (overall_score between 0 and 100),
  selection_rank integer,
  assessment jsonb not null default '{}'::jsonb,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_cluster_items (
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  primary key (cluster_id, source_item_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.story_clusters(id) on delete set null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected', 'archived')),
  headline text not null,
  standfirst text not null,
  overview text,
  body text,
  key_takeaways jsonb not null default '[]'::jsonb,
  why_it_matters text,
  agreed_points jsonb not null default '[]'::jsonb,
  disputed_points jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  conservation_significance integer check (conservation_significance between 0 and 100),
  evidence_confidence integer check (evidence_confidence between 0 and 100),
  practitioner_relevance integer check (practitioner_relevance between 0 and 100),
  primary_topic_id uuid references public.topics(id) on delete set null,
  image_url text,
  image_alt text,
  byline text not null default 'WildNews editorial team',
  reviewer_id uuid references auth.users(id) on delete set null,
  generation_metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_topics (
  story_id uuid not null references public.stories(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (story_id, topic_id)
);

create table public.story_organisations (
  story_id uuid not null references public.stories(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  primary key (story_id, organisation_id)
);

create table public.story_sources (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  source_item_id uuid references public.source_items(id) on delete set null,
  source_name text not null,
  source_title text not null,
  source_url text not null,
  source_published_at timestamptz,
  source_role text not null default 'supporting' check (source_role in ('primary', 'supporting', 'context')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (story_id, source_url)
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  cluster_id uuid references public.story_clusters(id) on delete cascade,
  purpose text not null check (purpose in ('assessment', 'draft', 'regeneration')),
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.editorial_actions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'edited', 'regenerated', 'published', 'rejected', 'archived')),
  notes text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index source_items_published_at_idx on public.source_items (published_at desc);
create index story_clusters_run_status_idx on public.story_clusters (ingestion_run_id, status);
create index stories_status_published_at_idx on public.stories (status, published_at desc);
create index stories_primary_topic_idx on public.stories (primary_topic_id);
create index story_sources_story_order_idx on public.story_sources (story_id, display_order);
create index editorial_actions_story_created_idx on public.editorial_actions (story_id, created_at desc);

create trigger admin_users_set_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger organisations_set_updated_at before update on public.organisations for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger ingestion_runs_set_updated_at before update on public.ingestion_runs for each row execute function public.set_updated_at();
create trigger source_items_set_updated_at before update on public.source_items for each row execute function public.set_updated_at();
create trigger story_clusters_set_updated_at before update on public.story_clusters for each row execute function public.set_updated_at();
create trigger stories_set_updated_at before update on public.stories for each row execute function public.set_updated_at();

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_content_admin() from public;
grant execute on function public.is_content_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.topics enable row level security;
alter table public.organisations enable row level security;
alter table public.sources enable row level security;
alter table public.source_topics enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.source_items enable row level security;
alter table public.story_clusters enable row level security;
alter table public.story_cluster_items enable row level security;
alter table public.stories enable row level security;
alter table public.story_topics enable row level security;
alter table public.story_organisations enable row level security;
alter table public.story_sources enable row level security;
alter table public.ai_generations enable row level security;
alter table public.editorial_actions enable row level security;

create policy admin_users_read_self on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

create policy topics_public_read on public.topics
  for select to anon, authenticated
  using (active = true);

create policy organisations_public_read on public.organisations
  for select to anon, authenticated
  using (active = true);

create policy stories_public_read on public.stories
  for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

create policy story_topics_public_read on public.story_topics
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_topics.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  ));

create policy story_organisations_public_read on public.story_organisations
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_organisations.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  ));

create policy story_sources_public_read on public.story_sources
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_sources.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  ));

create policy admins_manage_topics on public.topics for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_organisations on public.organisations for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_sources on public.sources for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_source_topics on public.source_topics for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_ingestion_runs on public.ingestion_runs for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_source_items on public.source_items for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_clusters on public.story_clusters for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_cluster_items on public.story_cluster_items for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_stories on public.stories for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_topics on public.story_topics for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_organisations on public.story_organisations for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_sources on public.story_sources for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_ai_generations on public.ai_generations for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_editorial_actions on public.editorial_actions for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.topics, public.organisations, public.stories, public.story_topics,
  public.story_organisations, public.story_sources to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

insert into public.topics (name, slug) values
  ('Wildlife', 'wildlife'),
  ('Oceans', 'oceans'),
  ('Forests', 'forests'),
  ('Freshwater', 'freshwater'),
  ('Land & climate', 'land-and-climate'),
  ('Solutions', 'solutions')
on conflict (slug) do nothing;

