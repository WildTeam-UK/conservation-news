import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigestTemplate } from '@/components/digest-template';
import { InteriorHeader } from '@/components/interior-header';
import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { cleanDigestText, getPublishedDigest, type DigestContent } from '@/lib/digests';
import { articleMetadata, newsArticleJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const date = (await params).date;
  const digest = await getPublishedDigest('weekly', date);
  if (!digest) return { title: 'Weekly digest not found | WILDNEWS', robots: { index: false, follow: false } };
  const content = digest.generation_metadata.digest_content;
  const title = `${cleanDigestText(content?.seo_title ?? digest.headline)} | WILDNEWS`;
  const description = cleanDigestText(content?.seo_description ?? digest.standfirst);
  return articleMetadata({ title, description, path: `/weekly-digest/${date}`, image: digest.image_url, imageAlt: digest.image_alt, publishedTime: digest.published_at });
}

export default async function WeeklyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const date = (await params).date;
  const digest = await getPublishedDigest('weekly', date);
  const content = digest?.generation_metadata.digest_content as DigestContent | undefined;
  if (!digest || !content) notFound();
  const path = `/weekly-digest/${date}`;
  const structuredData = newsArticleJsonLd({ headline: digest.headline, description: digest.standfirst, path, image: digest.image_url, publishedTime: digest.published_at, sections: content.topics });
  return <main><InteriorHeader /><JsonLd data={structuredData} /><DigestTemplate content={content} stories={digest.generation_metadata.digest_source_stories ?? []} periodEnd={digest.digest_period_end} imageUrl={digest.image_url} imageAlt={digest.image_alt} sharePath={path} /><SiteFooter /></main>;
}

