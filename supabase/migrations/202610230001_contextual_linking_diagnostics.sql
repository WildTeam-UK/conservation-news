-- Record dedicated contextual-link assessments for articles and digests.
-- Existing accepted links are treated as previously proposed links so historical
-- rows remain internally consistent until they are reassessed with the new prompt.

alter table public.story_linking_assessments
  add column if not exists status text not null default 'completed'
    check (status in ('completed', 'failed')),
  add column if not exists proposed_count integer not null default 0
    check (proposed_count between 0 and 20),
  add column if not exists rejected_count integer not null default 0
    check (rejected_count between 0 and 20),
  add column if not exists rejection_reasons jsonb not null default '{}'::jsonb,
  add column if not exists accepted_types jsonb not null default '{}'::jsonb,
  add column if not exists input_tokens integer not null default 0
    check (input_tokens >= 0),
  add column if not exists output_tokens integer not null default 0
    check (output_tokens >= 0),
  add column if not exists error_summary text;

update public.story_linking_assessments
set proposed_count = link_count
where proposed_count = 0 and link_count > 0;

create index if not exists story_linking_assessments_status_idx
  on public.story_linking_assessments (prompt_version, status, assessed_at desc);
