import type { Metadata } from 'next';
import { BookOpenText, Newspaper, Rss, SearchCheck } from 'lucide-react';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { AdminNav } from '@/components/admin-nav';
import { Brand } from '@/components/brand';
import { DailyEditorialRun } from '@/components/daily-editorial-run';
import { RunCollectionButton } from '@/components/run-collection-button';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial dashboard | WILDNEWS',
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const { supabase, admin } = await requireContentAdmin();
  const [draftsResult, publishedResult, sourcesResult, itemsResult, runsResult, settingsResult, editorialRunsResult, activeRunResult] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('source_items').select('*', { count: 'exact', head: true }),
    supabase.from('ingestion_runs').select('id, status, sources_checked, items_found, items_new, error_summary, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('editorial_run_settings').select('max_new_drafts, max_estimated_cost_usd, automation_enabled, daily_run_time, automation_timezone, last_automation_tick_at, last_automation_error').eq('id', true).maybeSingle(),
    supabase.from('editorial_runs').select('id, trigger_type, status, max_new_drafts, estimated_cost_usd, drafts_created, candidates_selected, failures, created_at, completed_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('editorial_runs').select('id').eq('status', 'running').maybeSingle(),
  ]);

  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>

      <AdminNav active="dashboard" />

      <div className="admin-shell">
        <section className="admin-welcome" aria-labelledby="admin-heading">
          <p className="eyebrow">Editorial dashboard</p>
          <h1 id="admin-heading">Good to see you.</h1>
          <p>This is where the daily recommendations will arrive for review before anything is published.</p>
        </section>

        <section className="admin-stats" aria-label="Content overview">
          <article><span><BookOpenText /></span><strong>{draftsResult.count ?? 0}</strong><p>Drafts awaiting review</p></article>
          <article><span><Newspaper /></span><strong>{publishedResult.count ?? 0}</strong><p>Published stories</p></article>
          <article><span><Rss /></span><strong>{sourcesResult.count ?? 0}</strong><p>Active sources</p></article>
          <article><span><SearchCheck /></span><strong>{itemsResult.count ?? 0}</strong><p>Collected source items</p></article>
        </section>

        <DailyEditorialRun
          defaultMaxDrafts={settingsResult.data?.max_new_drafts ?? 10}
          defaultMaxCostUsd={Number(settingsResult.data?.max_estimated_cost_usd ?? 1)}
          defaultAutomationEnabled={settingsResult.data?.automation_enabled ?? false}
          defaultDailyRunTime={settingsResult.data?.daily_run_time ?? '10:00'}
          lastAutomationTickAt={settingsResult.data?.last_automation_tick_at ?? null}
          lastAutomationError={settingsResult.data?.last_automation_error ?? null}
          hasActiveRun={Boolean(activeRunResult.data)}
        />

        {(editorialRunsResult.data?.length ?? 0) > 0 ? <section className="editorial-run-history"><div className="collection-history-heading"><p className="eyebrow">Audit trail</p><h2>Daily runs</h2></div><div className="collection-runs">{editorialRunsResult.data?.map((run) => <article key={run.id}><span className={`run-status ${run.status}`}>{run.status.replace('_', ' ')}</span><div><strong>{run.drafts_created} private {run.drafts_created === 1 ? 'draft' : 'drafts'}</strong><p>{run.trigger_type === 'scheduled' ? 'Scheduled' : 'Manual'} · {run.candidates_selected} selected · ${Number(run.estimated_cost_usd).toFixed(4)} estimated{run.failures ? ` · ${run.failures} failed` : ''}</p></div><time dateTime={run.created_at}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(run.created_at))}</time></article>)}</div></section> : null}

        <section className="collection-panel">
          <div className="collection-panel-copy"><p className="eyebrow">Manual test</p><h2>Collect the latest stories</h2><p>Check every active RSS source and save any items that have not been seen before. Nothing will be drafted or published yet.</p></div>
          <div className="collection-panel-actions"><RunCollectionButton />{/* oxlint-disable-next-line next/no-html-link-for-pages */}<a href="/admin/collected">View collected items</a></div>
        </section>

        {(runsResult.data?.length ?? 0) > 0 ? <section className="collection-history"><div className="collection-history-heading"><p className="eyebrow">Recent activity</p><h2>Collection runs</h2></div><div className="collection-runs">{runsResult.data?.map((run) => <article key={run.id}><span className={`run-status ${run.status}`}>{run.status}</span><div><strong>{run.items_new} new items</strong><p>{run.items_found} found across {run.sources_checked} {run.sources_checked === 1 ? 'source' : 'sources'}</p>{run.error_summary ? <p className="collection-run-error">{run.error_summary}</p> : null}</div><time dateTime={run.created_at}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(run.created_at))}</time></article>)}</div></section> : null}
      </div>
    </main>
  );
}
