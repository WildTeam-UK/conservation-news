'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, LoaderCircle, RotateCcw } from 'lucide-react';

type LinkStatus = { total: number; current: number; failed: number; remaining: number; acceptedLinks: number };
type BatchResult = { processed?: number; completed?: number; failed?: number; proposed?: number; accepted?: number; rejected?: number; estimatedCostUsd?: number; remaining?: number; error?: string };

export function ContextualLinkControls({ initialStatus }: { initialStatus: LinkStatus }) {
  const router = useRouter();
  const [working, setWorking] = useState<'remaining' | 'failed' | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function run(retryFailed = false) {
    setWorking(retryFailed ? 'failed' : 'remaining');
    setMessage(retryFailed ? 'Retrying failed link assessments…' : 'Assessing the first group of finished content…');
    setFailed(false);
    try {
      let processed = 0; let completed = 0; let failures = 0; let proposed = 0; let accepted = 0; let rejected = 0; let estimatedCostUsd = 0; let remaining = 1; let batches = 0;
      while (remaining > 0 && batches < 20) {
        const response = await fetch('/api/admin/linking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ retryFailed, limit: 5 }) });
        const result = await response.json() as BatchResult;
        if (!response.ok) throw new Error(result.error ?? 'Contextual links could not be assessed.');
        processed += result.processed ?? 0; completed += result.completed ?? 0; failures += result.failed ?? 0; proposed += result.proposed ?? 0; accepted += result.accepted ?? 0; rejected += result.rejected ?? 0; estimatedCostUsd += Number(result.estimatedCostUsd ?? 0); remaining = result.remaining ?? 0; batches += 1;
        setMessage(`Assessed ${processed} items${remaining ? ` · ${remaining} remaining…` : ''}`);
        if (!result.processed || retryFailed) break;
      }
      if (remaining > 0 && !retryFailed) throw new Error(`${remaining} items remain. Run the assessment again to continue.`);
      setMessage(`Assessed ${processed} items: ${completed} completed, ${failures} failed, ${accepted} of ${proposed} proposed links accepted${rejected ? `, ${rejected} rejected by validation` : ''}. Estimated AI cost: $${estimatedCostUsd.toFixed(4)}.`);
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'Contextual links could not be assessed.');
    } finally {
      setWorking(null);
    }
  }

  return <section className="good-news-status-panel">
    <p className="eyebrow">Dedicated linking pass</p>
    <h2>Useful links, added after the copy is final</h2>
    <p>The link editor assesses exact phrases in completed articles and digests against approved WildNews stories, archives, courses and first-hand sources. Validation prevents partial words, duplicate targets and forced links.</p>
    <div className="good-news-admin-stats contextual-link-stats">
      <span><strong>{initialStatus.total}</strong><small>eligible items</small></span>
      <span><strong>{initialStatus.current}</strong><small>current</small></span>
      <span><strong>{initialStatus.acceptedLinks}</strong><small>accepted links</small></span>
      <span><strong>{initialStatus.remaining}</strong><small>need assessment</small></span>
      <span><strong>{initialStatus.failed}</strong><small>failed</small></span>
    </div>
    <div className="contextual-link-actions">
      <button type="button" disabled={Boolean(working) || initialStatus.remaining === 0} onClick={() => run(false)}>{working === 'remaining' ? <LoaderCircle className="admin-spinner" /> : <Link2 />} Assess remaining content</button>
      <button className="secondary" type="button" disabled={Boolean(working) || initialStatus.failed === 0} onClick={() => run(true)}>{working === 'failed' ? <LoaderCircle className="admin-spinner" /> : <RotateCcw />} Retry failures</button>
    </div>
    {message ? <output className={failed ? 'taxonomy-message failed' : 'taxonomy-message'}>{message}</output> : null}
  </section>;
}
