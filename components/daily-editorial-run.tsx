'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDollarSign, FilePenLine, LoaderCircle, Play, RotateCcw, SearchCheck, ShieldCheck } from 'lucide-react';

type RunItem = {
  id: string;
  rank: number;
  status: 'pending' | 'researching' | 'researched' | 'drafting' | 'drafted' | 'failed';
  error_message: string | null;
  story_clusters: { working_title: string } | { working_title: string }[] | null;
};

type RunEvent = {
  id: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
};

type RunSnapshot = {
  run: {
    id: string;
    status: 'running' | 'completed' | 'partial' | 'failed' | 'budget_stopped';
    current_stage: string;
    max_new_drafts: number;
    max_estimated_cost_usd: number | string;
    estimated_cost_usd: number | string;
    candidates_selected: number;
    candidates_processed: number;
    drafts_created: number;
    failures: number;
  };
  items: RunItem[];
  events: RunEvent[];
  progressPercent: number;
  message: string;
  error?: string;
};

type DailyEditorialRunProps = {
  defaultMaxDrafts: number;
  defaultMaxCostUsd: number;
  hasActiveRun: boolean;
};

function candidateTitle(item: RunItem) {
  return Array.isArray(item.story_clusters) ? item.story_clusters[0]?.working_title : item.story_clusters?.working_title;
}

export function DailyEditorialRun({ defaultMaxDrafts, defaultMaxCostUsd, hasActiveRun }: DailyEditorialRunProps) {
  const router = useRouter();
  const [maxDrafts, setMaxDrafts] = useState(defaultMaxDrafts);
  const [maxCost, setMaxCost] = useState(defaultMaxCostUsd);
  const [running, setRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState('');

  async function request(body: Record<string, unknown>) {
    const response = await fetch('/api/admin/editorial-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json() as RunSnapshot & { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'The editorial run could not continue.');
    return result;
  }

  async function run() {
    setRunning(true);
    setError('');
    try {
      let next = await request({ action: 'start', maxNewDrafts: maxDrafts, maxEstimatedCostUsd: maxCost });
      setSnapshot(next);
      while (next.run.status === 'running') {
        next = await request({ action: 'advance', runId: next.run.id });
        setSnapshot(next);
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The editorial run could not continue. You can safely resume it.');
    } finally {
      setRunning(false);
    }
  }

  const runState = snapshot?.run;
  const finished = runState && runState.status !== 'running';

  return (
    <section className="daily-run-panel" aria-labelledby="daily-run-heading">
      <div className="daily-run-intro">
        <p className="eyebrow">Daily editorial workflow</p>
        <h2 id="daily-run-heading">Create today&apos;s private drafts</h2>
        <p>Collect, assess, research and draft each qualifying story. Every article stays private until you review and publish it.</p>
        <div className="daily-run-safeguards"><span><ShieldCheck /> No automatic publishing</span><span><CircleDollarSign /> Stops before a projected overspend</span><span><RotateCcw /> Safe to resume</span></div>
      </div>

      <div className="daily-run-controls">
        <label><span>Maximum new drafts</span><input type="number" min="1" max="25" step="1" value={maxDrafts} disabled={running} onChange={(event) => setMaxDrafts(Number(event.target.value))} /></label>
        <label><span>Estimated cost limit (USD)</span><div className="money-input"><span>$</span><input type="number" min="0.05" max="100" step="0.05" value={maxCost} disabled={running} onChange={(event) => setMaxCost(Number(event.target.value))} /></div></label>
        <button className="admin-primary-button daily-run-button" type="button" onClick={run} disabled={running || maxDrafts < 1 || maxCost < 0.05}>
          {running ? <><LoaderCircle className="admin-spinner" /> {snapshot?.message || 'Starting run'}</> : hasActiveRun || runState?.status === 'running' || runState?.status === 'budget_stopped' ? <><RotateCcw /> Resume run</> : <><Play /> Run now</>}
        </button>
        <small>The limits you enter are saved as the defaults for the next run. Actual API billing may vary slightly from these estimates.</small>
      </div>

      {snapshot ? <div className={`daily-run-progress ${finished ? snapshot.run.status : ''}`}>
        <div className="daily-run-progress-heading"><div><strong>{finished ? snapshot.message : 'Run in progress'}</strong><span>{snapshot.progressPercent}% complete</span></div><span>${Number(snapshot.run.estimated_cost_usd).toFixed(4)} estimated</span></div>
        <div className="daily-run-progress-bar" aria-label={`${snapshot.progressPercent}% complete`}><span style={{ width: `${snapshot.progressPercent}%` }} /></div>
        <div className="daily-run-metrics"><span><SearchCheck /><strong>{snapshot.run.candidates_selected}</strong> selected</span><span><FilePenLine /><strong>{snapshot.run.drafts_created}</strong> drafts</span><span><CheckCircle2 /><strong>{snapshot.run.failures}</strong> failed</span></div>
        {snapshot.items.length ? <ol className="daily-run-items">{snapshot.items.map((item) => <li className={item.status} key={item.id}><span>{item.rank}</span><div><strong>{candidateTitle(item) || 'Story candidate'}</strong><small>{item.status.replace('researched', 'research complete')}</small>{item.error_message ? <em>{item.error_message}</em> : null}</div></li>)}</ol> : null}
        {snapshot.events.length ? <details className="daily-run-events"><summary>View run record</summary><ol>{snapshot.events.map((event) => <li className={event.level} key={event.id}><span>{event.message}</span><time dateTime={event.created_at}>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(event.created_at))}</time></li>)}</ol></details> : null}
      </div> : null}
      {error ? <output className="collection-message failed daily-run-error">{error} The completed progress has been saved; press Resume run to continue.</output> : null}
    </section>
  );
}
