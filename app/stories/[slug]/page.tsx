/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic story routes */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleTemplate } from '@/components/article-template';
import { EditorialPageEnd } from '@/components/editorial-page-end';
import { InteriorHeader } from '@/components/interior-header';
import { JsonLd } from '@/components/json-ld';
import { getGoodNewsSettings, getPublishedStories, getPublishedStory, publishedStoryToArticle, publishedStoryToListing, publishedTopics, relatedPublishedStories } from '@/lib/published-stories';
import { articleMetadata, newsArticleJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (!published) return { title: 'Story not found | WILDNEWS', robots: { index: false, follow: false } };

  const content = published.generation_metadata.article_content as { seo_title?: string; seo_description?: string } | undefined;
  const title = content?.seo_title || published.headline;
  const description = content?.seo_description || published.standfirst;
  return articleMetadata({ title: `${title} | WILDNEWS`, description, path: `/stories/${published.slug}`, image: published.image_url, imageAlt: published.image_alt, publishedTime: published.published_at, modifiedTime: published.updated_at });
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (!published) notFound();

  const [allPublished, goodNewsSettings] = await Promise.all([getPublishedStories(20), getGoodNewsSettings()]);
  const related = relatedPublishedStories([published], allPublished).map((story) => publishedStoryToListing(story, goodNewsSettings));
  const article = publishedStoryToArticle(published, goodNewsSettings);
  const structuredData = newsArticleJsonLd({ headline: published.headline, description: published.standfirst, path: `/stories/${published.slug}`, image: published.image_url, publishedTime: published.published_at, modifiedTime: published.updated_at, sections: publishedTopics(published) });

  return <main>
    <InteriorHeader />
    <JsonLd data={structuredData} />
    <ArticleTemplate article={article} sharePath={`/stories/${published.slug}`} />
    <EditorialPageEnd newsletterId="article-digest-email" stories={related} description="Keep exploring this topic." />
  </main>;
}
