import type { Metadata } from 'next';
import Link from 'next/link';
import { DigestTemplate } from '@/components/digest-template';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { getPublishedDigest, type DigestContent } from '@/lib/digests';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const digest = await getPublishedDigest('weekly', (await params).date);
  if (!digest) return { title: 'Weekly digest not found | WILDNEWS' };
  const content = digest.generation_metadata.digest_content;
  return { title: `${content?.seo_title ?? digest.headline} | WILDNEWS`, description: content?.seo_description ?? digest.standfirst };
}

export default async function WeeklyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const digest = await getPublishedDigest('weekly', (await params).date);
  const content = digest?.generation_metadata.digest_content as DigestContent | undefined;
  if (!digest || !content) return <main className="missing shell"><h1>Weekly digest not found</h1><Link href="/weekly-digest">Back to weekly digests</Link></main>;
  return <main><InteriorHeader /><DigestTemplate content={content} stories={digest.generation_metadata.digest_source_stories ?? []} periodEnd={digest.digest_period_end} imageUrl={digest.image_url} imageAlt={digest.image_alt} /><SiteFooter /></main>;
}

