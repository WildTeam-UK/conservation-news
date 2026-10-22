export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

type NamedSource = { name: string };

export function sourceRelationName(
  source: NamedSource | NamedSource[] | null | undefined,
  fallback = 'Unknown source',
) {
  return firstRelation(source)?.name ?? fallback;
}
