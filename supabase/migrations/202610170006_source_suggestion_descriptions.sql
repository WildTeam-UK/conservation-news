-- Store a reusable, publisher-level explanation for source recommendations.
-- Descriptions are generated once from the research evidence and are not
-- regenerated when the admin page is viewed.

alter table public.source_suggestions
  add column if not exists description text;
