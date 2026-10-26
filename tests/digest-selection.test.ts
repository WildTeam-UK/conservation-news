import assert from 'node:assert/strict';
import test from 'node:test';
import { digestEditorialScore, selectDigestCandidates, type DigestSelectionCandidate } from '../lib/digest-selection';

function candidate(id: string, score: number, topic: string, source: string, place = ''): DigestSelectionCandidate {
  return {
    id,
    publishedAt: `2026-10-${String(20 + Number(id.replace(/\D/g, '') || 0)).padStart(2, '0')}T08:00:00.000Z`,
    primaryTopic: topic,
    topics: [topic],
    places: place ? [place] : [],
    primarySource: source,
    clusterOverallScore: score,
    clusterRelevanceScore: score,
    clusterEvidenceScore: score,
    clusterPractitionerScore: score,
    clusterNoveltyScore: score,
    conservationSignificance: score,
    evidenceConfidence: score,
    practitionerRelevance: score,
  };
}

void test('combines cluster and published-story editorial measures', () => {
  assert.equal(digestEditorialScore(candidate('1', 84, 'Wildlife', 'Source A')), 84);
});

void test('daily selection keeps the strongest stories without diversity penalties', () => {
  const selected = selectDigestCandidates([
    candidate('1', 70, 'Wildlife', 'Source A'),
    candidate('2', 90, 'Wildlife', 'Source A'),
    candidate('3', 80, 'Climate', 'Source B'),
  ], 2, false);
  assert.deepEqual(selected.map((result) => result.story.id), ['2', '3']);
  assert.ok(selected.every((result) => result.diversityPenalty === 0));
});

void test('weekly selection softly promotes topical, geographic and source variety', () => {
  const selected = selectDigestCandidates([
    candidate('1', 95, 'Wildlife', 'Source A', 'Kenya'),
    candidate('2', 94, 'Wildlife', 'Source A', 'Kenya'),
    candidate('3', 92, 'Climate', 'Source B', 'Brazil'),
    candidate('4', 60, 'Oceans', 'Source C', 'Australia'),
  ], 3, true);
  assert.deepEqual(selected.map((result) => result.story.id), ['1', '3', '2']);
  assert.ok(selected[2].diversityPenalty > 0);
});

void test('soft balancing never excludes a substantially stronger development', () => {
  const selected = selectDigestCandidates([
    candidate('1', 95, 'Wildlife', 'Source A', 'Kenya'),
    candidate('2', 93, 'Wildlife', 'Source A', 'Kenya'),
    candidate('3', 55, 'Oceans', 'Source B', 'Brazil'),
  ], 2, true);
  assert.deepEqual(selected.map((result) => result.story.id), ['1', '2']);
});
