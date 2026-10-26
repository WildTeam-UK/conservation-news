export const PUBLICATION_LEAD_TIME_MS = 10 * 60_000;

function deterministicFraction(seed: string) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function remainingDailyArticleCapacity(target: number, occupied: number) {
  return Math.max(0, Math.min(25, Math.round(target)) - Math.max(0, occupied));
}

export function planSameDayPublicationTimes(options: {
  storyIds: string[];
  dateKey: string;
  now: number;
  windowStart: number;
  windowEnd: number;
  target: number;
  occupied: number;
}) {
  const start = Math.max(options.windowStart, options.now + PUBLICATION_LEAD_TIME_MS);
  const capacity = remainingDailyArticleCapacity(options.target, options.occupied);
  if (!capacity || options.windowEnd <= start) return [];

  const storyIds = options.storyIds.slice(0, capacity);
  const duration = options.windowEnd - start;
  return storyIds.map((storyId, index) => {
    const position = (index + 0.2 + deterministicFraction(`${storyId}:${options.dateKey}`) * 0.6) / storyIds.length;
    return new Date(start + duration * position).toISOString();
  });
}
