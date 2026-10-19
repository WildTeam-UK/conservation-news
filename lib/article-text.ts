export function stripSourceMarkers(value: string) {
  return value
    .replace(/\s*\[\s*source(?:[-_\s:]|\b)[^\]]*\]/gi, '')
    .replace(/\s*\(\s*source(?:[-_\s:]|\b)[^)]*\)/gi, '')
    .trim();
}
