import type { Metadata } from 'next';
import { CalendarClock, CircleAlert, PauseCircle } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { PublicationSettings } from '@/components/publication-settings';
import { QueueItemActions } from '@/components/queue-item-actions';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Publishing queue | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type QueueItem = {
  id: string;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  hold_reason: string | null;
  last_error: string | null;
  stories: { id: string; headline: string; slug: string; status: string } | { id: string; headline: string; slug: string; status: string }[] | null;
};

function storyFor(item: QueueItem) {
  return Array.isArray(item.stories) ? item.stories[0] : item.stories;
}

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });

export default async function PublicationQueuePage() {
  const { supabase, admin } = await requireContentAdmin();
  const [{ data: settings, error: settingsError }, { data: queue, error: queueError }] = await Promise.all([
    supabase.from('editorial_run_settings').select('auto_publish_enabled, publish_window_start, publish_window_end, max_auto_publishes_per_day, min_auto_publish_overall_score, min_auto_publish_evidence_score').eq('id', true).single(),
    supabase.from('publication_queue').select('id, status, scheduled_for, published_at, hold_reason, last_error, stories(id, headline, slug, status)').order('scheduled_for', { ascending: true, nullsFirst: false }).limit(250),
  ]);
  if (settingsError) throw new Error('Unable to load automatic publishing settings.');
  if (queueError) throw new Error('Unable to load the publishing queue.');
  const items = (queue ?? []) as QueueItem[];
  const upcoming = items.filter((item) => ['queued', 'scheduled', 'publishing'].includes(item.status));
  const held = items.filter((item) => item.status === 'held');
  const recent = items.filter((item) => item.status === 'published').sort((a, b) => Date.parse(b.published_at ?? '') - Date.parse(a.published_at ?? '')).slice(0, 20);
  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
      <AdminNav active="queue" />
      <div className="admin-shell admin-queue-shell">
        <section className="admin-welcome candidates-heading">
          <div><p className="eyebrow">Publication control</p><h1>Publishing queue</h1><p>Control when complete articles go live and see exactly what is scheduled, held back or recently published.</p></div>
          <div className="candidate-summary"><CalendarClock /><strong>{upcoming.length}</strong><span>upcoming</span></div>
        </section>

        <PublicationSettings
          enabled={settings.auto_publish_enabled}
          windowStart={settings.publish_window_start}
          windowEnd={settings.publish_window_end}
          dailyMaximum={settings.max_auto_publishes_per_day}
          minimumOverall={settings.min_auto_publish_overall_score}
          minimumEvidence={settings.min_auto_publish_evidence_score}
        />

        <section className="queue-section">
          <div className="source-list-heading"><div><p className="eyebrow">Coming up</p><h2>{upcoming.length} scheduled {upcoming.length === 1 ? 'article' : 'articles'}</h2></div><p>Times are varied within your publishing window. Newly queued work may rebalance future slots, but anything due within five minutes stays fixed.</p></div>
          {upcoming.length ? <div className="queue-list">{upcoming.map((item) => { const story = storyFor(item); return story ? <article key={item.id}><span className={`run-status ${item.status}`}>{item.status}</span><div><strong>{story.headline}</strong><small>{item.scheduled_for ? dateTime.format(new Date(item.scheduled_for)) : 'Waiting for a publishing slot'}</small></div><QueueItemActions queueId={item.id} storyId={story.id} /></article> : null; })}</div> : <div className="queue-empty"><CalendarClock /><h3>No articles are waiting</h3><p>Complete drafts will appear here automatically when publishing is enabled.</p></div>}
        </section>

        <section className="queue-section">
          <div className="source-list-heading"><div><p className="eyebrow">Needs attention</p><h2>{held.length} held {held.length === 1 ? 'article' : 'articles'}</h2></div><p>Held articles stay private. Their reason is recorded so they can be corrected without interrupting the rest of the queue.</p></div>
          {held.length ? <div className="queue-list held">{held.map((item) => { const story = storyFor(item); return story ? <article key={item.id}><span className="queue-alert"><CircleAlert /></span><div><strong>{story.headline}</strong><small>{item.hold_reason || item.last_error || 'Held for editorial review.'}</small></div><QueueItemActions queueId={item.id} storyId={story.id} held /></article> : null; })}</div> : <div className="queue-empty compact"><PauseCircle /><p>Nothing is being held back.</p></div>}
        </section>

        {recent.length ? <section className="queue-section"><div className="source-list-heading"><div><p className="eyebrow">Recently automated</p><h2>Published from the queue</h2></div></div><div className="queue-list recent">{recent.map((item) => { const story = storyFor(item); return story ? <article key={item.id}><span className="run-status published">published</span><div><strong>{story.headline}</strong><small>{item.published_at ? dateTime.format(new Date(item.published_at)) : ''}</small></div><a href={`/stories/${story.slug}`} target="_blank" rel="noreferrer">View live</a></article> : null; })}</div></section> : null}
      </div>
    </main>
  );
}
