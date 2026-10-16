export type Story = {
  slug: string;
  topic: string;
  topics: string[];
  title: string;
  summary: string;
  byline: string;
  image: string;
  bullets: string[];
  leaning: 'Left' | 'Centre' | 'Right';
  balance: [number, number, number];
  sources: { name: string; url: string; primary?: boolean }[];
};

// These are the permanent editorial categories. Story content itself now comes
// exclusively from published Supabase records.
export const allTopics = ['Wildlife', 'Oceans', 'Forests', 'Freshwater', 'Land & climate', 'Solutions'];

export const cleanCopy = (text: string) => text.replace(/\s*—\s*/g, ', ');

export const storyImage = (story: Story) => story.image;

export const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export const topicSlug = (topic: string) => slugify(topic);

export const getTopic = (slug: string) => allTopics.find((topic) => topicSlug(topic) === slug);
