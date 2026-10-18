import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { digestPath, getPublishedWeeklyDigests } from '@/lib/digests';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Weekly conservation news digest | WILDNEWS', description: 'A connected weekly briefing on the conservation stories, evidence and developments that matter.' };

export default async function WeeklyDigestArchive() {
  const digests = await getPublishedWeeklyDigests();
  return <main className="weekly-digest-archive"><InteriorHeader /><header className="topic-page-hero shell"><div className="digest-edition-label"><CalendarDays /> Weekly digest</div><h1>The week in conservation</h1><p>A connected Friday briefing that draws together the most important conservation reporting, evidence and developments from the week.</p></header><section className="shell weekly-digest-list">{digests.length ? digests.map((digest) => { const date = digest.slug.replace('weekly-digest-', ''); return <article key={digest.id}>{digest.image_url ? <Link className="weekly-digest-image" href={digestPath('weekly', date)}>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></Link> : null}<div><time>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(new Date(digest.digest_period_end))}</time><h2><Link href={digestPath('weekly', date)}>{digest.headline}</Link></h2><p>{digest.standfirst}</p><Link className="read-more-button" href={digestPath('weekly', date)}>Read this edition <ArrowRight /></Link></div></article>; }) : <div className="digest-archive-empty"><CalendarDays /><h2>The first weekly edition is being prepared</h2><p>Friday&apos;s digest will appear here once it has been reviewed and published.</p></div>}</section><SiteFooter /></main>;
}
