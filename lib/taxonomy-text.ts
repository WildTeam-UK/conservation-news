export function normalizeTaxonomyKey(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tagSlug(value: string) {
  return normalizeTaxonomyKey(value).replace(/\s+/g, '-') || 'tag';
}
