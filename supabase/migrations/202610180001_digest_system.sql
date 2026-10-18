-- Daily and weekly editorial digests, including independent distribution state.
-- External distribution is disabled by default while the feature is tested.

alter table public.stories
  add column content_type text not null default 'news'
    check (content_type in ('news', 'daily_digest', 'weekly_digest')),
  add column digest_period_start timestamptz,
  add column digest_period_end timestamptz;

alter table public.stories
  add constraint stories_digest_period_check check (
    (content_type = 'news' and digest_period_start is null and digest_period_end is null)
    or
    (content_type in ('daily_digest', 'weekly_digest') and digest_period_start is not null and digest_period_end is not null and digest_period_end > digest_period_start)
  );

create unique index stories_digest_period_unique_idx
  on public.stories (content_type, digest_period_end)
  where content_type in ('daily_digest', 'weekly_digest');

create table public.digest_settings (
  id boolean primary key default true check (id = true),
  automation_enabled boolean not null default false,
  run_time time not null default '14:00',
  automation_timezone text not null default 'Europe/London' check (automation_timezone = 'Europe/London'),
  weekly_day integer not null default 5 check (weekly_day between 1 and 7),
  daily_min_stories integer not null default 3 check (daily_min_stories between 1 and 25),
  daily_max_stories integer not null default 10 check (daily_max_stories between 1 and 50),
  weekly_min_stories integer not null default 5 check (weekly_min_stories between 1 and 50),
  weekly_max_stories integer not null default 25 check (weekly_max_stories between 1 and 100),
  max_estimated_cost_usd numeric(12, 4) not null default 0.50 check (max_estimated_cost_usd between 0.05 and 100),
  publish_immediately boolean not null default false,
  social_distribution_enabled boolean not null default false,
  email_distribution_enabled boolean not null default false,
  last_automation_tick_at timestamptz,
  last_automation_error text,
  consecutive_automation_failures integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (daily_max_stories >= daily_min_stories),
  check (weekly_max_stories >= weekly_min_stories)
);

insert into public.digest_settings (id) values (true);

create table public.digest_runs (
  id uuid primary key default gen_random_uuid(),
  digest_type text not null check (digest_type in ('daily', 'weekly')),
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'scheduled', 'retry')),
  status text not null default 'queued' check (status in ('queued', 'generating', 'generated', 'publishing', 'published', 'distributing', 'completed', 'partial', 'failed', 'skipped')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  story_id uuid references public.stories(id) on delete set null,
  source_story_count integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  social_status text not null default 'disabled' check (social_status in ('disabled', 'pending', 'ready', 'published', 'failed')),
  email_status text not null default 'disabled' check (email_status in ('disabled', 'pending', 'ready', 'sent', 'failed')),
  social_copy jsonb not null default '{}'::jsonb,
  email_content jsonb not null default '{}'::jsonb,
  error_summary text,
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start),
  unique (digest_type, period_end)
);

create index digest_runs_created_idx on public.digest_runs (created_at desc);
create index digest_runs_status_idx on public.digest_runs (status, created_at);

create table public.digest_run_stories (
  run_id uuid not null references public.digest_runs(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  display_order integer not null,
  selection_role text not null default 'supporting' check (selection_role in ('lead', 'supporting')),
  primary key (run_id, story_id),
  unique (run_id, display_order)
);

create index digest_run_stories_story_idx on public.digest_run_stories (story_id);

create table public.digest_run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.digest_runs(id) on delete cascade,
  stage text not null,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index digest_run_events_run_created_idx on public.digest_run_events (run_id, created_at desc);

create trigger digest_settings_set_updated_at before update on public.digest_settings for each row execute function public.set_updated_at();
create trigger digest_runs_set_updated_at before update on public.digest_runs for each row execute function public.set_updated_at();

alter table public.digest_settings enable row level security;
alter table public.digest_runs enable row level security;
alter table public.digest_run_stories enable row level security;
alter table public.digest_run_events enable row level security;

create policy admins_manage_digest_settings on public.digest_settings for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_digest_runs on public.digest_runs for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_digest_run_stories on public.digest_run_stories for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_digest_run_events on public.digest_run_events for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.digest_settings, public.digest_runs, public.digest_run_stories, public.digest_run_events to authenticated;
grant all on public.digest_settings, public.digest_runs, public.digest_run_stories, public.digest_run_events to service_role;
grant usage, select on sequence public.digest_run_events_id_seq to authenticated, service_role;
