import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigestTemplate } from '@/components/digest-template';
import { InteriorHeader } from '@/components/interior-header';
import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { cleanDigestText, getPublishedDailyDigests, getPublishedDigest, type DigestContent } from '@/lib/digests';
import { articleMetadata, newsArticleJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

async function edition(date: string) {
  const digest = await getPublishedDigest('daily', date);
  if (!digest) return null;
  return { digest, stories: digest.generation_metadata.digest_source_stories ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const date = (await params).date;
  const result = await edition(date);
  if (!result) return { title: 'Daily digest not found | WILDNEWS', robots: { index: false, follow: false } };
  const content = result.digest.generation_metadata.digest_content;
  const title = `${cleanDigestText(content?.seo_title ?? result.digest.headline)} | WILDNEWS`;
  const description = cleanDigestText(content?.seo_description ?? result.digest.standfirst);
  return articleMetadata({ title, description, path: `/daily-digest/${date}`, image: result.digest.image_url, imageAlt: result.digest.image_alt, publishedTime: result.digest.published_at });
}

export default async function DailyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const date = (await params).date;
  const [result, moreDigests] = await Promise.all([edition(date), getPublishedDailyDigests(7)]);
  const content = result?.digest.generation_metadata.digest_content as DigestContent | undefined;
  if (!result || !content) notFound();
  const path = `/daily-digest/${date}`;
  const structuredData = newsArticleJsonLd({ headline: result.digest.headline, description: result.digest.standfirst, path, image: result.digest.image_url, publishedTime: result.digest.published_at, sections: content.topics });
  return <main><InteriorHeader /><JsonLd data={structuredData} /><DigestTemplate content={content} stories={result.stories} periodEnd={result.digest.digest_period_end} imageUrl={result.digest.image_url} imageAlt={result.digest.image_alt} moreDigests={moreDigests} sharePath={path} /><SiteFooter /></main>;
}

