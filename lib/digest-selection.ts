export type DigestSelectionCandidate = {
  id: string;
  publishedAt: string;
  primaryTopic: string | null;
  topics: string[];
  places: string[];
  primarySource: string | null;
  clusterOverallScore: number | null;
  clusterRelevanceScore: number | null;
  clusterEvidenceScore: number | null;
  clusterPractitionerScore: number | null;
  clusterNoveltyScore: number | null;
  conservationSignificance: number | null;
  evidenceConfidence: number | null;
  practitionerRelevance: number | null;
};

export type DigestSelectionResult<T extends DigestSelectionCandidate> = {
  story: T;
  baseScore: number;
  selectionScore: number;
  diversityPenalty: number;
};

function mean(values: Array<number | null>) {
  const present = values.filter((value): value is number => Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) / present.length : null;
}

export function digestEditorialScore(candidate: DigestSelectionCandidate) {
  const clusterScore = mean([
    candidate.clusterOverallScore,
    candidate.clusterOverallScore,
    candidate.clusterRelevanceScore,
    candidate.clusterEvidenceScore,
    candidate.clusterPractitionerScore,
    candidate.clusterNoveltyScore,
  ]);
  const storyScore = mean([
    candidate.conservationSignificance,
    candidate.evidenceConfidence,
    candidate.practitionerRelevance,
  ]);
  if (clusterScore !== null && storyScore !== null) return clusterScore * 0.65 + storyScore * 0.35;
  return clusterScore ?? storyScore ?? 0;
}

function countMatches(values: string[], counts: Map<string, number>) {
  return [...new Set(values.map((value) => value.trim().toLocaleLowerCase('en-GB')).filter(Boolean))]
    .reduce((total, value) => total + (counts.get(value) ?? 0), 0);
}

function increment(values: string[], counts: Map<string, number>) {
  for (const value of new Set(values.map((item) => item.trim().toLocaleLowerCase('en-GB')).filter(Boolean))) counts.set(value, (counts.get(value) ?? 0) + 1);
}

function stableBaseOrder<T extends DigestSelectionCandidate>(candidates: T[]) {
  return [...candidates].sort((left, right) =>
    digestEditorialScore(right) - digestEditorialScore(left)
    || new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    || left.id.localeCompare(right.id));
}

export function selectDigestCandidates<T extends DigestSelectionCandidate>(candidates: T[], maximum: number, weekly: boolean): Array<DigestSelectionResult<T>> {
  const limit = Math.max(0, Math.min(maximum, candidates.length));
  if (!limit) return [];
  const remaining = stableBaseOrder(candidates);
  if (!weekly) return remaining.slice(0, limit).map((story) => ({ story, baseScore: digestEditorialScore(story), selectionScore: digestEditorialScore(story), diversityPenalty: 0 }));

  const selected: Array<DigestSelectionResult<T>> = [];
  const topicCounts = new Map<string, number>();
  const placeCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  while (selected.length < limit && remaining.length) {
    const scored = remaining.map((story) => {
      const topics = [...new Set([story.primaryTopic, ...story.topics].filter((value): value is string => Boolean(value)))];
      const sources = story.primarySource ? [story.primarySource] : [];
      const diversityPenalty = countMatches(topics, topicCounts) * 2.5
        + countMatches(story.places, placeCounts) * 1.25
        + countMatches(sources, sourceCounts) * 2;
      const baseScore = digestEditorialScore(story);
      return { story, baseScore, diversityPenalty, selectionScore: baseScore - diversityPenalty };
    }).sort((left, right) =>
      right.selectionScore - left.selectionScore
      || right.baseScore - left.baseScore
      || new Date(right.story.publishedAt).getTime() - new Date(left.story.publishedAt).getTime()
      || left.story.id.localeCompare(right.story.id));

    const winner = scored[0];
    selected.push(winner);
    remaining.splice(remaining.findIndex((story) => story.id === winner.story.id), 1);
    increment([winner.story.primaryTopic, ...winner.story.topics].filter((value): value is string => Boolean(value)), topicCounts);
    increment(winner.story.places, placeCounts);
    increment(winner.story.primarySource ? [winner.story.primarySource] : [], sourceCounts);
  }

  return selected;
}
