'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, LoaderCircle, RotateCcw } from 'lucide-react';

type ArticleLifecycleAction = 'archive' | 'restore';

export function ArticleLifecycleButton({
  storyId,
  action,
  wasPublished = false,
  compact = false,
  redirectTo,
}: {
  storyId: string;
  action: ArticleLifecycleAction;
  wasPublished?: boolean;
  compact?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function updateLifecycle() {
    const prompt = action === 'restore'
      ? 'Restore this article as an unscheduled private draft? Its original publication date and editorial history will be preserved.'
      : wasPublished
        ? 'Archive this published article? It will be removed from the public website and publishing automation, while its original publication date and editorial history are preserved.'
        : 'Archive this private article? It will be removed from the active workflow and publishing queue, but can be restored later.';
    if (!window.confirm(prompt)) return;

    setWorking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/drafts/${storyId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? `The article could not be ${action === 'archive' ? 'archived' : 'restored'}.`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `The article could not be ${action === 'archive' ? 'archived' : 'restored'}.`);
    } finally {
      setWorking(false);
    }
  }

  const label = action === 'archive' ? 'Archive article' : 'Restore draft';
  const workingLabel = action === 'archive' ? 'Archiving' : 'Restoring';
  return <div className={`article-lifecycle-control${compact ? ' compact' : ''}`}>
    <button type="button" disabled={working} onClick={updateLifecycle}>
      {working ? <LoaderCircle className="admin-spinner" /> : action === 'archive' ? <Archive /> : <RotateCcw />}
      {working ? workingLabel : label}
    </button>
    {message ? <small role="alert">{message}</small> : null}
  </div>;
}
