/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { ArchiveTrainingPromotion } from '@/components/archive-training-promotion';
import { InteriorHeader } from '@/components/interior-header';
import { WeeklyDigestNewsletterCta } from '@/components/newsletter-cta';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { getPublishedStories, getPublicTag, publishedStoryToListing, publishedTags, relatedPublishedStories } from '@/lib/published-stories';
import { cleanCopy, storyHref, storyImage } from '@/lib/stories';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const slug = (await params).tag;
  const tag = await getPublicTag(slug);
  if (!tag) return { title: 'Tag not found | WILDNEWS', robots: { index: false, follow: false } };
  return { title: tag.seo_title ?? `${tag.name} conservation news | WILDNEWS`, description: tag.meta_description ?? tag.description ?? `Explore WILDNEWS briefings and source-led conservation coverage about ${tag.name}.` };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const slug = (await params).tag;
  const [published, tag] = await Promise.all([getPublishedStories(200), getPublicTag(slug)]);
  if (!tag) return <main className="missing shell"><h1>Tag not found</h1><a href="/">Back to WildNews</a></main>;
  const tagStories = published.filter((story) => publishedTags(story).some((item) => item.slug === slug));
  const stories = tagStories.map(publishedStoryToListing);
  const related = relatedPublishedStories(tagStories, published).map(publishedStoryToListing);
  return <main className="archive-page">
    <InteriorHeader />
    <section className="topic-page-hero shell tag-page-hero"><a className="archive-tag-pill" href={`/tags/${tag.slug}`}>{tag.name}</a><h1>{tag.name}</h1><p>{tag.description ?? `Source-led conservation briefings connected to ${tag.name}.`}</p><span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span></section>
    <section className="topic-page-grid shell">{stories.map((story, index) => <Fragment key={story.slug}><article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'}><a className="topic-story-image" href={storyHref(story)} aria-label={`Read: ${cleanCopy(story.title)}`}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(story)} alt="" /></a><div><TopicTag topic={story.topic} /><h2><a href={storyHref(story)}>{cleanCopy(story.title)}</a></h2><p>{cleanCopy(story.summary)}</p><a className="text-link" href={storyHref(story)}>Read story <ArrowRight /></a></div></article>{stories.length >= 6 && index === 4 ? <ArchiveTrainingPromotion /> : null}</Fragment>)}</section>
    <WeeklyDigestNewsletterCta id={`tag-${slug}-digest-email`} className="editorial-newsletter-cta shell" />
    <SimilarStories stories={related} />
    <SiteFooter />
  </main>;
}
