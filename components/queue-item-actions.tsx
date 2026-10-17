'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, XCircle } from 'lucide-react';

export function QueueItemActions({ queueId, storyId, held = false }: { queueId: string; storyId: string; held?: boolean }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm(`Remove this ${held ? 'held article' : 'article'} from automatic publishing? It will remain available as a private draft.`)) return;
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
