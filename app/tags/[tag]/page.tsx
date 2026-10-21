/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditorialArchiveCard } from '@/components/editorial-archive-card';
import { EditorialPageEnd } from '@/components/editorial-page-end';
import { ArchiveHero } from '@/components/archive-hero';
import { InteriorHeader } from '@/components/interior-header';
import { StoryTags } from '@/components/story-tags';
import { getGoodNewsSettings, getPublishedStories, getPublicTag, publishedStoryToListing, publishedTags, relatedPublishedStories } from '@/lib/published-stories';
import { cleanCopy, storyHref, storyImage } from '@/lib/stories';
import { InlineBrand } from '@/components/inline-brand';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const slug = (await params).tag;
  const [tag, published] = await Promise.all([getPublicTag(slug), getPublishedStories(200)]);
  const hasPublishedStory = tag ? published.some((story) => publishedTags(story).some((item) => item.slug === slug)) : false;
  if (!tag || !hasPublishedStory) return { title: 'Tag not found | WILDNEWS', robots: { index: false, follow: false } };
  const title = tag.seo_title ?? `${tag.name} conservation news | WILDNEWS`;
  const description = tag.meta_description ?? tag.description ?? `Explore WILDNEWS briefings and source-led conservation coverage about ${tag.name}.`;
  return pageMetadata({ title, description, path: `/tags/${slug}` });
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const slug = (await params).tag;
  const [published, tag, goodNewsSettings] = await Promise.all([getPublishedStories(200), getPublicTag(slug), getGoodNewsSettings()]);
  if (!tag) notFound();
  const tagStories = published.filter((story) => publishedTags(story).some((item) => item.slug === slug));
  if (!tagStories.length) notFound();
  const stories = tagStories.map((story) => publishedStoryToListing(story, goodNewsSettings));
  const related = relatedPublishedStories(tagStories, published).map((story) => publishedStoryToListing(story, goodNewsSettings));
  return <main className="archive-page">
    <InteriorHeader />
    <ArchiveHero
      label={<a className="archive-tag-pill" href={`/tags/${tag.slug}`}>{tag.name}</a>}
      title={tag.name}
      description={<InlineBrand text={tag.description ?? `Source-led conservation briefings connected to ${tag.name}.`} />}
      meta={`${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
    />
    <section className="topic-page-grid shell">{stories.map((story, index) => <EditorialArchiveCard
      featured={index === 0}
      href={storyHref(story)}
      image={storyImage(story)}
      goodNews={story.goodNews}
      labels={<StoryTags story={story} />}
      title={cleanCopy(story.title)}
      summary={cleanCopy(story.summary)}
      linkLabel="Read story"
      key={story.slug}
    />)}</section>
    <EditorialPageEnd newsletterId={`tag-${slug}-digest-email`} stories={related} />
  </main>;
}
