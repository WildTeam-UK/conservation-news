'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, LoaderCircle, Save, Sparkles } from 'lucide-react';

type TaxonomySettings = {
  automation_enabled: boolean;
  min_published_stories: number;
  last_governance_run_at: string | null;
  last_governance_error: string | null;
  last_estimated_cost_usd: number | string | null;
};

export function TaxonomyControls({ settings }: { settings: TaxonomySettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.automation_enabled);
  const [minimum, setMinimum] = useState(settings.min_published_stories);
  const [working, setWorking] = useState<'save' | 'run' | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking('save'); setMessage(''); setFailed(false);
    try {
      const response = await fetch('/api/admin/taxonomy', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ automationEnabled: enabled, minPublishedStories: minimum }) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'Settings could not be saved.');
      setMessage('Taxonomy settings saved.');
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Settings could not be saved.'); }
    finally { setWorking(null); }
  }

  async function runGovernance() {
    setWorking('run'); setMessage(''); setFailed(false);
    try {
      const response = await fetch('/api/admin/taxonomy', { method: 'POST' });
      const result = await response.json() as { topicsUpdated?: number; tagsUpdated?: number; tagsPromoted?: number; estimatedCostUsd?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Taxonomy governance could not be completed.');
      setMessage(`Updated ${result.topicsUpdated ?? 0} topics and ${result.tagsUpdated ?? 0} tags; ${result.tagsPromoted ?? 0} tags became public. Estimated AI cost: $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Taxonomy governance could not be completed.'); }
    finally { setWorking(null); }
  }

  return <section className="taxonomy-automation-panel">
    <div className="taxonomy-automation-copy"><span><Bot /></span><div><p className="eyebrow">Automatic governance</p><h2>Let useful archives emerge naturally</h2><p>New tags stay private while they accumulate coverage. Once a tag reaches the threshold, AI writes archive copy and makes it public automatically. Ambiguous exceptions can still be edited manually.</p>{settings.last_governance_run_at ? <small>Last run {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(settings.last_governance_run_at))} · ${Number(settings.last_estimated_cost_usd ?? 0).toFixed(4)}</small> : null}{settings.last_governance_error ? <small className="taxonomy-error">Last error: {settings.last_governance_error}</small> : null}</div></div>
    <form onSubmit={save}>
      <label className="automation-toggle-control"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><strong>Automation enabled</strong></label>
      <label><span>Articles before tag goes live</span><input type="number" min="1" max="100" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} /><small>Only published articles count.</small></label>
      <div className="taxonomy-fixed-rule"><span>Article display</span><strong>Top 3 tags</strong><small>All relationships remain stored and feed their archives.</small></div>
      <button type="submit" disabled={Boolean(working)}>{working === 'save' ? <LoaderCircle className="admin-spinner" /> : <Save />} Save settings</button>
      <button className="taxonomy-run-button" type="button" disabled={Boolean(working)} onClick={runGovernance}>{working === 'run' ? <LoaderCircle className="admin-spinner" /> : <Sparkles />} Run governance now</button>
    </form>
    {message ? <output className={failed ? 'taxonomy-message failed' : 'taxonomy-message'}>{message}</output> : null}
  </section>;
}
