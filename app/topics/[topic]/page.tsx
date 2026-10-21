/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditorialArchiveCard } from '@/components/editorial-archive-card';
import { EditorialPageEnd } from '@/components/editorial-page-end';
import { ArchiveHero } from '@/components/archive-hero';
import { InteriorHeader } from '@/components/interior-header';
import { TopicTag } from '@/components/topic-tag';
import { StoryTags } from '@/components/story-tags';
import { getGoodNewsSettings, getPublishedStories, getPublicTopic, publishedStoryToListing, publishedTopics, relatedPublishedStories } from '@/lib/published-stories';
import { allTopics, cleanCopy, getTopic, storyHref, storyImage, topicSlug } from '@/lib/stories';
import { InlineBrand } from '@/components/inline-brand';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return allTopics.map((topic) => ({ topic: topicSlug(topic) }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const slug = (await params).topic;
  const [archive, published] = await Promise.all([getPublicTopic(slug), getPublishedStories(200)]);
  const hasPublishedStory = archive ? published.some((story) => publishedTopics(story).some((topic) => topicSlug(topic) === slug)) : false;
  if (!archive || !hasPublishedStory) return { title: 'Topic not found | WILDNEWS', robots: { index: false, follow: false } };
  const title = archive.seo_title ?? `${archive.name} news | WILDNEWS`;
  const description = archive.meta_description ?? archive.description ?? `The latest ${archive.name.toLowerCase()} reporting, analysis and ideas from WILDNEWS.`;
  return pageMetadata({ title, description, path: `/topics/${slug}` });
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const slug = (await params).topic;
  const [publishedRecords, archive, goodNewsSettings] = await Promise.all([getPublishedStories(200), getPublicTopic(slug), getGoodNewsSettings()]);
  const topic = archive?.name ?? [...new Set(publishedRecords.flatMap(publishedTopics))].find((name) => topicSlug(name) === slug) ?? getTopic(slug);
  if (!topic || !archive) notFound();

  const topicRecords = publishedRecords.filter((story) => publishedTopics(story).some((storyTopic) => storyTopic === topic));
  const topicStories = topicRecords.map((story) => publishedStoryToListing(story, goodNewsSettings));
  if (!topicStories.length) notFound();
  const related = relatedPublishedStories(topicRecords, publishedRecords).map((story) => publishedStoryToListing(story, goodNewsSettings));

  return <main className="archive-page">
    <InteriorHeader />
    <ArchiveHero
      label={<TopicTag topic={topic} />}
      title={topic}
      description={<InlineBrand text={archive.description ?? `The latest reporting, analysis and practical ideas shaping ${topic.toLowerCase()} conservation.`} />}
      meta={`${topicStories.length} ${topicStories.length === 1 ? 'story' : 'stories'}`}
    />
    <section className="topic-page-grid shell">
      {topicStories.map((story, index) => <EditorialArchiveCard
        featured={index === 0}
        href={storyHref(story)}
        image={storyImage(story)}
        goodNews={story.goodNews}
        labels={<StoryTags story={story} />}
        title={cleanCopy(story.title)}
        summary={cleanCopy(story.summary)}
        linkLabel="Read story"
        key={story.slug}
      />)}
    </section>
    <EditorialPageEnd newsletterId={`topic-${slug}-digest-email`} stories={related} />
  </main>;
}
