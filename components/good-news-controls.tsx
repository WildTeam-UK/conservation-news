'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Save } from 'lucide-react';

type Status = { total: number; assessed: number; remaining: number; qualifying: number; classifications: { positive: number; mixed: number; neutral: number; negative: number } };
type Settings = { minimum_score: number; minimum_confidence: number };
export function GoodNewsControls({ initialStatus, initialSettings }: { initialStatus: Status; initialSettings: Settings }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [score, setScore] = useState(initialSettings.minimum_score);
  const [confidence, setConfidence] = useState(initialSettings.minimum_confidence);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setMessage('');
    try {
      const response = await fetch('/api/admin/good-news/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minimumScore: score, minimumConfidence: confidence }) });
      const result = await response.json() as { saved?: boolean; status?: Status; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'Settings could not be saved.');
      if (result.status) setStatus(result.status);
      setMessage('Thresholds saved. The public archive updates automatically.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Settings could not be saved.'); }
    finally { setWorking(false); }
  }

  return <>
    <section className="good-news-admin-panel">
      <div><p className="eyebrow">Archive rules</p><h2>Strong evidence, not upbeat wording</h2><p>Only articles classified as positive and meeting both thresholds appear publicly. Mixed, neutral and negative reporting remains elsewhere on WILDNEWS.</p></div>
      <form onSubmit={save}>
        <label><span>Minimum positive score</span><input type="number" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
        <label><span>Minimum confidence</span><input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
        <button type="submit" disabled={working}>{working ? <LoaderCircle className="admin-spinner" /> : <Save />} Save thresholds</button>
      </form>
      {message ? <output>{message}</output> : null}
    </section>
    <section className="good-news-status-panel">
      <div><p className="eyebrow">Article library</p><h2>Conservation outlook classification</h2><p>Every new article is classified automatically during drafting. These figures show the current evidence mix across the library.</p></div>
      <div className="good-news-admin-stats"><span><strong>{status.assessed}</strong><small>assessed</small></span><span><strong>{status.classifications.positive}</strong><small>positive</small></span><span><strong>{status.qualifying}</strong><small>qualify now</small></span><span><strong>{status.classifications.mixed}</strong><small>mixed</small></span><span><strong>{status.classifications.neutral}</strong><small>neutral</small></span><span><strong>{status.classifications.negative}</strong><small>negative</small></span><span><strong>{status.remaining}</strong><small>unclassified</small></span></div>
    </section>
  </>;
}
