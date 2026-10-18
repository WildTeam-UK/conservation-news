import { createClient } from '@supabase/supabase-js';
import type { ArticleTemplateData } from '@/components/article-template';
import { stripSourceMarkers } from '@/lib/article-text';
import type { StoryDraftContent } from '@/lib/openai/draft-story';
import type { Story } from '@/lib/stories';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import { normalizeEditorialTopics } from '@/lib/taxonomy';

type PublishedSource = { source_name: string; source_title: string; source_url: string; source_role: string; display_order: number };
type PublishedTopicLink = { topics: { name: string; slug: string } | { name: string; slug: string }[] | null };
type PublishedTagLink = { confidence: number | null; content_tags: { name: string; slug: string; status: string } | { name: string; slug: string; status: string }[] | null };

export type PublicTaxonomyArchive = { name: string; slug: string; description: string | null; seo_title: string | null; meta_description: string | null };

export type PublishedStory = {
  id: string;
  slug: string;
  headline: string;
  standfirst: string;
  image_url: string | null;
  image_alt: string | null;
  byline: string;
  published_at: string;
  updated_at: string;
  generation_metadata: Record<string, unknown>;
  story_sources: PublishedSource[];
  story_topics: PublishedTopicLink[];
  story_tags: PublishedTagLink[];
};

function publicClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
}

const storySelect = 'id, slug, headline, standfirst, image_url, image_alt, byline, published_at, updated_at, generation_metadata, story_sources(source_name, source_title, source_url, source_role, display_order), story_topics(topics(name, slug)), story_tags(confidence, content_tags(name, slug, status))';

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function publishedTopics(story: PublishedStory) {
  const content = (story.generation_metadata.article_content ?? {}) as Partial<StoryDraftContent>;
  const linked = story.story_topics.flatMap((link) => one(link.topics)?.name ?? []);
  return normalizeEditorialTopics([...(content.topics ?? []), ...linked].filter(Boolean));
}

export function publishedTags(story: PublishedStory) {
  return story.story_tags.flatMap((link) => {
    const tag = one(link.content_tags);
    return tag?.status === 'approved' ? [{ name: tag.name, slug: tag.slug, confidence: link.confidence ?? 0 }] : [];
  }).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

export async function getPublicTopic(slug: string): Promise<PublicTaxonomyArchive | null> {
  const { data, error } = await publicClient().from('topics').select('name, slug, description, seo_title, meta_description').eq('slug', slug).eq('active', true).maybeSingle();
  if (error) throw error;
  return data as PublicTaxonomyArchive | null;
}

export async function getPublicTag(slug: string): Promise<PublicTaxonomyArchive | null> {
  const { data, error } = await publicClient().from('content_tags').select('name, slug, description, seo_title, meta_description').eq('slug', slug).eq('status', 'approved').maybeSingle();
  if (error) throw error;
  return data as PublicTaxonomyArchive | null;
}

export async function getPublishedStory(slug: string): Promise<PublishedStory | null> {
  const { data, error } = await publicClient().from('stories').select(storySelect).eq('slug', slug).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data as unknown as PublishedStory | null;
}

export async function getPublishedStories(limit = 100): Promise<PublishedStory[]> {
  const { data, error } = await publicClient().from('stories').select(storySelect).eq('status', 'published').lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PublishedStory[];
}

export function relatedPublishedStories(referenceStories: PublishedStory[], candidates: PublishedStory[], limit = 6) {
  const excludedIds = new Set(referenceStories.map((story) => story.id));
  const referenceTopics = new Set(referenceStories.flatMap(publishedTopics));
  const referenceTags = new Set(referenceStories.flatMap((story) => publishedTags(story).map((tag) => tag.slug)));

  return candidates
    .filter((story) => !excludedIds.has(story.id))
    .map((story, index) => {
      const sharedTopics = publishedTopics(story).filter((topic) => referenceTopics.has(topic)).length;
      const sharedTags = publishedTags(story).filter((tag) => referenceTags.has(tag.slug)).length;
      return { story, index, score: (sharedTopics * 3) + (sharedTags * 2) };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ story }) => story);
}

export function publishedStoryToArticle(story: PublishedStory): ArticleTemplateData {
  const content = story.generation_metadata.article_content as StoryDraftContent;
  const sources = [...story.story_sources].sort((a, b) => a.display_order - b.display_order);
  return {
    topics: publishedTopics(story),
    discoveryTags: publishedTags(story).slice(0, 3),
    headline: story.headline,
    storyAtAGlance: content.story_at_a_glance.map((item) => ({ text: item.text, sourceIds: item.source_ids })),
    imageUrl: story.image_url ?? content.image_url,
    imageAlt: story.image_alt ?? content.image_alt,
    imageCredit: content.image_credit,
    updatedAt: story.updated_at,
    keyTakeaways: content.key_takeaways.map((item) => ({ text: item.text, sourceIds: item.source_ids })),
    whyItMatters: { text: content.why_it_matters.text, sourceIds: content.why_it_matters.source_ids },
    whatHappensNext: { text: content.what_happens_next.text, sourceIds: content.what_happens_next.source_ids },
    whatWeKnow: content.what_we_know.map((item) => ({ text: item.text, sourceIds: item.source_ids })),
    whatWeDontKnow: content.what_we_dont_know.map((item) => ({ text: item.text, sourceIds: item.source_ids })),
    sources: sources.map((source) => ({ id: `source-${source.display_order}`, name: source.source_name, title: source.source_title, url: source.source_url, primary: source.source_role === 'primary' })),
    coverage: content.coverage_analysis,
  };
}

export function publishedStoryToListing(story: PublishedStory): Story {
  const content = story.generation_metadata.article_content as StoryDraftContent;
  const topics = publishedTopics(story);
  return {
    slug: story.slug,
    topic: topics[0] ?? 'Conservation Practice',
    topics,
    title: story.headline,
    summary: stripSourceMarkers(story.standfirst),
    byline: story.byline,
    image: story.image_url ?? content.image_url,
    bullets: content.key_takeaways.map((item) => item.text),
    leaning: 'Centre',
    balance: [34, 52, 14],
    sources: story.story_sources.map((source) => ({ name: source.source_name, url: source.source_url, primary: source.source_role === 'primary' })),
  };
}
