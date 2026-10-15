-- Store source-backed research before a candidate becomes an article draft.

create table public.research_packs (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null unique references public.story_clusters(id) on delete cascade,
  status text not null default 'researching' check (status in ('researching', 'completed', 'failed')),
  content jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  web_search_actions integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index research_packs_status_updated_idx on public.research_packs (status, updated_at desc);

create trigger research_packs_set_updated_at
before update on public.research_packs
for each row execute function public.set_updated_at();

alter table public.research_packs enable row level security;

create policy admins_manage_research_packs on public.research_packs for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

grant select, insert, update, delete on public.research_packs to authenticated;
grant all on public.research_packs to service_role;

alter table public.ai_generations drop constraint if exists ai_generations_purpose_check;
alter table public.ai_generations add constraint ai_generations_purpose_check
  check (purpose in ('assessment', 'research', 'draft', 'regeneration'));
