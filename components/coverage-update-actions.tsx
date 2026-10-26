'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FilePenLine, LoaderCircle, X } from 'lucide-react';

type Decision = 'dismiss' | 'no_change' | 'prepare_revision';

export function CoverageUpdateActions({ updateId }: { updateId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState<Decision | null>(null);
  const [message, setMessage] = useState('');

  async function decide(decision: Decision) {
    setWorking(decision);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/coverage-updates/${updateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { reviewed?: boolean; contentChanged?: boolean; error?: string };
      if (!response.ok || !result.reviewed) setMessage(result.error ?? 'The coverage decision could not be saved.');
      else router.refresh();
    } catch {
      setMessage('The coverage decision could not be saved.');
    } finally {
      setWorking(null);
    }
  }

  return <div className="coverage-update-actions">
    <button type="button" disabled={working !== null} onClick={() => decide('prepare_revision')}>{working === 'prepare_revision' ? <><LoaderCircle className="admin-spinner" /> Drafting update</> : <><FilePenLine /> Prepare update</>}</button>
    <button type="button" disabled={working !== null} onClick={() => decide('no_change')}>{working === 'no_change' ? <LoaderCircle className="admin-spinner" /> : <Check />} Reviewed, no change</button>
    <button type="button" disabled={working !== null} onClick={() => decide('dismiss')}>{working === 'dismiss' ? <LoaderCircle className="admin-spinner" /> : <X />} Dismiss</button>
    {message ? <output>{message}</output> : null}
  </div>;
}
