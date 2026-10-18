'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, LoaderCircle, Sparkles } from 'lucide-react';
import type { DigestType } from '@/lib/digests';

export function DigestRunControls() {
  const router = useRouter();
  const [running, setRunning] = useState<DigestType | null>(null);
  const [message, setMessage] = useState('');

  async function run(type: DigestType) {
    setRunning(type);
    setMessage('');
    try {
      const response = await fetch('/api/admin/digests/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ digestType: type }) });
      const result = await response.json() as { runId?: string | null; storyId?: string; headline?: string; alreadyCompleted?: boolean; estimatedCostUsd?: number; error?: string };
      if (!response.ok || !result.storyId) throw new Error(result.error ?? 'The digest could not be generated.');
      setMessage(result.alreadyCompleted ? 'Today’s edition already exists. Opening it now.' : `Private digest created. Estimated AI cost: $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
      router.push(`/admin/digests/${result.storyId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The digest could not be generated.');
    } finally {
      setRunning(null);
    }
  }

  return <section className="digest-manual-panel">
    <div><span><Sparkles /></span><div><p className="eyebrow">Template testing</p><h2>Create a private edition</h2><p>Use the published stories from the relevant period to test the editorial digest. Buffer and Brevo remain untouched.</p></div></div>
    <div className="digest-run-buttons"><button type="button" disabled={Boolean(running)} onClick={() => run('daily')}>{running === 'daily' ? <LoaderCircle className="admin-spinner" /> : <CalendarDays />} Test daily digest</button><button type="button" disabled={Boolean(running)} onClick={() => run('weekly')}>{running === 'weekly' ? <LoaderCircle className="admin-spinner" /> : <CalendarDays />} Test weekly digest</button></div>
    {message ? <output>{message}</output> : null}
  </section>;
}

