/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { digestPath, getPublishedWeeklyDigests } from '@/lib/digests';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Weekly conservation news digest | WILDNEWS', description: 'A connected weekly briefing on the conservation stories, evidence and developments that matter.' };

export default async function WeeklyDigestArchive() {
  const digests = await getPublishedWeeklyDigests();
  return <main className="archive-page weekly-digest-archive">
    <InteriorHeader />
    <section className="topic-page-hero shell">
      <div className="archive-tag-pill">Weekly digest</div>
      <h1>The week in conservation</h1>
      <p>A connected Friday briefing that draws together the most important conservation reporting, evidence and developments from the week.</p>
      <span>{digests.length} {digests.length === 1 ? 'edition' : 'editions'}</span>
    </section>
    {digests.length ? <section className="topic-page-grid shell">
      {digests.map((digest, index) => {
        const date = digest.slug.replace('weekly-digest-', '');
        const path = digestPath('weekly', date);
        return <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={digest.id}>
          <a className="topic-story-image" href={path} aria-label={`Read: ${digest.headline}`}>{digest.image_url ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></> : null}</a>
          <div><span className="archive-tag-pill">Weekly digest</span><h2><a href={path}>{digest.headline}</a></h2><p>{digest.standfirst}</p><a className="text-link" href={path}>Read this edition <ArrowRight /></a></div>
        </article>;
      })}
    </section> : <section className="digest-archive-empty shell"><h2>The first weekly edition is being prepared</h2><p>Friday&apos;s digest will appear here once it has been reviewed and published.</p></section>}
    <SiteFooter />
  </main>;
}
