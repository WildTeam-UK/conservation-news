import type { Metadata } from 'next';
import { CalendarDays, CheckCircle2, Clock3, FileText, PauseCircle } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DigestSettings } from '@/components/digest-settings';
import { DigestRunControls } from '@/components/digest-run-controls';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Digests | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type DigestRun = {
  id: string;
  digest_type: 'daily' | 'weekly';
  trigger_type: 'manual' | 'scheduled' | 'retry';
  status: string;
  period_start: string;
  period_end: string;
  source_story_count: number;
  estimated_cost_usd: number | string;
  social_status: string;
  email_status: string;
  error_summary: string | null;
  story_id: string | null;
  created_at: string;
};

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
const londonCalendarDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });

function previousCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

const defaultSettings = {
  run_time: '14:00',
  automation_enabled: false,
  daily_min_stories: 3,
  daily_max_stories: 10,
  weekly_min_stories: 5,
  weekly_max_stories: 25,
  max_estimated_cost_usd: 0.5,
  publish_immediately: false,
};

export default async function DigestsPage() {
  const { supabase } = await requireContentAdmin();
  const [{ data: settings, error: settingsError }, { data: runs, error: runsError }] = await Promise.all([
    supabase.from('digest_settings').select('*').eq('id', true).single(),
    supabase.from('digest_runs').select('id, digest_type, trigger_type, status, period_start, period_end, source_story_count, estimated_cost_usd, social_status, email_status, error_summary, story_id, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const digestRuns = (runs ?? []) as DigestRun[];
  const latest = digestRuns[0];
  const digestSettings = settings ?? defaultSettings;
  const databaseWarning = settingsError || runsError ? 'The digest tables could not be read yet. Supabase may still be refreshing its schema cache; the rest of the editorial system is unaffected.' : null;

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="digests" />
    <div className="admin-shell admin-digests-shell">
      <section className="admin-welcome candidates-heading">
        <div><p className="eyebrow">Editorial editions</p><h1>Digests</h1><p>Turn the strongest published conservation stories into a connected daily briefing and a deeper Friday edition.</p></div>
        <div className="candidate-summary"><CalendarDays /><strong>{digestRuns.length}</strong><span>recorded runs</span></div>
      </section>

      {databaseWarning ? <div className="digest-database-warning" role="alert">{databaseWarning}</div> : null}

      <section className="digest-overview-grid" aria-label="Digest setup status">
        <article><span><Clock3 /></span><div><small>Planned schedule</small><strong>{String(digestSettings.run_time).slice(0, 5)} UK time</strong><p>Daily, with the weekly edition replacing Friday&apos;s daily edition.</p></div></article>
        <article><span>{digestSettings.automation_enabled ? <CheckCircle2 /> : <PauseCircle />}</span><div><small>Automation</small><strong>{digestSettings.automation_enabled ? 'Enabled' : 'Setup mode'}</strong><p>{digestSettings.automation_enabled ? 'The heartbeat can create due editions.' : 'Nothing will generate automatically yet.'}</p></div></article>
        <article><span><FileText /></span><div><small>Latest edition</small><strong>{latest ? `${latest.digest_type} · ${latest.status}` : 'Not created yet'}</strong><p>{latest ? `${latest.source_story_count} source stories` : 'The first manual test will appear here.'}</p></div></article>
      </section>

      <DigestSettings
        runTime={digestSettings.run_time}
        dailyMinStories={digestSettings.daily_min_stories}
        dailyMaxStories={digestSettings.daily_max_stories}
        weeklyMinStories={digestSettings.weekly_min_stories}
        weeklyMaxStories={digestSettings.weekly_max_stories}
        maxEstimatedCostUsd={Number(digestSettings.max_estimated_cost_usd)}
        publishImmediately={digestSettings.publish_immediately}
      />

      <DigestRunControls latestMissedDate={previousCalendarDate(londonCalendarDate.format(new Date()))} />

      <section className="digest-history">
        <div className="source-list-heading"><div><p className="eyebrow">Audit trail</p><h2>Digest history</h2></div><p>Generation, publication, social and email are tracked independently so a failed distribution can be retried safely.</p></div>
        {digestRuns.length ? <div className="collection-runs digest-run-list">{digestRuns.map((run) => {
          return <article key={run.id}>
            <span className={`run-status ${run.status}`}>{run.status.replace('_', ' ')}</span>
            <div><strong>{run.story_id ? <a href={`/admin/digests/${run.story_id}`}>{run.digest_type === 'weekly' ? 'Weekly digest' : 'Daily digest'}</a> : run.digest_type === 'weekly' ? 'Weekly digest' : 'Daily digest'}</strong><p>{run.source_story_count} stories · ${Number(run.estimated_cost_usd).toFixed(4)} estimated · social {run.social_status} · email {run.email_status}</p>{run.error_summary ? <p className="collection-run-error">{run.error_summary}</p> : null}</div>
            <div className="digest-run-actions">{run.story_id ? <a href={`/admin/digests/${run.story_id}`}>View draft</a> : null}<time dateTime={run.created_at}>{dateTime.format(new Date(run.created_at))}</time></div>
          </article>;
        })}</div> : <div className="queue-empty"><CalendarDays /><h3>No digest runs yet</h3><p>The first manual test will be created after the public digest template is ready.</p></div>}
      </section>
    </div>
  </main>;
}
