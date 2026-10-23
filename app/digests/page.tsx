/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { EditorialArchiveCard } from '@/components/editorial-archive-card';
import { EditorialPageEnd } from '@/components/editorial-page-end';
import { ArchiveHero } from '@/components/archive-hero';
import { InteriorHeader } from '@/components/interior-header';
import { cleanDigestText, digestPath, getPublishedDailyDigests, getPublishedWeeklyDigests, type DigestStoryRecord, type DigestType } from '@/lib/digests';
import { getGoodNewsSettings, getPublishedStories, publishedStoryToListing } from '@/lib/published-stories';
import { InlineBrand } from '@/components/inline-brand';
import { DigestTag } from '@/components/digest-tag';
import { pageMetadata } from '@/lib/seo';
import { londonLongDateFormatter } from '@/lib/date-format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = pageMetadata({
  title: 'Daily and weekly conservation news digests | WILDNEWS',
  description: 'Explore connected daily and weekly WILDNEWS briefings covering the conservation stories, evidence and developments that matter.',
  path: '/digests',
});

function digestType(digest: DigestStoryRecord): DigestType {
  return digest.content_type === 'weekly_digest' ? 'weekly' : 'daily';
}

export default async function DigestArchive() {
  const [daily, weekly, published, goodNewsSettings] = await Promise.all([getPublishedDailyDigests(60), getPublishedWeeklyDigests(52), getPublishedStories(24), getGoodNewsSettings()]);
  const digests = [...daily, ...weekly].sort((a, b) => new Date(b.published_at ?? b.digest_period_end).getTime() - new Date(a.published_at ?? a.digest_period_end).getTime());
  const latestStories = published.filter((story) => story.content_type === 'news').slice(0, 6).map((story) => publishedStoryToListing(story, goodNewsSettings));

  return <main className="archive-page digest-archive-page">
    <InteriorHeader />
    <ArchiveHero
      label={<div className="digest-archive-type-tags"><DigestTag type="daily" /><DigestTag type="weekly" /></div>}
      title={<><InlineBrand text="WILDNEWS" /> digests</>}
      description="Connected editorial briefings that make a large and fragmented field easier to follow, with daily context and a deeper Friday view of the week."
      descriptionLink={<a href="#digest-archive-newsletter">Subscribe to the <InlineBrand text="WILDNEWS" /> weekly <ArrowRight /></a>}
      meta={`${digests.length} ${digests.length === 1 ? 'edition' : 'editions'}`}
    />
    {digests.length ? <section className="topic-page-grid shell">
      {digests.map((digest, index) => {
        const type = digestType(digest);
        const date = digest.slug.replace(`${type}-digest-`, '');
        const path = digestPath(type, date);
        return <EditorialArchiveCard
          featured={index === 0}
          href={path}
          image={digest.image_url}
          imageAlt={digest.image_alt ?? ''}
          labels={<div className="digest-archive-meta"><DigestTag type={type} /><time dateTime={digest.digest_period_end}>{londonLongDateFormatter.format(new Date(digest.digest_period_end))}</time></div>}
          title={cleanDigestText(digest.headline)}
          summary={index === 0 ? cleanDigestText(digest.standfirst) : null}
          linkLabel="Read this edition"
          key={digest.id}
        />;
      })}
    </section> : <div className="digest-archive-empty shell"><h3>No digest editions yet</h3><p>The first published digest will appear here.</p></div>}
    <EditorialPageEnd newsletterId="digest-archive-email" newsletterAnchorId="digest-archive-newsletter" stories={latestStories} description="Explore the latest reporting behind the briefings." />
  </main>;
}
