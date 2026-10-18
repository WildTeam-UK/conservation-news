/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import { cleanDigestText, digestPath, getPublishedDailyDigests, getPublishedWeeklyDigests, type DigestStoryRecord, type DigestType } from '@/lib/digests';
import { getPublishedStories, publishedStoryToListing } from '@/lib/published-stories';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Daily and weekly conservation news digests | WILDNEWS',
  description: 'Explore connected daily and weekly WILDNEWS briefings covering the conservation stories, evidence and developments that matter.',
};

const digestDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' });

function DigestArchiveSection({ title, description, type, digests }: { title: string; description: string; type: DigestType; digests: DigestStoryRecord[] }) {
  return <section className="digest-archive-section shell" id={type}>
    <div className="section-heading"><h2>{title}</h2><p>{description}</p></div>
    {digests.length ? <div className="topic-page-grid">
      {digests.map((digest, index) => {
        const date = digest.slug.replace(`${type}-digest-`, '');
        const path = digestPath(type, date);
        return <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={digest.id}>
          <a className="topic-story-image" href={path} aria-label={`Read: ${cleanDigestText(digest.headline)}`}>{digest.image_url ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></> : null}</a>
          <div><span className="archive-tag-pill">{type === 'weekly' ? 'Weekly digest' : 'Daily digest'}</span><time dateTime={digest.digest_period_end}>{digestDate.format(new Date(digest.digest_period_end))}</time><h2><a href={path}>{cleanDigestText(digest.headline)}</a></h2><p>{cleanDigestText(digest.standfirst)}</p><a className="text-link" href={path}>Read this edition <ArrowRight /></a></div>
        </article>;
      })}
    </div> : <div className="digest-archive-empty"><h3>No {type} editions yet</h3><p>The first published {type} digest will appear here.</p></div>}
  </section>;
}

export default async function DigestArchive() {
  const [daily, weekly, published] = await Promise.all([getPublishedDailyDigests(60), getPublishedWeeklyDigests(52), getPublishedStories(24)]);
  const latestStories = published.filter((story) => story.content_type === 'news').slice(0, 6).map(publishedStoryToListing);

  return <main className="archive-page digest-archive-page">
    <InteriorHeader />
    <section className="topic-page-hero shell">
      <div className="archive-tag-pill">Daily + weekly</div>
      <h1>WildNews digests</h1>
      <p>Connected editorial briefings that make a large and fragmented field easier to follow, with daily context and a deeper Friday view of the week.</p>
      <span>{daily.length + weekly.length} {daily.length + weekly.length === 1 ? 'edition' : 'editions'}</span>
      <nav className="digest-archive-jump" aria-label="Digest archive sections"><a href="#daily">Daily digests</a><a href="#weekly">Weekly digests</a></nav>
    </section>
    <DigestArchiveSection title="Daily digests" description="The essential conservation developments and connections from each day." type="daily" digests={daily} />
    <DigestArchiveSection title="Weekly digests" description="A deeper Friday briefing drawing together the most important developments of the week." type="weekly" digests={weekly} />
    <SimilarStories stories={latestStories} description="Explore the latest reporting behind the briefings." />
    <SiteFooter />
  </main>;
}
