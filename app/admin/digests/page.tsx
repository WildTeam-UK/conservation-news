import type { Metadata } from 'next';
import { CalendarDays, CheckCircle2, ChevronDown, Clock3, FileText, Globe2, Mail, PauseCircle, Send, Settings2, Sparkles } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DigestSettings } from '@/components/digest-settings';
import { DigestRunControls } from '@/components/digest-run-controls';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { londonCalendarDateFormatter, londonMediumDateTimeFormatter as dateTime } from '@/lib/date-format';

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
  social_distribution_enabled: false,
  social_distribution_mode: 'queue' as const,
  email_distribution_enabled: false,
  last_automation_error: null,
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
  const workflowActive = digestSettings.automation_enabled && digestSettings.publish_immediately;
  const distributionActive = digestSettings.social_distribution_enabled && digestSettings.email_distribution_enabled;

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="digests" />
    <div className="admin-shell admin-digests-shell">
      <section className="admin-welcome candidates-heading">
        <div><p className="eyebrow">Editorial editions</p><h1>Digests</h1><p>Turn the strongest published conservation stories into a connected daily briefing and a deeper Friday edition.</p></div>
        <div className={`overview-health-pill ${workflowActive && distributionActive && !digestSettings.last_automation_error ? 'healthy' : 'attention'}`}>{workflowActive && distributionActive && !digestSettings.last_automation_error ? <CheckCircle2 /> : <PauseCircle />}<span><strong>{workflowActive && distributionActive ? 'Fully automatic' : 'Review settings'}</strong><small>{latest ? `Latest: ${latest.digest_type} ${latest.status}` : 'No editions yet'}</small></span></div>
      </section>

      {databaseWarning ? <div className="digest-database-warning" role="alert">{databaseWarning}</div> : null}
      {digestSettings.last_automation_error ? <div className="digest-database-warning" role="alert"><strong>Digest automation needs attention.</strong> {digestSettings.last_automation_error}</div> : null}

      <section className="digest-overview-grid" aria-label="Digest setup status">
        <article><span><Clock3 /></span><div><small>Schedule</small><strong>{String(digestSettings.run_time).slice(0, 5)} UK time</strong><p>Daily, with Friday reserved for the weekly edition.</p></div></article>
        <article><span>{workflowActive ? <Globe2 /> : <FileText />}</span><div><small>Workflow</small><strong>{digestSettings.automation_enabled ? digestSettings.publish_immediately ? 'Generate and publish' : 'Generate for review' : 'Paused'}</strong><p>{digestSettings.automation_enabled ? digestSettings.publish_immediately ? 'Completed editions go live automatically.' : 'Completed editions remain private.' : 'No scheduled editions will be created.'}</p></div></article>
        <article><span><Send /></span><div><small>Buffer social</small><strong>{digestSettings.social_distribution_enabled ? digestSettings.social_distribution_mode === 'immediate' ? 'Publish immediately' : 'Add to queue' : 'Paused'}</strong><p>{digestSettings.social_distribution_enabled ? 'Every published daily and weekly edition.' : 'No social posts will be created.'}</p></div></article>
        <article><span><Mail /></span><div><small>Brevo email</small><strong>{digestSettings.email_distribution_enabled ? 'Weekly email enabled' : 'Paused'}</strong><p>{digestSettings.email_distribution_enabled ? 'Friday’s published edition goes to the subscriber list.' : 'No subscriber campaigns will be created.'}</p></div></article>
      </section>

      <details className="admin-control-disclosure digest-settings-disclosure" open={Boolean(digestSettings.last_automation_error)}>
        <summary><span><Settings2 /><span><strong>Automation and delivery settings</strong><small>Schedule, cost limits, publishing, Buffer and Brevo</small></span></span><span className="admin-disclosure-state">{workflowActive && distributionActive ? 'Configured' : 'Review'} <ChevronDown /></span></summary>
        <DigestSettings
          runTime={digestSettings.run_time}
          dailyMinStories={digestSettings.daily_min_stories}
          dailyMaxStories={digestSettings.daily_max_stories}
          weeklyMinStories={digestSettings.weekly_min_stories}
          weeklyMaxStories={digestSettings.weekly_max_stories}
          maxEstimatedCostUsd={Number(digestSettings.max_estimated_cost_usd)}
          automationEnabled={digestSettings.automation_enabled}
          publishImmediately={digestSettings.publish_immediately}
          socialDistributionEnabled={digestSettings.social_distribution_enabled}
          socialDistributionMode={digestSettings.social_distribution_mode === 'immediate' ? 'immediate' : 'queue'}
          emailDistributionEnabled={digestSettings.email_distribution_enabled}
          bufferConfigured={Boolean(process.env.BUFFER_API_KEY?.trim() && process.env.BUFFER_CHANNEL_IDS?.split(',').some((value) => value.trim()))}
          brevoConfigured={Boolean(process.env.BREVO_API_KEY?.trim() && /^\d+$/.test(process.env.BREVO_LIST_ID?.trim() ?? '') && /^\d+$/.test(process.env.BREVO_SENDER_ID?.trim() ?? ''))}
        />
      </details>

      <details className="admin-control-disclosure digest-manual-disclosure">
        <summary><span><Sparkles /><span><strong>Manual generation and recovery</strong><small>Create private test editions or recover a missed daily digest</small></span></span><span className="admin-disclosure-state">Open tools <ChevronDown /></span></summary>
        <DigestRunControls latestMissedDate={previousCalendarDate(londonCalendarDateFormatter.format(new Date()))} />
      </details>

      <section className="digest-history">
        <div className="source-list-heading"><div><p className="eyebrow">Audit trail</p><h2>Digest history</h2></div><p>Generation, publication, social and email are tracked independently so a failed distribution can be retried safely.</p></div>
        {digestRuns.length ? <div className="digest-run-list">{digestRuns.map((run) => {
          const editionLabel = run.digest_type === 'weekly' ? 'Weekly digest' : 'Daily digest';
          return <article key={run.id}>
            <div className="digest-run-identity"><span className="digest-run-type">{run.digest_type}</span><div><strong>{run.story_id ? <a href={`/admin/digests/${run.story_id}`}>{editionLabel}</a> : editionLabel}</strong><p>{dateTime.format(new Date(run.created_at))} · {run.source_story_count} stories · ${Number(run.estimated_cost_usd).toFixed(4)} estimated</p>{run.error_summary ? <p className="collection-run-error">{run.error_summary}</p> : null}</div></div>
            <div className="digest-run-channels"><span><Send /> Social <strong>{run.social_status}</strong></span><span><Mail /> Email <strong>{run.digest_type === 'daily' ? 'weekly only' : run.email_status}</strong></span></div>
            <div className="digest-run-actions"><span className={`run-status ${run.status}`}>{run.status.replace('_', ' ')}</span>{run.story_id ? <a href={`/admin/digests/${run.story_id}`}>Open edition</a> : null}</div>
          </article>;
        })}</div> : <div className="queue-empty"><CalendarDays /><h3>No digest runs yet</h3><p>The first manual test will be created after the public digest template is ready.</p></div>}
      </section>
    </div>
  </main>;
}
