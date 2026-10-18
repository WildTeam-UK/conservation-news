import type { Metadata } from 'next';
import Link from 'next/link';
import { DigestTemplate } from '@/components/digest-template';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { getPublishedDailyDigests, getPublishedDigest, type DigestContent } from '@/lib/digests';

export const dynamic = 'force-dynamic';

async function edition(date: string) {
  const digest = await getPublishedDigest('daily', date);
  if (!digest) return null;
  return { digest, stories: digest.generation_metadata.digest_source_stories ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const result = await edition((await params).date);
  if (!result) return { title: 'Daily digest not found | WILDNEWS' };
  const content = result.digest.generation_metadata.digest_content;
  return { title: `${content?.seo_title ?? result.digest.headline} | WILDNEWS`, description: content?.seo_description ?? result.digest.standfirst };
}

export default async function DailyDigestPage({ params }: { params: Promise<{ date: string }> }) {
  const [result, moreDigests] = await Promise.all([edition((await params).date), getPublishedDailyDigests(4)]);
  const content = result?.digest.generation_metadata.digest_content as DigestContent | undefined;
  if (!result || !content) return <main className="missing shell"><h1>Daily digest not found</h1><Link href="/">Back to WildNews</Link></main>;
  return <main><InteriorHeader /><DigestTemplate content={content} stories={result.stories} periodEnd={result.digest.digest_period_end} imageUrl={result.digest.image_url} imageAlt={result.digest.image_alt} moreDigests={moreDigests} /><SiteFooter /></main>;
}

