export function environmentValue(value: string | undefined) {
  return value?.trim() ?? '';
}

export function requireEnvironmentValue(name: string, value: string | undefined) {
  const resolved = environmentValue(value);
  if (!resolved) throw new Error(`Missing required environment variable: ${name}`);
  return resolved;
}

export function positiveIntegerEnvironmentValue(name: string, value: string | undefined) {
  const resolved = environmentValue(value);
  if (!/^\d+$/.test(resolved)) throw new Error(`Invalid positive integer environment variable: ${name}`);
  const number = Number(resolved);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`Invalid positive integer environment variable: ${name}`);
  return number;
}
