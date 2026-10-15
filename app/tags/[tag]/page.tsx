import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CuratorByline } from '@/components/curator-byline';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { getPublishedStories, publishedStoryToListing, publishedTags } from '@/lib/published-stories';
import { cleanCopy, storyImage } from '@/lib/stories';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const slug = (await params).tag;
  const stories = await getPublishedStories(200);
  const tag = stories.flatMap(publishedTags).find((item) => item.slug === slug);
  if (!tag) return { title: 'Tag not found | WILDNEWS', robots: { index: false, follow: false } };
  return { title: `${tag.name} conservation news | WILDNEWS`, description: `Explore WILDNEWS briefings and source-led conservation coverage about ${tag.name}.` };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const slug = (await params).tag;
  const published = await getPublishedStories(200);
  const tag = published.flatMap(publishedTags).find((item) => item.slug === slug);
  if (!tag) return <main className="missing shell"><h1>Tag not found</h1><Link href="/">Back to WildNews</Link></main>;
  const stories = published.filter((story) => publishedTags(story).some((item) => item.slug === slug)).map(publishedStoryToListing);
  return <main className="archive-page">
    <InteriorHeader />
    <section className="topic-page-hero shell tag-page-hero"><p className="eyebrow">Discovery tag</p><h1>{tag.name}</h1><p>Source-led conservation briefings connected to {tag.name}.</p><span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span></section>
    <section className="topic-page-grid shell">{stories.map((story, index) => <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={story.slug}><Link className="topic-story-image" href={`/stories/${story.slug}`} aria-label={`Read: ${cleanCopy(story.title)}`}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(story)} alt="" /></Link><div><TopicTag topic={story.topic} /><h2><Link href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</Link></h2><p>{cleanCopy(story.summary)}</p><CuratorByline name={story.byline} /><Link className="text-link" href={`/stories/${story.slug}`}>Read story <ArrowRight /></Link></div></article>)}</section>
    <SiteFooter />
  </main>;
}
