'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, LoaderCircle, RotateCcw } from 'lucide-react';
import { useAdminConfirmation } from '@/components/admin-confirmation';

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
  const { confirmAdminAction } = useAdminConfirmation();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function updateLifecycle() {
    const description = action === 'restore'
      ? 'The article will return as an unscheduled private draft. Its original publication date and editorial history will be preserved.'
      : wasPublished
        ? 'The article will be removed from the public website and publishing automation, while its original publication date and editorial history are preserved.'
        : 'The private article will be removed from the active workflow and publishing queue, but it can be restored later.';
    const confirmed = await confirmAdminAction({
      title: action === 'restore' ? 'Restore this article?' : 'Archive this article?',
      description,
      confirmLabel: action === 'restore' ? 'Restore draft' : 'Archive article',
      tone: action === 'archive' ? 'warning' : 'standard',
    });
    if (!confirmed) return;

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
