import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleTemplate, type ArticleTemplateData } from '@/components/article-template';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { getPublishedStories, getPublishedStory, publishedStoryToArticle, publishedStoryToListing } from '@/lib/published-stories';
import { cleanCopy, expandedBullet, getCoverageAnalysis, getStory, getStoryInsights, stories, storyImage, storyOverview } from '@/lib/stories';

export const dynamic = 'force-dynamic';

export function generateStaticParams() { return stories.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (published) {
    const content = published.generation_metadata.article_content as { seo_title?: string; seo_description?: string } | undefined;
    const title = content?.seo_title || published.headline;
    const description = content?.seo_description || published.standfirst;
    const images = published.image_url ? [{ url: published.image_url }] : [];
    return { title: `${title} | WILDNEWS`, description, openGraph: { title, description, images }, twitter: { card: 'summary_large_image', title, description, images: images.map((image) => image.url) } };
  }
  const story = getStory(slug);
  if (!story) return { title: 'Story not found | WILDNEWS' };
  const title = cleanCopy(story.title);
  const description = cleanCopy(story.summary);
  const image = storyImage(story);
  return { title: `${title} | WILDNEWS`, description, openGraph: { title, description, images: [{ url: image }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (published) {
    const allPublished = await getPublishedStories(20);
    const publishedListing = publishedStoryToListing(published);
    const related = allPublished.filter((item) => item.id !== published.id).filter((item) => publishedStoryToListing(item).topics.some((topic) => publishedListing.topics.includes(topic))).slice(0, 6).map(publishedStoryToListing);
    return <main>
      <InteriorHeader actionHref="#sources" actionLabel="View sources" />
      <ArticleTemplate article={publishedStoryToArticle(published)} />
      {related.length ? <section className="related shell"><div className="section-heading"><h2>Similar stories</h2><p>Keep exploring this topic.</p></div><div className="related-grid">{related.map((item) => <article key={item.slug}><Link href={`/stories/${item.slug}`} className="related-image" aria-label={cleanCopy(item.title)}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(item)} alt="" /></Link><TopicTag topic={item.topic} /><h3><Link href={`/stories/${item.slug}`}>{cleanCopy(item.title)}</Link></h3></article>)}</div></section> : null}
      <SiteFooter />
    </main>;
  }
  const story = getStory(slug);
  if (!story) return <main className="missing shell"><h1>Story not found</h1><Link href="/">Back to WildNews</Link></main>;
  const related = stories.filter((item) => item.slug !== story.slug && item.topics.some((topic) => story.topics.includes(topic))).slice(0, 6);
  if (related.length < 6) related.push(...stories.filter((item) => item.slug !== story.slug && !related.includes(item)).slice(0, 6 - related.length));
  const coverage = getCoverageAnalysis(story);
  const insights = getStoryInsights(story);
  const article: ArticleTemplateData = {
    topics: story.topics,
    headline: cleanCopy(story.title),
    storyAtAGlance: storyOverview(story),
    imageUrl: storyImage(story),
    imageAlt: '',
    byline: story.byline,
    updatedAt: '2026-08-28T12:00:00.000Z',
    keyTakeaways: story.bullets.map((bullet, index) => expandedBullet(story, bullet, index)),
    whyItMatters: insights.whyItMatters,
    whatHappensNext: insights.nextSteps.join(' '),
    whatWeKnow: insights.known,
    whatWeDontKnow: insights.unknown,
    sources: story.sources,
    coverage: { ecological: coverage.ecological, evidence: coverage.evidence, consensus: coverage.consensus },
  };

  return <main>
    <InteriorHeader actionHref="#sources" actionLabel="View sources" />
    <ArticleTemplate article={article} />
    <section className="related shell"><div className="section-heading"><h2>Similar stories</h2><p>Keep exploring this topic.</p></div><div className="related-grid">{related.map((item) => <article key={item.slug}><Link href={`/stories/${item.slug}`} className="related-image" aria-label={cleanCopy(item.title)}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(item)} alt="" /></Link><TopicTag topic={item.topic} /><h3><Link href={`/stories/${item.slug}`}>{cleanCopy(item.title)}</Link></h3></article>)}</div></section>
    <SiteFooter />
  </main>;
}
