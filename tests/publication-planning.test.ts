import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { planSameDayPublicationTimes, remainingDailyArticleCapacity } from '../lib/publication-planning.ts';

void test('remaining capacity uses one daily target', () => {
  assert.equal(remainingDailyArticleCapacity(10, 3), 7);
  assert.equal(remainingDailyArticleCapacity(10, 10), 0);
  assert.equal(remainingDailyArticleCapacity(10, 12), 0);
});

void test('same-day planning never creates overflow for a future day', () => {
  const times = planSameDayPublicationTimes({
    storyIds: Array.from({ length: 12 }, (_, index) => `story-${index}`),
    dateKey: '2026-10-26',
    now: Date.parse('2026-10-26T07:00:00Z'),
    windowStart: Date.parse('2026-10-26T08:00:00Z'),
    windowEnd: Date.parse('2026-10-26T20:00:00Z'),
    target: 10,
    occupied: 2,
  });

  assert.equal(times.length, 8);
  assert.ok(times.every((time) => Date.parse(time) >= Date.parse('2026-10-26T08:00:00Z')));
  assert.ok(times.every((time) => Date.parse(time) < Date.parse('2026-10-26T20:00:00Z')));
});

void test('planning returns no times after the daily window closes', () => {
  assert.deepEqual(planSameDayPublicationTimes({
    storyIds: ['story-1'],
    dateKey: '2026-10-26',
    now: Date.parse('2026-10-26T20:01:00Z'),
    windowStart: Date.parse('2026-10-26T08:00:00Z'),
    windowEnd: Date.parse('2026-10-26T20:00:00Z'),
    target: 10,
    occupied: 0,
  }), []);
});
