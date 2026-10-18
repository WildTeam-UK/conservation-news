import { ALL_TOPICS } from '@/lib/taxonomy';

export type Story = {
  slug: string;
  href?: string;
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
export const allTopics = [...ALL_TOPICS];

export const cleanCopy = (text: string) => text.replace(/\s*—\s*/g, ', ');

export const storyImage = (story: Story) => story.image;

export const storyHref = (story: Story) => story.href ?? `/stories/${story.slug}`;

export const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export const topicSlug = (topic: string) => slugify(topic);

export const getTopic = (slug: string) => allTopics.find((topic) => topicSlug(topic) === slug);
