/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { WeeklyDigestNewsletterCta } from '@/components/newsletter-cta';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import { cleanDigestText, digestPath, getPublishedDailyDigests, getPublishedWeeklyDigests, type DigestStoryRecord, type DigestType } from '@/lib/digests';
import { getGoodNewsSettings, getPublishedStories, publishedStoryToListing } from '@/lib/published-stories';
import { InlineBrand } from '@/components/inline-brand';
import { DigestTag } from '@/components/digest-tag';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Daily and weekly conservation news digests | WILDNEWS',
  description: 'Explore connected daily and weekly WILDNEWS briefings covering the conservation stories, evidence and developments that matter.',
};

const digestDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' });

function digestType(digest: DigestStoryRecord): DigestType {
  return digest.content_type === 'weekly_digest' ? 'weekly' : 'daily';
}

export default async function DigestArchive() {
  const [daily, weekly, published, goodNewsSettings] = await Promise.all([getPublishedDailyDigests(60), getPublishedWeeklyDigests(52), getPublishedStories(24), getGoodNewsSettings()]);
  const digests = [...daily, ...weekly].sort((a, b) => new Date(b.published_at ?? b.digest_period_end).getTime() - new Date(a.published_at ?? a.digest_period_end).getTime());
  const latestStories = published.filter((story) => story.content_type === 'news').slice(0, 6).map((story) => publishedStoryToListing(story, goodNewsSettings));

  return <main className="archive-page digest-archive-page">
    <InteriorHeader />
    <section className="topic-page-hero shell">
      <div className="archive-tag-pill">Daily + weekly</div>
      <h1><InlineBrand text="WILDNEWS" /> digests</h1>
      <p>Connected editorial briefings that make a large and fragmented field easier to follow, with daily context and a deeper Friday view of the week.</p>
      <span>{digests.length} {digests.length === 1 ? 'edition' : 'editions'}</span>
    </section>
    {digests.length ? <section className="topic-page-grid shell">
      {digests.map((digest, index) => {
        const type = digestType(digest);
        const date = digest.slug.replace(`${type}-digest-`, '');
        const path = digestPath(type, date);
        return <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={digest.id}>
          <a className="topic-story-image" href={path} aria-label={`Read: ${cleanDigestText(digest.headline)}`}>{digest.image_url ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></> : null}</a>
          <div>
            <div className="digest-archive-meta"><DigestTag type={type} /><time dateTime={digest.digest_period_end}>{digestDate.format(new Date(digest.digest_period_end))}</time></div>
            <h2><a href={path}>{cleanDigestText(digest.headline)}</a></h2>
            {index === 0 ? <p>{cleanDigestText(digest.standfirst)}</p> : null}
            <a className="text-link" href={path}>Read this edition <ArrowRight /></a>
          </div>
        </article>;
      })}
    </section> : <div className="digest-archive-empty shell"><h3>No digest editions yet</h3><p>The first published digest will appear here.</p></div>}
    <WeeklyDigestNewsletterCta id="digest-archive-email" className="editorial-newsletter-cta shell" />
    <SimilarStories stories={latestStories} description="Explore the latest reporting behind the briefings." />
    <SiteFooter />
  </main>;
}
