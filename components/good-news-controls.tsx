'use client';

import { type SyntheticEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LoaderCircle, Play, Save, Square } from 'lucide-react';

type Status = { total: number; assessed: number; remaining: number; qualifying: number; classifications: { positive: number; mixed: number; neutral: number; negative: number } };
type Settings = { minimum_score: number; minimum_confidence: number };
type Result = Status & { batchProcessed: number; estimatedCostUsd: number; error?: string };

export function GoodNewsControls({ initialStatus, initialSettings }: { initialStatus: Status; initialSettings: Settings }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [score, setScore] = useState(initialSettings.minimum_score);
  const [confidence, setConfidence] = useState(initialSettings.minimum_confidence);
  const [working, setWorking] = useState<'save' | 'backfill' | null>(null);
  const [message, setMessage] = useState('');
  const [cost, setCost] = useState(0);
  const stopRequested = useRef(false);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking('save'); setMessage('');
    try {
      const response = await fetch('/api/admin/good-news/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minimumScore: score, minimumConfidence: confidence }) });
      const result = await response.json() as { saved?: boolean; status?: Status; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'Settings could not be saved.');
      if (result.status) setStatus(result.status);
      setMessage('Thresholds saved. The public archive updates automatically.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Settings could not be saved.'); }
    finally { setWorking(null); }
  }

  async function backfill() {
    setWorking('backfill'); setMessage('Classifying the next group of articles…'); setCost(0); stopRequested.current = false;
    let latest = status;
    try {
      while (latest.remaining > 0 && !stopRequested.current) {
        const response = await fetch('/api/admin/good-news/backfill', { method: 'POST' });
        const result = await response.json() as Result;
        if (!response.ok || result.error) throw new Error(result.error ?? 'The classification could not continue.');
        latest = { total: result.total, assessed: result.assessed, remaining: result.remaining, qualifying: result.qualifying, classifications: result.classifications };
        setStatus(latest); setCost((current) => current + Number(result.estimatedCostUsd || 0));
        setMessage(result.remaining ? `${result.remaining} articles remaining…` : 'Every existing article has been classified.');
        if (!result.batchProcessed) break;
      }
      if (stopRequested.current) setMessage('Paused safely. Continue whenever you are ready.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The classification could not continue.'); }
    finally { setWorking(null); }
  }

  return <>
    <section className="good-news-admin-panel">
      <div><p className="eyebrow">Archive rules</p><h2>Strong evidence, not upbeat wording</h2><p>Only articles classified as positive and meeting both thresholds appear publicly. Mixed, neutral and negative reporting remains elsewhere on WILDNEWS.</p></div>
      <form onSubmit={save}>
        <label><span>Minimum positive score</span><input type="number" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
        <label><span>Minimum confidence</span><input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
        <button type="submit" disabled={Boolean(working)}>{working === 'save' ? <LoaderCircle className="admin-spinner" /> : <Save />} Save thresholds</button>
      </form>
    </section>
    <section className="good-news-backfill-panel">
      <div><p className="eyebrow">Existing articles</p><h2>Conservation outlook classification</h2><p>Reassess the current library using the same rules applied automatically to every new article.</p></div>
      <div className="good-news-admin-stats"><span><strong>{status.assessed}</strong><small>assessed</small></span><span><strong>{status.qualifying}</strong><small>qualify now</small></span><span><strong>{status.classifications.mixed}</strong><small>mixed</small></span><span><strong>{status.classifications.neutral}</strong><small>neutral</small></span><span><strong>{status.classifications.negative}</strong><small>negative</small></span><span><strong>{status.remaining}</strong><small>remaining</small></span></div>
      <div className="good-news-backfill-actions">{status.remaining ? <button type="button" onClick={working === 'backfill' ? () => { stopRequested.current = true; } : backfill}>{working === 'backfill' ? <><Square /> Pause after this batch</> : <><Play /> Classify existing articles</>}</button> : <span><CheckCircle2 /> Classification complete</span>}{working === 'backfill' ? <LoaderCircle className="admin-spinner" /> : null}<output>{message}{cost ? ` Estimated model cost this run: $${cost.toFixed(4)}.` : ''}</output></div>
    </section>
  </>;
}
