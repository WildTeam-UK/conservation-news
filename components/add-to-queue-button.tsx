'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, LoaderCircle } from 'lucide-react';

export function AddToQueueButton({ storyId, compact = false, approveHeld = false }: { storyId: string; compact?: boolean; approveHeld?: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  async function add() {
    if (approveHeld && !window.confirm('Add this reviewed article to the publishing queue? This approves scheduled publication even though the automatic workflow held it for review.')) return;
    setAdding(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/publication-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, approveHeld }),
      });
      const result = await response.json() as { added?: boolean; queue?: { status?: string }; error?: string };
      if (!response.ok || !result.added) throw new Error(result.error ?? 'The draft could not be added to the queue.');
      setMessage(result.queue?.status === 'held' ? 'Still held for review.' : 'Added to the publishing schedule.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The draft could not be added to the queue.');
    } finally {
      setAdding(false);
    }
  }

  return <div className={`add-to-queue-control${compact ? ' compact' : ''}`}><button type="button" disabled={adding} onClick={add}>{adding ? <LoaderCircle className="admin-spinner" /> : <CalendarPlus />} Add to queue</button>{message ? <small>{message}</small> : null}</div>;
}
