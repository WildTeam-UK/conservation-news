import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ResearchSource } from '@/lib/openai/research-story';
import type { TrainingCoursePromotion } from '@/lib/training-courses';
import type { ArticleLinkTarget } from '@/lib/article-linking';
import { firstRelation } from '@/lib/supabase/relations';

type RelatedStory = {
  id: string;
  slug: string;
  headline: string;
  standfirst: string;
  published_at: string | null;
  story_topics: { topics: { name: string } | { name: string }[] | null }[];
  story_tags: { content_tags: { name: string; status: string } | { name: string; status: string }[] | null }[];
};

const normalized = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-GB').replace(/[^a-z0-9]+/g, ' ').trim();

export async function buildArticleLinkTargets(input: {
  topics: string[];
  tagIds?: string[];
  courses: (TrainingCoursePromotion & { matching_guidance?: string; matching_terms?: string[] })[];
  sources: Array<Pick<ResearchSource, 'title' | 'publisher' | 'url'> & { id: string }>;
  excludeStoryId?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const [{ data: topicRows, error: topicsError }, { data: tagRows, error: tagsError }, { data: storyRows, error: storiesError }] = await Promise.all([
    input.topics.length ? supabase.from('topics').select('id, name, slug, description').in('name', input.topics).eq('active', true) : Promise.resolve({ data: [], error: null }),
    input.tagIds?.length ? supabase.from('content_tags').select('id, name, slug, description').in('id', input.tagIds).eq('status', 'approved') : Promise.resolve({ data: [], error: null }),
    supabase.from('stories').select('id, slug, headline, standfirst, published_at, story_topics(topics(name)), story_tags(content_tags(name, status))').eq('content_type', 'news').eq('status', 'published').lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(180),
  ]);
  if (topicsError) throw topicsError;
  if (tagsError) throw tagsError;
  if (storiesError) throw storiesError;

  const topicNames = new Set(input.topics.map(normalized));
  const tagNames = new Set((tagRows ?? []).map((tag) => normalized(tag.name)));
  const related = ((storyRows ?? []) as unknown as RelatedStory[])
    .filter((story) => story.id !== input.excludeStoryId)
    .map((story, index) => {
      const sharedTopics = story.story_topics.filter((link) => { const topic = firstRelation(link.topics); return topic && topicNames.has(normalized(topic.name)); }).length;
      const sharedTags = story.story_tags.filter((link) => { const tag = firstRelation(link.content_tags); return tag?.status === 'approved' && tagNames.has(normalized(tag.name)); }).length;
      return { story, index, score: (sharedTopics * 3) + (sharedTags * 2) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 12)
    .map(({ story }) => ({ id: story.id, type: 'article' as const, href: `/stories/${story.slug}`, title: story.headline, description: story.standfirst, external: false }));

  const topicTargets: ArticleLinkTarget[] = (topicRows ?? []).map((topic) => ({ id: topic.id, type: 'topic', href: `/topics/${topic.slug}`, title: topic.name, description: topic.description ?? `WildNews coverage of ${topic.name}.`, external: false }));
  const tagTargets: ArticleLinkTarget[] = (tagRows ?? []).map((tag) => ({ id: tag.id, type: 'tag', href: `/tags/${tag.slug}`, title: tag.name, description: tag.description ?? `WildNews coverage tagged ${tag.name}.`, external: false }));
  const courseTargets: ArticleLinkTarget[] = input.courses.map((course) => ({ id: course.id, type: 'course', href: course.course_url, title: course.title, description: course.matching_guidance ?? course.description, external: true }));
  const sourceTargets: ArticleLinkTarget[] = input.sources.map((source) => ({ id: source.id, type: 'source', href: source.url, title: `${source.publisher}: ${source.title}`, description: 'A verified source used for this article.', external: true }));
  return [...related, ...topicTargets, ...tagTargets, ...courseTargets, ...sourceTargets];
}

