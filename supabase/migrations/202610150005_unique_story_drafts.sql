-- A candidate can have only one article draft.

create unique index if not exists stories_cluster_unique_idx
  on public.stories (cluster_id)
  where cluster_id is not null;
