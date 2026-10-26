import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { compareRankedCandidates, rankCandidate, type CandidateRankingSettings, type RankableCandidate } from '../lib/candidate-ranking.ts';

const settings: CandidateRankingSettings = { freshnessDays: 7, freshnessDecayPerDay: 2, wildlifeBonus: 3 };
const now = Date.parse('2026-10-26T12:00:00Z');

function candidate(overrides: Partial<RankableCandidate> = {}): RankableCandidate {
  return { overall_score: 60, relevance_score: 70, assessment: { primary_topic: 'Climate' }, created_at: '2026-10-26T09:00:00Z', last_source_at: '2026-10-26T09:00:00Z', ...overrides };
}

void test('decays priority by complete days and preserves the assessment score', () => {
  const input = candidate({ last_source_at: '2026-10-23T11:59:59Z' });
  const ranking = rankCandidate(input, settings, now);
  assert.equal(ranking.completeAgeDays, 3);
  assert.equal(ranking.freshnessPenalty, 6);
  assert.equal(ranking.effectiveScore, 54);
  assert.equal(input.overall_score, 60);
});

void test('applies only the configured wildlife bonus', () => {
  const wildlife = rankCandidate(candidate({ assessment: { primary_topic: 'Wildlife' } }), settings, now);
  const forest = rankCandidate(candidate({ assessment: { primary_topic: 'Forests' } }), settings, now);
  assert.equal(wildlife.wildlifeBonusApplied, 3);
  assert.equal(wildlife.effectiveScore, 63);
  assert.equal(forest.wildlifeBonusApplied, 0);
  assert.equal(forest.effectiveScore, 60);
});

void test('excludes candidates only after the freshness boundary', () => {
  const boundary = rankCandidate(candidate({ last_source_at: '2026-10-19T12:00:00Z' }), settings, now);
  const stale = rankCandidate(candidate({ last_source_at: '2026-10-19T11:59:59Z' }), settings, now);
  assert.equal(boundary.isFresh, true);
  assert.equal(stale.isFresh, false);
});

void test('ranks current priority ahead of raw assessment score', () => {
  const older = candidate({ overall_score: 66, last_source_at: '2026-10-19T12:00:00Z' });
  const recent = candidate({ overall_score: 61, last_source_at: '2026-10-26T09:00:00Z' });
  const ranked = [older, recent].map((item) => ({ ...item, ranking: rankCandidate(item, settings, now) })).sort(compareRankedCandidates);
  assert.equal(ranked[0].overall_score, 61);
  assert.deepEqual(ranked.map((item) => item.ranking.effectiveScore), [61, 52]);
});
