import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigestTemplate } from '@/components/digest-template';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { getPublishedDailyDigests, type DigestContent, type DigestSourceStory } from '@/lib/digests';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private full-page digest preview | WILDNEWS', robots: { index: false, follow: false } };

type DigestMetadata = {
  digest_content?: DigestContent;
  digest_source_stories?: DigestSourceStory[];
};

export default async function FullDigestPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireContentAdmin();
  const { data: story, error } = await supabase.from('stories')
    .select('image_url, image_alt, digest_period_end, generation_metadata')
    .eq('id', id)
    .in('content_type', ['daily_digest', 'weekly_digest'])
    .maybeSingle();
  if (error || !story) notFound();

  const metadata = story.generation_metadata as DigestMetadata;
  if (!metadata.digest_content) notFound();
  const moreDigests = metadata.digest_content.digest_type === 'daily' ? await getPublishedDailyDigests(4) : [];

  return <main>
    <InteriorHeader />
    <DigestTemplate content={metadata.digest_content} stories={metadata.digest_source_stories ?? []} periodEnd={story.digest_period_end} imageUrl={story.image_url} imageAlt={story.image_alt} moreDigests={moreDigests} />
    <SiteFooter />
  </main>;
}
