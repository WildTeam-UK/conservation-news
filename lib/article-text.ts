export function stripSourceMarkers(value: string) {
  return value.replace(/\s*\[(?:\s*source-[1-9][0-9]*\s*,?)+\]/gi, '').trim();
}
