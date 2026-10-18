'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, LoaderCircle } from 'lucide-react';

export function PublishDigestButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function publish() {
    if (!window.confirm('Publish this digest now? It will become publicly accessible immediately. Social posting and email distribution will remain disabled.')) return;
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/digests/${storyId}/publish`, { method: 'POST' });
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
