'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, XCircle } from 'lucide-react';
import { useAdminConfirmation } from '@/components/admin-confirmation';

export function QueueItemActions({ queueId, storyId, held = false }: { queueId: string; storyId: string; held?: boolean }) {
  const router = useRouter();
  const { confirmAdminAction } = useAdminConfirmation();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    const confirmed = await confirmAdminAction({
      title: 'Remove this article from the queue?',
      description: `This ${held ? 'held article' : 'article'} will be removed from automatic publishing and remain available as a private draft.`,
      confirmLabel: 'Remove from queue',
      tone: 'warning',
    });
    if (!confirmed) return;
    setRemoving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/publication-queue/${queueId}`, { method: 'DELETE' });
      const result = await response.json() as { removed?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'The article could not be removed from the queue.');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The article could not be removed from the queue.');
    } finally {
      setRemoving(false);
    }
  }

  return <div className="queue-item-actions"><a href={`/admin/drafts/${storyId}`}>{held ? 'Review draft' : 'Open article'}</a><button type="button" disabled={removing} onClick={remove}>{removing ? <LoaderCircle className="admin-spinner" /> : <XCircle />} Remove</button>{error ? <small>{error}</small> : null}</div>;
}
