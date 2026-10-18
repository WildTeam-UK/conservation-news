export const AI_HOUSE_STYLE = 'WILDNEWS house style: Never use an em dash (—). Rewrite the sentence using a comma, colon, semicolon or separate sentence instead.';

export function aiInstructions(instructions: string) {
  return `${instructions.trim()}\n\n${AI_HOUSE_STYLE}`;
}

export function cleanAiText(value: string) {
  return value.replace(/\s*—\s*/g, ', ');
}

function cleanAiValue(value: unknown): unknown {
  if (typeof value === 'string') return cleanAiText(value);
  if (Array.isArray(value)) return value.map(cleanAiValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanAiValue(item)]));
  return value;
}

export function parseAiJson<T>(value: string): T {
  return cleanAiValue(JSON.parse(value)) as T;
}
