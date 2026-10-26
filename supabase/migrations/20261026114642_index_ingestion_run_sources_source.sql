-- Support source deletion and source-centred task analysis without scanning the
-- complete per-source ingestion task table.
create index ingestion_run_sources_source_idx
  on public.ingestion_run_sources (source_id);
