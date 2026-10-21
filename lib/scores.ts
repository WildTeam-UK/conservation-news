export function clampScore(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function normalizeFractionalScore(value: unknown) {
  const numericValue = Number(value) || 0;
  return numericValue > 0 && numericValue <= 1 ? clampScore(numericValue * 100) : clampScore(numericValue);
}
