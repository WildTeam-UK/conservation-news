import type { EditorialImageCredit } from '@/lib/images/types';
import type { ArticleContextualLink } from '@/lib/article-linking';
import { cleanAiText } from '@/lib/openai/house-style';
import { getSupabasePublicClient } from '@/lib/supabase/public';

export type DigestType = 'daily' | 'weekly';

export type DigestSection = {
  heading: string;
  paragraphs: string[];
  story_ids: string[];
};

export type DigestContextualLink = ArticleContextualLink & {
  section_index: number;
  paragraph_index: number;
};

export type DigestContent = {
  template_version: 1 | 2 | 3;
  digest_type: DigestType;
  edition_label: string;
  headline: string;
  standfirst: string;
  image_search_query?: string;
  image_search_fallbacks?: string[];
  image_credit?: EditorialImageCredit | null;
  topics?: string[];
  introduction: string[];
  sections: DigestSection[];
  contextual_links?: DigestContextualLink[];
  what_to_watch: string[];
  closing_note?: string;
  seo_title: string;
  seo_description: string;
  social_post?: string;
};

export type DigestSourceStory = {
  id: string;
  slug: string;
  headline: string;
  standfirst: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit?: EditorialImageCredit | null;
  topics?: string[];
  published_at: string;
};

export type DigestStoryRecord = {
  id: string;
  slug: string;
  status: string;
  content_type: 'daily_digest' | 'weekly_digest';
  headline: string;
  standfirst: string;
  image_url: string | null;
  image_alt: string | null;
  published_at: string | null;
  updated_at: string;
  digest_period_start: string;
  digest_period_end: string;
  generation_metadata: { digest_content?: DigestContent; digest_source_stories?: DigestSourceStory[] };
};

const graphemeSegmenter = new Intl.Segmenter('en-GB', { granularity: 'grapheme' });

export function digestTextGraphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
}

export function cleanDigestText(value: string) {
  return cleanAiText(value)
    .replace(/\[([^\]]+)\]\(\s*\(wrong\)\s*\)/gi, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

export function digestPath(type: DigestType, date: string) {
  return `/${type === 'weekly' ? 'weekly-digest' : 'daily-digest'}/${date}`;
}

type SourceImageMetadata = {
  article_content?: { image_url?: string | null; image_alt?: string | null; image_credit?: EditorialImageCredit | null; topics?: string[] };
};

export async function hydrateDigestSourceStories(stories: DigestSourceStory[]) {
  if (!stories.length) return stories;
  const { data, error } = await getSupabasePublicClient().from('stories')
    .select('id, image_url, image_alt, generation_metadata, story_topics(topics(name))')
    .in('id', stories.map((story) => story.id));
  if (error) throw error;
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return stories.map((story) => {
    const row = byId.get(story.id);
    const metadata = (row?.generation_metadata ?? {}) as SourceImageMetadata;
    const article = metadata.article_content ?? {};
    const topicLinks = (row?.story_topics ?? []) as unknown as Array<{ topics: { name: string } | { name: string }[] | null }>;
    const linkedTopics = topicLinks.flatMap((link) => Array.isArray(link.topics) ? link.topics.map((topic) => topic.name) : link.topics?.name ?? []);
    return {
      ...story,
      image_url: story.image_url ?? row?.image_url ?? article.image_url ?? null,
      image_alt: story.image_alt ?? row?.image_alt ?? article.image_alt ?? null,
      image_credit: story.image_credit ?? article.image_credit ?? null,
      topics: story.topics?.length ? story.topics : linkedTopics,
    };
  });
}

export async function getPublishedDigest(type: DigestType, date: string) {
  const { data, error } = await getSupabasePublicClient().from('stories')
    .select('id, slug, status, content_type, headline, standfirst, image_url, image_alt, published_at, updated_at, digest_period_start, digest_period_end, generation_metadata')
    .eq('slug', `${type}-digest-${date}`)
    .eq('content_type', `${type}_digest`)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const record = data as DigestStoryRecord;
  const sources = await hydrateDigestSourceStories(record.generation_metadata.digest_source_stories ?? []);
  const fallbackImage = sources.find((story) => story.image_url);
  return {
    ...record,
    image_url: record.image_url ?? fallbackImage?.image_url ?? null,
    image_alt: record.image_alt ?? fallbackImage?.image_alt ?? null,
    generation_metadata: { ...record.generation_metadata, digest_source_stories: sources },
  };
}

async function getPublishedDigests(type: DigestType, limit: number) {
  const { data, error } = await getSupabasePublicClient().from('stories')
    .select('id, slug, status, content_type, headline, standfirst, image_url, image_alt, published_at, updated_at, digest_period_start, digest_period_end, generation_metadata')
    .eq('content_type', `${type}_digest`)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DigestStoryRecord[];
}

export async function getPublishedWeeklyDigests(limit = 52) {
  return getPublishedDigests('weekly', limit);
}

export async function getPublishedDailyDigests(limit = 12) {
  return getPublishedDigests('daily', limit);
}

