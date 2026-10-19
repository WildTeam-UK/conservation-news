/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh the protected Supabase session in Vinext */
import type { Metadata } from 'next';
import { Activity, AlertTriangle, ArrowRight, Bot, CalendarClock, CheckCircle2, FileText, Newspaper, Radio, Rss } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DailyEditorialRun } from '@/components/daily-editorial-run';
import { RunCollectionButton } from '@/components/run-collection-button';
import { buildAdminProfile } from '@/lib/admin-profile';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Overview | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type QueueStory = { id: string; headline: string };
type QueueOverviewItem = {
  id: string;
  status: string;
  scheduled_for: string | null;
  hold_reason: string | null;
  stories: QueueStory | QueueStory[] | null;
};

function queueStory(item: QueueOverviewItem) {
  return Array.isArray(item.stories) ? item.stories[0] : item.stories;
}

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
const timeOnly = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const greetings = [
  { text: 'Hey', language: 'English', lang: 'en' },
  { text: 'Bonjour', language: 'French', lang: 'fr' },
  { text: 'Hola', language: 'Spanish', lang: 'es' },
  { text: 'Ciao', language: 'Italian', lang: 'it' },
  { text: 'Olá', language: 'Portuguese', lang: 'pt' },
  { text: 'Hallo', language: 'German', lang: 'de' },
  { text: 'Hoi', language: 'Dutch', lang: 'nl' },
  { text: 'Hej', language: 'Swedish', lang: 'sv' },
  { text: 'Ahoj', language: 'Czech', lang: 'cs' },
  { text: 'Cześć', language: 'Polish', lang: 'pl' },
  { text: 'Merhaba', language: 'Turkish', lang: 'tr' },
  { text: 'Habari', language: 'Swahili', lang: 'sw' },
  { text: 'Kia ora', language: 'Māori', lang: 'mi' },
  { text: 'Sawubona', language: 'Zulu', lang: 'zu' },
  { text: 'नमस्ते', language: 'Hindi', lang: 'hi' },
  { text: 'こんにちは', language: 'Japanese', lang: 'ja' },
  { text: '안녕하세요', language: 'Korean', lang: 'ko' },
  { text: '你好', language: 'Mandarin Chinese', lang: 'zh' },
  { text: 'Γεια', language: 'Greek', lang: 'el' },
  { text: 'Привіт', language: 'Ukrainian', lang: 'uk' },
] as const;

export default async function AdminDashboard() {
  const { supabase, user, admin } = await requireContentAdmin();
  const [draftsResult, publishedResult, sourcesResult, itemsResult, candidatesResult, queueResult, heldResult, sourceErrorsResult, taxonomyReviewResult, settingsResult, editorialRunsResult, activeRunResult, ingestionRunsResult] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('source_items').select('*', { count: 'exact', head: true }),
    supabase.from('story_clusters').select('*', { count: 'exact', head: true }).eq('status', 'selected'),
    supabase.from('publication_queue').select('id, status, scheduled_for, hold_reason, stories(id, headline)').in('status', ['queued', 'scheduled', 'publishing']).order('scheduled_for', { ascending: true, nullsFirst: false }),
    supabase.from('publication_queue').select('id, status, scheduled_for, hold_reason, stories(id, headline)').eq('status', 'held').order('updated_at', { ascending: false }),
    supabase.from('sources').select('id, name, last_error').eq('enabled', true).not('last_error', 'is', null),
    supabase.from('stories').select('id, headline, taxonomy_review_reason', { count: 'exact' }).eq('taxonomy_review_required', true).order('updated_at', { ascending: false }).limit(4),
    supabase.from('editorial_run_settings').select('max_new_drafts, max_estimated_cost_usd, automation_enabled, daily_run_time, automation_timezone, last_automation_tick_at, last_automation_error, auto_publish_enabled, publish_window_start, publish_window_end, max_auto_publishes_per_day').eq('id', true).maybeSingle(),
    supabase.from('editorial_runs').select('id, trigger_type, status, max_new_drafts, estimated_cost_usd, drafts_created, candidates_selected, failures, created_at, completed_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('editorial_runs').select('id').eq('status', 'running').maybeSingle(),
    supabase.from('ingestion_runs').select('id, status, sources_checked, items_found, items_new, error_summary, created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  const settings = settingsResult.data;
  const upcoming = (queueResult.data ?? []) as QueueOverviewItem[];
  const held = (heldResult.data ?? []) as QueueOverviewItem[];
  const sourceErrors = sourceErrorsResult.data ?? [];
  const taxonomyReviews = taxonomyReviewResult.data ?? [];
  const latestEditorialRun = editorialRunsResult.data?.[0];
  const latestIngestionRun = ingestionRunsResult.data?.[0];
  const nextItem = upcoming.find((item) => item.scheduled_for);
  const nextStory = nextItem ? queueStory(nextItem) : null;
  const attentionCount = held.length + sourceErrors.length + (taxonomyReviewResult.count ?? 0) + (settings?.last_automation_error ? 1 : 0);
  const automationHealthy = Boolean(settings?.automation_enabled && settings?.auto_publish_enabled && !settings?.last_automation_error && !taxonomyReviewResult.count);
  const profile = await buildAdminProfile(user, admin);
  // This is a dynamic server-rendered page, so a fresh greeting is intentionally chosen per request.
  // oxlint-disable-next-line react/react-compiler
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  return (
    <main className="admin-page">
      <AdminHeader />
      <AdminNav active="dashboard" />

      <div className="admin-shell admin-overview-shell">
        <section className="overview-heading" aria-labelledby="admin-heading">
          <div><p className="eyebrow">Editorial overview</p><h1 id="admin-heading"><span className="overview-greeting" lang={greeting.lang} title={`${greeting.language} greeting`}>{greeting.text}</span> {profile.greetingName}, here&apos;s everything at a glance.</h1></div>
          <p className="overview-heading-description">The routine work is automated. This page shows what is moving, what publishes next and where you may need to step in.</p>
          <div className={`overview-health-pill ${automationHealthy ? 'healthy' : 'attention'}`}>{automationHealthy ? <CheckCircle2 /> : <AlertTriangle />}<span><strong>{automationHealthy ? 'System healthy' : 'Check system'}</strong><small>{attentionCount ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention` : 'No action needed'}</small></span></div>
        </section>

        <section className="overview-system-grid" aria-label="Automation health">
          <article><span className={`overview-card-icon ${settings?.automation_enabled ? 'healthy' : ''}`}><Bot /></span><div><p className="eyebrow">Daily workflow</p><h2>{settings?.automation_enabled ? 'Running automatically' : 'Paused'}</h2><p>Next scheduled run at {String(settings?.daily_run_time ?? '10:00').slice(0, 5)} UK time.</p></div><strong>{latestEditorialRun?.drafts_created ?? 0}<small>drafts last run</small></strong></article>
          <article><span className={`overview-card-icon ${settings?.auto_publish_enabled ? 'healthy' : ''}`}><CalendarClock /></span><div><p className="eyebrow">Publishing</p><h2>{settings?.auto_publish_enabled ? 'Publishing automatically' : 'Paused'}</h2><p>{String(settings?.publish_window_start ?? '08:00').slice(0, 5)}–{String(settings?.publish_window_end ?? '20:00').slice(0, 5)} · up to {settings?.max_auto_publishes_per_day ?? 10} per day.</p></div><strong>{upcoming.length}<small>coming up</small></strong></article>
          <article><span className={`overview-card-icon ${sourceErrors.length ? 'warning' : 'healthy'}`}><Rss /></span><div><p className="eyebrow">Source network</p><h2>{sourceErrors.length ? `${sourceErrors.length} source warning${sourceErrors.length === 1 ? '' : 's'}` : 'All sources responding'}</h2><p>{sourcesResult.count ?? 0} active sources · last check found {latestIngestionRun?.items_new ?? 0} new items.</p></div><strong>{latestIngestionRun?.sources_checked ?? 0}<small>checked last run</small></strong></article>
        </section>

        <section className="overview-flow" aria-labelledby="flow-heading">
          <div className="overview-section-heading"><div><p className="eyebrow">Content flow</p><h2 id="flow-heading">From source to publication</h2></div><p>Live totals show where content currently sits in the system.</p></div>
          <div className="overview-flow-track">
            <a href="/admin/collected"><span><Radio /></span><strong>{itemsResult.count ?? 0}</strong><small>Collected</small></a><ArrowRight />
            <a href="/admin/candidates"><span><Activity /></span><strong>{candidatesResult.count ?? 0}</strong><small>Candidates</small></a><ArrowRight />
            <a href="/admin/drafts?view=drafts"><span><FileText /></span><strong>{draftsResult.count ?? 0}</strong><small>Drafts</small></a><ArrowRight />
            <a href="/admin/queue"><span><CalendarClock /></span><strong>{upcoming.length}</strong><small>Scheduled</small></a><ArrowRight />
            <a href="/admin/drafts?view=published"><span><Newspaper /></span><strong>{publishedResult.count ?? 0}</strong><small>Published</small></a>
          </div>
        </section>

        <div className="overview-columns">
          <section className="overview-panel overview-next">
            <div className="overview-section-heading"><div><p className="eyebrow">Publishing next</p><h2>{nextItem?.scheduled_for ? `Next at ${timeOnly.format(new Date(nextItem.scheduled_for))}` : 'No article scheduled'}</h2></div><a href="/admin/queue">View schedule <ArrowRight /></a></div>
            {upcoming.length ? <div className="overview-next-list">{upcoming.slice(0, 5).map((item) => { const story = queueStory(item); return story ? <article key={item.id}><time>{item.scheduled_for ? dateTime.format(new Date(item.scheduled_for)) : 'Waiting for a slot'}</time><strong>{story.headline}</strong><span className={`run-status ${item.status}`}>{item.status}</span></article> : null; })}</div> : <div className="overview-calm-state"><CalendarClock /><p>There is nothing waiting in the publishing queue.</p></div>}
            {nextStory ? <p className="overview-next-note">Next article: <strong>{nextStory.headline}</strong></p> : null}
          </section>

          <section className="overview-panel overview-attention">
            <div className="overview-section-heading"><div><p className="eyebrow">Needs attention</p><h2>{attentionCount ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} to review` : 'Everything looks good'}</h2></div></div>
            {attentionCount ? <div className="overview-alert-list">
              {settings?.last_automation_error ? <article><AlertTriangle /><div><strong>Automation warning</strong><p>{settings.last_automation_error}</p></div></article> : null}
              {taxonomyReviews.map((story) => <article key={story.id}><AlertTriangle /><div><strong>{story.headline}</strong><p>{story.taxonomy_review_reason ?? 'Choose a controlled topic before this article can publish.'} <a href={`/admin/drafts/${story.id}`}>Review article</a></p></div></article>)}
              {held.slice(0, 4).map((item) => { const story = queueStory(item); return <article key={item.id}><CalendarClock /><div><strong>{story?.headline ?? 'Held article'}</strong><p>{item.hold_reason ?? 'Held for editorial review.'}</p></div></article>; })}
              {sourceErrors.slice(0, 4).map((source) => <article key={source.id}><Rss /><div><strong>{source.name}</strong><p>{source.last_error}</p></div></article>)}
            </div> : <div className="overview-calm-state"><CheckCircle2 /><p>No held articles, taxonomy reviews, source errors or automation warnings.</p></div>}
          </section>
        </div>

        <details className="overview-activity">
          <summary><span><Activity /><span><strong>Recent editorial runs</strong><small>Latest run: {latestEditorialRun?.drafts_created ?? 0} drafts · ${Number(latestEditorialRun?.estimated_cost_usd ?? 0).toFixed(4)}</small></span></span><span>View history</span></summary>
          <div className="collection-runs">{editorialRunsResult.data?.map((run) => <article key={run.id}><span className={`run-status ${run.status}`}>{run.status.replace('_', ' ')}</span><div><strong>{run.drafts_created} private {run.drafts_created === 1 ? 'draft' : 'drafts'}</strong><p>{run.trigger_type === 'scheduled' ? 'Scheduled' : 'Manual'} · {run.candidates_selected} selected · ${Number(run.estimated_cost_usd).toFixed(4)} estimated{run.failures ? ` · ${run.failures} failed` : ''}</p></div><time dateTime={run.created_at}>{dateTime.format(new Date(run.created_at))}</time></article>)}</div>
        </details>

        <details className="overview-manual-controls">
          <summary><span><strong>Manual controls</strong><small>Run or test individual workflow stages when needed.</small></span><ArrowRight /></summary>
          <div>
            <DailyEditorialRun
              defaultMaxDrafts={settings?.max_new_drafts ?? 10}
              defaultMaxCostUsd={Number(settings?.max_estimated_cost_usd ?? 1)}
              defaultAutomationEnabled={settings?.automation_enabled ?? false}
              defaultDailyRunTime={settings?.daily_run_time ?? '10:00'}
              lastAutomationTickAt={settings?.last_automation_tick_at ?? null}
              lastAutomationError={settings?.last_automation_error ?? null}
              hasActiveRun={Boolean(activeRunResult.data)}
            />
            <section className="collection-panel"><div className="collection-panel-copy"><p className="eyebrow">Manual collection</p><h2>Check every source now</h2><p>Fetch active RSS feeds and save any unseen items without drafting or publishing them.</p></div><div className="collection-panel-actions"><RunCollectionButton /><a href="/admin/collected">View collected items</a></div></section>
          </div>
        </details>
      </div>
    </main>
  );
}
