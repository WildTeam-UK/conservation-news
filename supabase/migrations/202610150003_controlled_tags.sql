-- Controlled subject tags for discovery, related content and future SEO hubs.

create table public.content_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tag_type text not null check (tag_type in ('species', 'place', 'habitat', 'theme')),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'retired')),
  description text,
  parent_id uuid references public.content_tags(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_tag_aliases (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.content_tags(id) on delete cascade,
  alias text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now(),
  unique (tag_id, alias)
);

create table public.story_cluster_tags (
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  tag_id uuid not null references public.content_tags(id) on delete cascade,
  confidence integer check (confidence between 0 and 100),
  rationale text,
  created_at timestamptz not null default now(),
  primary key (cluster_id, tag_id)
);

create table public.story_tags (
  story_id uuid not null references public.stories(id) on delete cascade,
  tag_id uuid not null references public.content_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, tag_id)
);

create index content_tags_type_status_idx on public.content_tags (tag_type, status, name);
create index story_cluster_tags_tag_idx on public.story_cluster_tags (tag_id, cluster_id);
create index story_tags_tag_idx on public.story_tags (tag_id, story_id);

create trigger content_tags_set_updated_at
before update on public.content_tags
for each row execute function public.set_updated_at();

alter table public.content_tags enable row level security;
alter table public.content_tag_aliases enable row level security;
alter table public.story_cluster_tags enable row level security;
alter table public.story_tags enable row level security;

create policy public_read_approved_content_tags on public.content_tags for select to anon, authenticated
  using (status = 'approved');

create policy public_read_published_story_tags on public.story_tags for select to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_tags.story_id
      and stories.status = 'published'
      and stories.published_at is not null
      and stories.published_at <= now()
  ));

create policy admins_manage_content_tags on public.content_tags for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_content_tag_aliases on public.content_tag_aliases for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_cluster_tags on public.story_cluster_tags for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_story_tags on public.story_tags for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select on public.content_tags, public.story_tags to anon;
grant select, insert, update, delete on public.content_tags, public.content_tag_aliases,
  public.story_cluster_tags, public.story_tags to authenticated;
grant all on public.content_tags, public.content_tag_aliases,
  public.story_cluster_tags, public.story_tags to service_role;
