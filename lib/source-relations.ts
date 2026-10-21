type NamedSource = { name: string };

export function sourceRelationName(
  source: NamedSource | NamedSource[] | null | undefined,
  fallback = 'Unknown source',
) {
  const relatedSource = Array.isArray(source) ? source[0] : source;
  return relatedSource?.name ?? fallback;
}
