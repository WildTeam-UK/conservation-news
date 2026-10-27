const ACTIVE_PUBLICATION_STATUSES = new Set(['queued', 'scheduled', 'publishing']);

export function blocksArticleArchive(queueStatus?: string | null) {
  return Boolean(queueStatus && ACTIVE_PUBLICATION_STATUSES.has(queueStatus));
}

export function shouldCreateCoverageUpdate(storyStatus?: string | null) {
  return storyStatus !== 'archived';
}
