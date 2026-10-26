const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_CANDIDATE_FRESHNESS_DAYS = 7;
export const DEFAULT_CANDIDATE_FRESHNESS_DECAY_PER_DAY = 2;
export const DEFAULT_CANDIDATE_WILDLIFE_BONUS = 3;

export type CandidateRankingSettings = {
  freshnessDays: number;
  freshnessDecayPerDay: number;
  wildlifeBonus: number;
};

export type RankableCandidate = {
  overall_score: number | null;
  relevance_score: number | null;
  assessment: { primary_topic?: string } | null;
  created_at: string;
  last_source_at: string | null;
};

export type CandidateRanking = {
  effectiveScore: number;
  completeAgeDays: number;
  freshnessPenalty: number;
  wildlifeBonusApplied: number;
  latestSourceAt: number;
  isFresh: boolean;
};

export function candidateRankingSettings(
  row?: {
    candidate_freshness_days?: number | string | null;
    candidate_freshness_decay_per_day?: number | string | null;
    candidate_wildlife_bonus?: number | string | null;
  } | null,
): CandidateRankingSettings {
  return {
    freshnessDays: Number(
      row?.candidate_freshness_days ?? DEFAULT_CANDIDATE_FRESHNESS_DAYS,
    ),
    freshnessDecayPerDay: Number(
      row?.candidate_freshness_decay_per_day ??
        DEFAULT_CANDIDATE_FRESHNESS_DECAY_PER_DAY,
    ),
    wildlifeBonus: Number(
      row?.candidate_wildlife_bonus ?? DEFAULT_CANDIDATE_WILDLIFE_BONUS,
    ),
  };
}

export function rankCandidate(
  candidate: RankableCandidate,
  settings: CandidateRankingSettings,
  now = Date.now(),
): CandidateRanking {
  const parsedLatestSourceAt = Date.parse(
    candidate.last_source_at ?? candidate.created_at,
  );
  const latestSourceAt = Number.isFinite(parsedLatestSourceAt)
    ? parsedLatestSourceAt
    : now;
  const ageMs = Math.max(0, now - latestSourceAt);
  const completeAgeDays = Math.floor(ageMs / DAY_MS);
  const freshnessPenalty = completeAgeDays * settings.freshnessDecayPerDay;
  const wildlifeBonusApplied =
    candidate.assessment?.primary_topic === 'Wildlife'
      ? settings.wildlifeBonus
      : 0;
  const effectiveScore =
    Math.round(
      (Number(candidate.overall_score ?? 0) -
        freshnessPenalty +
        wildlifeBonusApplied) *
        10,
    ) / 10;

  return {
    effectiveScore,
    completeAgeDays,
    freshnessPenalty,
    wildlifeBonusApplied,
    latestSourceAt,
    isFresh: ageMs <= settings.freshnessDays * DAY_MS,
  };
}

export function compareRankedCandidates<
  T extends RankableCandidate & { ranking: CandidateRanking },
>(a: T, b: T) {
  return (
    b.ranking.effectiveScore - a.ranking.effectiveScore ||
    Number(b.overall_score ?? 0) - Number(a.overall_score ?? 0) ||
    Number(b.relevance_score ?? 0) - Number(a.relevance_score ?? 0) ||
    b.ranking.latestSourceAt - a.ranking.latestSourceAt
  );
}
