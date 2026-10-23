'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, LoaderCircle, Sparkles } from 'lucide-react';
import type { DigestType } from '@/lib/digests';

export function DigestRunControls({ latestMissedDate }: { latestMissedDate: string }) {
  const router = useRouter();
  const [running, setRunning] = useState<DigestType | 'backfill' | null>(null);
  const [message, setMessage] = useState('');
  const [missedDate, setMissedDate] = useState('');

  async function run(type: DigestType, targetDate?: string) {
    setRunning(targetDate ? 'backfill' : type);
    setMessage('');
    try {
      const response = await fetch('/api/admin/digests/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ digestType: type, targetDate }) });
      const result = await response.json() as { runId?: string | null; storyId?: string; headline?: string; alreadyCompleted?: boolean; estimatedCostUsd?: number; error?: string };
      if (!response.ok || !result.storyId) throw new Error(result.error ?? 'The digest could not be generated.');
      setMessage(result.alreadyCompleted ? `${targetDate ? 'That' : 'Today’s'} edition already exists. Opening it now.` : `Private digest created. Estimated AI cost: $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
      router.push(`/admin/digests/${result.storyId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The digest could not be generated.');
    } finally {
      setRunning(null);
    }
  }

  return <section className="digest-manual-panel">
    <div><span><Sparkles /></span><div><p className="eyebrow">Manual generation</p><h2>Create a private edition</h2><p>Generate a draft from the relevant published stories without contacting Buffer or the Brevo subscriber list.</p></div></div>
    <div className="digest-run-buttons"><button type="button" disabled={Boolean(running)} onClick={() => run('daily')}>{running === 'daily' ? <LoaderCircle className="admin-spinner" /> : <CalendarDays />} Create daily draft</button><button type="button" disabled={Boolean(running)} onClick={() => run('weekly')}>{running === 'weekly' ? <LoaderCircle className="admin-spinner" /> : <CalendarDays />} Create weekly draft</button></div>
    <div className="digest-backfill-control"><label htmlFor="missed-digest-date"><strong>Recover a missed daily edition</strong><span>Uses published stories from that exact London calendar day.</span></label><input id="missed-digest-date" type="date" max={latestMissedDate} value={missedDate} onChange={(event) => setMissedDate(event.target.value)} /><button type="button" disabled={Boolean(running) || !missedDate} onClick={() => run('daily', missedDate)}>{running === 'backfill' ? <LoaderCircle className="admin-spinner" /> : <CalendarDays />} Create missed edition</button></div>
    {message ? <output>{message}</output> : null}
  </section>;
}

