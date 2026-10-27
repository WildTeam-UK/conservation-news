'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, LoaderCircle } from 'lucide-react';
import { useAdminConfirmation } from '@/components/admin-confirmation';

export function PublishDigestButton({ storyId, publicationDate, distributionSummary }: { storyId: string; publicationDate?: string; distributionSummary: string }) {
  const router = useRouter();
  const { confirmAdminAction } = useAdminConfirmation();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function publish() {
    const dateNote = publicationDate ? ` Its publication time will be recorded as 14:00 Europe/London on ${publicationDate}.` : '';
    const confirmed = await confirmAdminAction({
      title: 'Publish this digest?',
      description: `It will become publicly accessible immediately.${dateNote} ${distributionSummary}`,
      confirmLabel: 'Publish digest',
    });
    if (!confirmed) return;
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/digests/${storyId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicationDate }) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) setMessage(result.error ?? 'The digest could not be published.');
      else {
        setMessage('Digest published successfully.');
        router.refresh();
      }
    } catch {
      setMessage('The digest could not be published.');
    } finally {
      setWorking(false);
    }
  }

  return <><button className="digest-publish-button" type="button" disabled={working} onClick={publish}>{working ? <LoaderCircle className="admin-spinner" /> : <Globe2 />} {working ? 'Publishing…' : 'Publish digest'}</button>{message ? <output>{message}</output> : null}</>;
}
