/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { WeeklyDigestNewsletterCta } from '@/components/newsletter-cta';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { StoryTags } from '@/components/story-tags';
import { getGoodNewsSettings, getPublishedStories, getPublicTopic, publishedStoryToListing, publishedTopics, relatedPublishedStories } from '@/lib/published-stories';
import { allTopics, cleanCopy, getTopic, storyHref, storyImage, topicSlug } from '@/lib/stories';
import { GoodNewsBadge } from '@/components/good-news-badge';
import { InlineBrand } from '@/components/inline-brand';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return allTopics.map((topic) => ({ topic: topicSlug(topic) }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const slug = (await params).topic;
  const [archive, published] = await Promise.all([getPublicTopic(slug), getPublishedStories(200)]);
  const hasPublishedStory = archive ? published.some((story) => publishedTopics(story).some((topic) => topicSlug(topic) === slug)) : false;
  if (!archive || !hasPublishedStory) return { title: 'Topic not found | WILDNEWS', robots: { index: false, follow: false } };
  return { title: archive.seo_title ?? `${archive.name} news | WILDNEWS`, description: archive.meta_description ?? archive.description ?? `The latest ${archive.name.toLowerCase()} reporting, analysis and ideas from WILDNEWS.` };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const slug = (await params).topic;
  const [publishedRecords, archive, goodNewsSettings] = await Promise.all([getPublishedStories(200), getPublicTopic(slug), getGoodNewsSettings()]);
  const topic = archive?.name ?? [...new Set(publishedRecords.flatMap(publishedTopics))].find((name) => topicSlug(name) === slug) ?? getTopic(slug);
  if (!topic || !archive) return <main className="missing shell"><h1>Topic not found</h1><a href="/">Back to WildNews</a></main>;

  const topicRecords = publishedRecords.filter((story) => publishedTopics(story).some((storyTopic) => storyTopic === topic));
  const topicStories = topicRecords.map((story) => publishedStoryToListing(story, goodNewsSettings));
  if (!topicStories.length) return <main className="missing shell"><h1>Topic not found</h1><a href="/">Back to WildNews</a></main>;
  const related = relatedPublishedStories(topicRecords, publishedRecords).map((story) => publishedStoryToListing(story, goodNewsSettings));

  return <main className="archive-page">
    <InteriorHeader />
    <section className="topic-page-hero shell">
      <TopicTag topic={topic} className="topic-pill" />
      <h1>{topic}</h1>
      <p><InlineBrand text={archive.description ?? `The latest reporting, analysis and practical ideas shaping ${topic.toLowerCase()} conservation.`} /></p>
      <span>{topicStories.length} {topicStories.length === 1 ? 'story' : 'stories'}</span>
    </section>
    <section className="topic-page-grid shell">
      {topicStories.map((story, index) => <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={story.slug}>
        <a className="topic-story-image" href={storyHref(story)} aria-label={`Read: ${cleanCopy(story.title)}`}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(story)} alt="" />{story.goodNews ? <GoodNewsBadge overlay /> : null}</a>
        <div><StoryTags story={story} /><h2><a href={storyHref(story)}>{cleanCopy(story.title)}</a></h2><p>{cleanCopy(story.summary)}</p><a className="text-link" href={storyHref(story)}>Read story <ArrowRight /></a></div>
      </article>)}
    </section>
    <WeeklyDigestNewsletterCta id={`topic-${slug}-digest-email`} className="editorial-newsletter-cta shell" />
    <SimilarStories stories={related} />
    <SiteFooter />
  </main>;
}
