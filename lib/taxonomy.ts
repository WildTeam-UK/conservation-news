export const EDITORIAL_TOPICS = [
  'Wildlife',
  'Oceans & Coasts',
  'Forests',
  'Freshwater',
  'Climate',
  'Land & Food',
  'People & Communities',
  'Policy & Governance',
  'Conservation Practice',
] as const;

export const PRIMARY_TOPICS = EDITORIAL_TOPICS;
export const SECONDARY_TOPICS = EDITORIAL_TOPICS;
export const ALL_TOPICS = EDITORIAL_TOPICS;
export const TAXONOMY_REVIEW_TOPIC = 'Needs taxonomy review' as const;

export type EditorialTopicName = typeof EDITORIAL_TOPICS[number];

const LEGACY_TOPIC_MAP: Record<string, EditorialTopicName> = {
  Oceans: 'Oceans & Coasts',
  'Land & climate': 'Climate',
  Solutions: 'Conservation Practice',
  Adaptation: 'Climate',
  Agriculture: 'Land & Food',
  Cities: 'People & Communities',
  Communities: 'People & Communities',
  Crime: 'Policy & Governance',
  Fisheries: 'Oceans & Coasts',
  'Indigenous affairs': 'People & Communities',
  Policy: 'Policy & Governance',
  Pollinators: 'Wildlife',
  Restoration: 'Conservation Practice',
  Rewilding: 'Conservation Practice',
  Soil: 'Land & Food',
  Technology: 'Conservation Practice',
  Tourism: 'People & Communities',
  Wetlands: 'Freshwater',
  Wildfire: 'Climate',
};

export function normalizeEditorialTopic(value: string): EditorialTopicName | null {
  if ((EDITORIAL_TOPICS as readonly string[]).includes(value)) return value as EditorialTopicName;
  return LEGACY_TOPIC_MAP[value] ?? null;
}

export function normalizeEditorialTopics(values: string[]) {
  return [...new Set(values.flatMap((value) => normalizeEditorialTopic(value) ?? []))];
}
