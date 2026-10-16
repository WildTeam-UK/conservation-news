'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilePenLine, LoaderCircle } from 'lucide-react';

type DraftResponse = {
  storyId?: string;
  estimatedCostUsd?: number;
  error?: string;
};

export function GenerateDraftButton({ clusterId }: { clusterId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function generate() {
    setRunning(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch('/api/admin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });
      const result = await response.json() as DraftResponse;
      if (!response.ok || !result.storyId) {
        setFailed(true);
        setMessage(result.error ?? 'Draft generation failed.');
        return;
      }
      setMessage(`Draft created. Estimated model cost: $${(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
      router.push(`/admin/drafts/${result.storyId}`);
    } catch {
      setFailed(true);
      setMessage('The draft request could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  return <div className="candidate-draft-control">
    <button className="admin-primary-button" type="button" onClick={generate} disabled={running}>
      {running ? <><LoaderCircle className="admin-spinner" /> Writing first draft</> : <><FilePenLine /> Generate draft</>}
    </button>
    {message ? <output className={failed ? 'collection-message failed' : 'collection-message'}>{message}</output> : null}
  </div>;
}
