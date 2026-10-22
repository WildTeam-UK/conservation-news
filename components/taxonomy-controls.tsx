'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, LoaderCircle, Save, Sparkles } from 'lucide-react';
import { londonMediumDateTimeFormatter } from '@/lib/date-format';

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
  const [working, setWorking] = useState<'save' | 'run' | 'reconcile' | null>(null);
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

  async function reconcileArticles() {
    setWorking('reconcile'); setMessage('Reclassifying the first group of articles…'); setFailed(false);
    try {
      let processed = 0; let ready = 0; let needsReview = 0; let tagsCreated = 0; let estimatedCostUsd = 0; let remaining = 1; let batches = 0;
      while (remaining > 0 && batches < 20) {
        const response = await fetch('/api/admin/taxonomy/reconcile', { method: 'POST' });
        const result = await response.json() as { processed?: number; ready?: number; needsReview?: number; tagsCreated?: number; estimatedCostUsd?: number; remaining?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Existing articles could not be reconciled.');
        processed += result.processed ?? 0; ready += result.ready ?? 0; needsReview += result.needsReview ?? 0; tagsCreated += result.tagsCreated ?? 0; estimatedCostUsd += Number(result.estimatedCostUsd ?? 0); remaining = result.remaining ?? 0; batches += 1;
        setMessage(`Reclassified ${processed} articles${remaining ? ` · ${remaining} remaining…` : ''}`);
      }
      if (remaining > 0) throw new Error(`${remaining} articles remain. Run the reconciliation again to continue.`);
      setMessage(`Reclassified ${processed} articles: ${ready} ready, ${needsReview} need review, ${tagsCreated} new growing tags. Estimated AI cost: $${estimatedCostUsd.toFixed(4)}.`);
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Existing articles could not be reconciled.'); }
    finally { setWorking(null); }
  }

  return <details className="taxonomy-settings-disclosure">
    <summary><span><Bot /><span><strong>Taxonomy automation</strong><small>{enabled ? 'Enabled' : 'Paused'} · tags become public after {minimum} published articles</small></span></span><span>Settings</span></summary>
    <section className="taxonomy-automation-panel">
      <div className="taxonomy-automation-copy"><span><Bot /></span><div><p className="eyebrow">Automatic governance</p><h2>Reuse first, then grow what is missing</h2><p>Research reuses the existing vocabulary before creating a tag. At the threshold, AI prepares its archive copy and makes it public.</p>{settings.last_governance_run_at ? <small>Last run {londonMediumDateTimeFormatter.format(new Date(settings.last_governance_run_at))} · ${Number(settings.last_estimated_cost_usd ?? 0).toFixed(4)}</small> : null}{settings.last_governance_error ? <small className="taxonomy-error">Last error: {settings.last_governance_error}</small> : null}</div></div>
      <form onSubmit={save}>
        <label className="automation-toggle-control"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><strong>Automation enabled</strong></label>
        <label><span>Articles before tag goes live</span><input type="number" min="1" max="100" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} /><small>Only published articles count.</small></label>
        <div className="taxonomy-fixed-rule"><span>Article display</span><strong>Top 3 tags</strong><small>All relationships remain stored and feed their archives.</small></div>
        <button type="submit" disabled={Boolean(working)}>{working === 'save' ? <LoaderCircle className="admin-spinner" /> : <Save />} Save settings</button>
        <button className="taxonomy-run-button" type="button" disabled={Boolean(working)} onClick={runGovernance}>{working === 'run' ? <LoaderCircle className="admin-spinner" /> : <Sparkles />} Run governance now</button>
        <button className="taxonomy-reconcile-button" type="button" disabled={Boolean(working)} onClick={reconcileArticles}>{working === 'reconcile' ? <LoaderCircle className="admin-spinner" /> : <Sparkles />} Reclassify existing articles</button>
      </form>
      {message ? <output className={failed ? 'taxonomy-message failed' : 'taxonomy-message'}>{message}</output> : null}
    </section>
  </details>;
}
