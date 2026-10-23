-- Record an editor's explicit decision to release a held draft into the
-- publishing schedule. Automatic publication still reruns the content
-- checklist, while the automated score and source thresholds are treated as
-- reviewed editorial judgements for this queue entry.

alter table public.publication_queue
  add column editor_approved_at timestamptz,
  add column editor_approved_by uuid references auth.users(id) on delete set null;

comment on column public.publication_queue.editor_approved_at is
  'When set, an editor has approved a previously held draft for scheduled publication.';

comment on column public.publication_queue.editor_approved_by is
  'The authenticated editor who approved a previously held draft for the publishing queue.';
