/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleTemplate } from '@/components/article-template';
import { InteriorHeader } from '@/components/interior-header';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import { getPublishedStories, getPublishedStory, publishedStoryToArticle, publishedStoryToListing, relatedPublishedStories } from '@/lib/published-stories';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (!published) return { title: 'Story not found | WILDNEWS' };

  const content = published.generation_metadata.article_content as { seo_title?: string; seo_description?: string } | undefined;
  const title = content?.seo_title || published.headline;
  const description = content?.seo_description || published.standfirst;
  const images = published.image_url ? [{ url: published.image_url }] : [];
  return { title: `${title} | WILDNEWS`, description, openGraph: { title, description, images }, twitter: { card: 'summary_large_image', title, description, images: images.map((image) => image.url) } };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const published = await getPublishedStory(slug);
  if (!published) return <main className="missing shell"><h1>Story not found</h1><Link href="/">Back to WildNews</Link></main>;

  const allPublished = await getPublishedStories(20);
  const related = relatedPublishedStories([published], allPublished).map(publishedStoryToListing);

  return <main>
    <InteriorHeader actionHref="#sources" actionLabel="View sources" />
    <ArticleTemplate article={publishedStoryToArticle(published)} />
    <SimilarStories stories={related} description="Keep exploring this topic." />
    <SiteFooter />
  </main>;
}
