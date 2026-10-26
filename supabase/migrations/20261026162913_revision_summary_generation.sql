alter table public.ai_generations drop constraint if exists ai_generations_purpose_check;

alter table public.ai_generations add constraint ai_generations_purpose_check
  check (purpose in ('assessment', 'research', 'draft', 'regeneration', 'revision_summary'));
