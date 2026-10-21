'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDollarSign, Clock3, FilePenLine, LoaderCircle, Play, RotateCcw, Save, SearchCheck, ShieldCheck } from 'lucide-react';
import { firstRelation } from '@/lib/supabase/relations';
import { londonMediumDateTimeFormatter, londonTimeFormatter } from '@/lib/date-format';

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
  defaultAutomationEnabled: boolean;
  defaultDailyRunTime: string;
  lastAutomationTickAt: string | null;
  lastAutomationError: string | null;
  hasActiveRun: boolean;
};

function candidateTitle(item: RunItem) {
  return firstRelation(item.story_clusters)?.working_title;
}

export function DailyEditorialRun({
  defaultMaxDrafts,
  defaultMaxCostUsd,
  defaultAutomationEnabled,
  defaultDailyRunTime,
  lastAutomationTickAt,
  lastAutomationError,
  hasActiveRun,
}: DailyEditorialRunProps) {
  const router = useRouter();
  const [maxDrafts, setMaxDrafts] = useState(defaultMaxDrafts);
  const [maxCost, setMaxCost] = useState(defaultMaxCostUsd);
  const [automationEnabled, setAutomationEnabled] = useState(defaultAutomationEnabled);
  const [dailyRunTime, setDailyRunTime] = useState(defaultDailyRunTime.slice(0, 5));
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');

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

  async function saveSchedule() {
    setSaving(true);
    setScheduleMessage('');
    try {
      const response = await fetch('/api/admin/editorial-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationEnabled, dailyRunTime, maxNewDrafts: maxDrafts, maxEstimatedCostUsd: maxCost }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'The automation settings could not be saved.');
      setScheduleMessage(automationEnabled
        ? `Automation enabled. Up to ${maxDrafts} drafts will be prepared daily after ${dailyRunTime} UK time.`
        : 'Automation is switched off. Your limits and preferred time have still been saved.');
      router.refresh();
    } catch (caught) {
      setScheduleMessage(caught instanceof Error ? caught.message : 'The automation settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function run() {
    setRunning(true);
    setError('');
    try {
      let next = await request({ action: 'start', maxNewDrafts: maxDrafts, maxEstimatedCostUsd: maxCost });
      setSnapshot(next);
      while (next.run.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, next.message.startsWith('Another request') ? 5_000 : 300));
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
  const lastTick = lastAutomationTickAt
    ? londonMediumDateTimeFormatter.format(new Date(lastAutomationTickAt))
    : null;

  return (
    <section className="daily-run-panel" aria-labelledby="daily-run-heading">
      <div className="daily-run-intro">
        <p className="eyebrow">Daily editorial workflow</p>
        <h2 id="daily-run-heading">Create today&apos;s private drafts</h2>
        <p>Collect and assess the latest items, rank them alongside recent undrafted candidates, then research and draft the strongest stories. Complete drafts can enter the controlled publishing queue automatically.</p>
        <div className="daily-run-safeguards"><span><ShieldCheck /> Publication checklist</span><span><SearchCheck /> Seven-day candidate pool</span><span><CircleDollarSign /> Stops before a projected overspend</span><span><RotateCcw /> Safe to resume</span></div>
        <div className={`automation-status ${automationEnabled ? 'enabled' : ''}`}>
          <Clock3 />
          <div><strong>{automationEnabled ? `Scheduled daily at ${dailyRunTime}` : 'Automation switched off'}</strong><small>UK time · feeds are also checked every two hours{lastTick ? ` · last heartbeat ${lastTick}` : ''}</small>{lastAutomationError ? <em>{lastAutomationError}</em> : null}</div>
        </div>
      </div>

      <div className="daily-run-controls">
        <label><span>Maximum new drafts</span><input type="number" min="1" max="25" step="1" value={maxDrafts} disabled={running || saving} onChange={(event) => setMaxDrafts(Number(event.target.value))} /></label>
        <label><span>Estimated cost limit (USD)</span><div className="money-input"><span>$</span><input type="number" min="0.05" max="100" step="0.05" value={maxCost} disabled={running || saving} onChange={(event) => setMaxCost(Number(event.target.value))} /></div></label>
        <label><span>Daily run time</span><input type="time" value={dailyRunTime} disabled={running || saving} onChange={(event) => setDailyRunTime(event.target.value)} /></label>
        <label className="automation-toggle"><span>Daily scheduler</span><span className="automation-toggle-control"><input type="checkbox" checked={automationEnabled} disabled={running || saving} onChange={(event) => setAutomationEnabled(event.target.checked)} /> <strong>{automationEnabled ? 'Enabled' : 'Off'}</strong></span></label>
        <button className="admin-secondary-button schedule-save-button" type="button" onClick={saveSchedule} disabled={running || saving || maxDrafts < 1 || maxCost < 0.05 || !dailyRunTime}>{saving ? <><LoaderCircle className="admin-spinner" /> Saving settings</> : <><Save /> Save automation</>}</button>
        <button className="admin-primary-button daily-run-button" type="button" onClick={run} disabled={running || saving || maxDrafts < 1 || maxCost < 0.05}>
          {running ? <><LoaderCircle className="admin-spinner" /> {snapshot?.message || 'Starting run'}</> : hasActiveRun || runState?.status === 'running' || runState?.status === 'budget_stopped' ? <><RotateCcw /> Resume run now</> : <><Play /> Run manually now</>}
        </button>
        <small>The draft and cost limits are shared by manual and scheduled runs. Automatic publishing is controlled separately from the Queue page.</small>
        {scheduleMessage ? <output className="schedule-message">{scheduleMessage}</output> : null}
      </div>

      {snapshot ? <div className={`daily-run-progress ${finished ? snapshot.run.status : ''}`}>
        <div className="daily-run-progress-heading"><div><strong>{finished ? snapshot.message : 'Run in progress'}</strong><span>{snapshot.progressPercent}% complete</span></div><span>${Number(snapshot.run.estimated_cost_usd).toFixed(4)} estimated</span></div>
        <div className="daily-run-progress-bar" aria-label={`${snapshot.progressPercent}% complete`}><span style={{ width: `${snapshot.progressPercent}%` }} /></div>
        <div className="daily-run-metrics"><span><SearchCheck /><strong>{snapshot.run.candidates_selected}</strong> selected</span><span><FilePenLine /><strong>{snapshot.run.drafts_created}</strong> drafts</span><span><CheckCircle2 /><strong>{snapshot.run.failures}</strong> failed</span></div>
        {snapshot.items.length ? <ol className="daily-run-items">{snapshot.items.map((item) => <li className={item.status} key={item.id}><span>{item.rank}</span><div><strong>{candidateTitle(item) || 'Story candidate'}</strong><small>{item.status.replace('researched', 'research complete')}</small>{item.error_message ? <em>{item.error_message}</em> : null}</div></li>)}</ol> : null}
        {snapshot.events.length ? <details className="daily-run-events"><summary>View run record</summary><ol>{snapshot.events.map((event) => <li className={event.level} key={event.id}><span>{event.message}</span><time dateTime={event.created_at}>{londonTimeFormatter.format(new Date(event.created_at))}</time></li>)}</ol></details> : null}
      </div> : null}
      {error ? <output className="collection-message failed daily-run-error">{error} The completed progress has been saved; press Resume run to continue.</output> : null}
    </section>
  );
}
