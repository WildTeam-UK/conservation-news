'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Link2, LoaderCircle, Play, Square } from 'lucide-react';

type BackfillStatus = { total: number; processed: number; linkedArticles: number; linksAdded: number; remaining: number };
type BackfillResult = BackfillStatus & { batchProcessed: number; batchLinkedArticles: number; batchLinksAdded: number; estimatedCostUsd: number; error?: string };

export function ArticleLinkBackfill({ initialStatus }: { initialStatus: BackfillStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [cost, setCost] = useState(0);
  const stopRequested = useRef(false);

  async function run() {
    setRunning(true); setMessage('Assessing the next group of articles…'); setCost(0); stopRequested.current = false;
    let latest = status;
    try {
      while (latest.remaining > 0 && !stopRequested.current) {
        const response = await fetch('/api/admin/article-links/backfill', { method: 'POST' });
        const result = await response.json() as BackfillResult;
        if (!response.ok || result.error) throw new Error(result.error ?? 'The linking backfill could not continue.');
        latest = { total: result.total, processed: result.processed, linkedArticles: result.linkedArticles, linksAdded: result.linksAdded, remaining: result.remaining };
        setStatus(latest); setCost((current) => current + Number(result.estimatedCostUsd || 0));
        setMessage(result.remaining ? `${result.remaining} articles remaining…` : 'Every existing article has been assessed.');
        if (result.batchProcessed === 0) break;
      }
      if (stopRequested.current) setMessage('Paused safely. Continue whenever you are ready.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The linking backfill could not continue.'); }
    finally { setRunning(false); }
  }

  return <section className="course-backfill-panel article-link-backfill">
    <div className="course-backfill-heading"><span><Link2 /></span><div><p className="eyebrow">Existing articles</p><h2>Contextual linking backfill</h2><p>Assess existing copy against approved articles, topic and tag archives, courses and verified sources. Weak or forced links are skipped.</p></div></div>
    <div className="course-backfill-stats"><span><strong>{status.processed}</strong><small>assessed</small></span><span><strong>{status.linkedArticles}</strong><small>articles linked</small></span><span><strong>{status.linksAdded}</strong><small>links added</small></span><span><strong>{status.remaining}</strong><small>remaining</small></span></div>
    <div className="course-backfill-actions">{status.remaining ? <button type="button" onClick={running ? () => { stopRequested.current = true; } : run}>{running ? <><Square /> Pause after this batch</> : <><Play /> Backfill all articles</>}</button> : <span className="course-backfill-complete"><CheckCircle2 /> Backfill complete</span>}{running ? <LoaderCircle className="admin-spinner" /> : null}<output>{message}{cost ? ` Estimated model cost this run: $${cost.toFixed(4)}.` : ''}</output></div>
  </section>;
}

