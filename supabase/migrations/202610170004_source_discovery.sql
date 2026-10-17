-- Turn useful domains found during article research into an editorial source
-- recommendation queue. Suggestions remain private until an editor adds them.

create table public.source_suggestions (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  name text not null,
  homepage_url text not null,
  feed_url text,
  status text not null default 'suggested' check (status in ('suggested', 'dismissed', 'added')),
  feed_status text not null default 'unchecked' check (feed_status in ('unchecked', 'checking', 'found', 'not_found', 'failed')),
  source_type text not null default 'other' check (source_type in ('primary', 'academic', 'government', 'organisation', 'news', 'other')),
  quality_score integer not null default 50 check (quality_score between 0 and 100),
  originality_score integer not null default 50 check (originality_score between 0 and 100),
  recommendation_score integer not null default 50 check (recommendation_score between 0 and 100),
  last_reason text,
  last_article_url text,
  last_feed_check_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_suggestion_mentions (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.source_suggestions(id) on delete cascade,
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  source_url text not null,
  source_title text,
  reason text,
  source_type text not null default 'other' check (source_type in ('primary', 'academic', 'government', 'organisation', 'news', 'other')),
  observed_at timestamptz not null default now(),
  unique (suggestion_id, cluster_id)
);

create index source_suggestions_review_idx
  on public.source_suggestions (status, recommendation_score desc, last_seen_at desc);

create index source_suggestion_mentions_suggestion_idx
  on public.source_suggestion_mentions (suggestion_id, observed_at desc);

create trigger source_suggestions_set_updated_at
before update on public.source_suggestions
for each row execute function public.set_updated_at();

alter table public.source_suggestions enable row level security;
alter table public.source_suggestion_mentions enable row level security;

create policy admins_manage_source_suggestions on public.source_suggestions for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy admins_manage_source_suggestion_mentions on public.source_suggestion_mentions for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.source_suggestions to authenticated;
grant select, insert, update, delete on public.source_suggestion_mentions to authenticated;
grant all on public.source_suggestions to service_role;
grant all on public.source_suggestion_mentions to service_role;
