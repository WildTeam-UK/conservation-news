-- Resumable daily editorial runs, their per-story progress, and an audit trail.

create table public.editorial_run_settings (
  id boolean primary key default true check (id = true),
  max_new_drafts integer not null default 10 check (max_new_drafts between 1 and 25),
  max_estimated_cost_usd numeric(12, 4) not null default 1.00 check (max_estimated_cost_usd between 0.05 and 100),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.editorial_run_settings (id) values (true);

create table public.editorial_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'scheduled', 'retry')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed', 'budget_stopped')),
  current_stage text not null default 'collecting' check (current_stage in ('collecting', 'assessing', 'researching', 'drafting', 'finished')),
  max_new_drafts integer not null check (max_new_drafts between 1 and 25),
  max_estimated_cost_usd numeric(12, 4) not null check (max_estimated_cost_usd between 0.05 and 100),
  estimated_cost_usd numeric(12, 6) not null default 0,
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  candidates_selected integer not null default 0,
  candidates_processed integer not null default 0,
  drafts_created integer not null default 0,
  failures integer not null default 0,
  triggered_by uuid references auth.users(id) on delete set null,
  error_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index editorial_runs_one_active_idx on public.editorial_runs ((true)) where status = 'running';
create index editorial_runs_created_idx on public.editorial_runs (created_at desc);

create table public.editorial_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.editorial_runs(id) on delete cascade,
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  rank integer not null,
  status text not null default 'pending' check (status in ('pending', 'researching', 'researched', 'drafting', 'drafted', 'failed')),
  research_cost_usd numeric(12, 6) not null default 0,
  draft_cost_usd numeric(12, 6) not null default 0,
  web_search_actions integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, cluster_id)
);

create index editorial_run_items_run_rank_idx on public.editorial_run_items (run_id, rank);

create table public.editorial_run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.editorial_runs(id) on delete cascade,
  stage text not null,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index editorial_run_events_run_created_idx on public.editorial_run_events (run_id, created_at);

create trigger editorial_run_settings_set_updated_at before update on public.editorial_run_settings for each row execute function public.set_updated_at();
create trigger editorial_runs_set_updated_at before update on public.editorial_runs for each row execute function public.set_updated_at();
create trigger editorial_run_items_set_updated_at before update on public.editorial_run_items for each row execute function public.set_updated_at();

alter table public.editorial_run_settings enable row level security;
alter table public.editorial_runs enable row level security;
alter table public.editorial_run_items enable row level security;
alter table public.editorial_run_events enable row level security;

create policy admins_manage_editorial_run_settings on public.editorial_run_settings for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_editorial_runs on public.editorial_runs for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_editorial_run_items on public.editorial_run_items for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy admins_manage_editorial_run_events on public.editorial_run_events for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.editorial_run_settings, public.editorial_runs, public.editorial_run_items, public.editorial_run_events to authenticated;
grant all on public.editorial_run_settings, public.editorial_runs, public.editorial_run_items, public.editorial_run_events to service_role;
grant usage, select on sequence public.editorial_run_events_id_seq to authenticated, service_role;
