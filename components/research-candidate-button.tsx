'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, SearchCheck } from 'lucide-react';

type ResearchResponse = {
  sourceCount?: number;
  searchActions?: number;
  estimatedTokenCostUsd?: number;
  error?: string;
};

export function ResearchCandidateButton({ clusterId, retry = false }: { clusterId: string; retry?: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function research() {
    setRunning(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch('/api/admin/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });
      const result = await response.json() as ResearchResponse;
      if (!response.ok) {
        setFailed(true);
        setMessage(result.error ?? 'Research failed.');
      } else {
        setMessage(`Research complete with ${result.sourceCount ?? 0} sources. Estimated model-token cost: $${(result.estimatedTokenCostUsd ?? 0).toFixed(4)} plus web search.`);
        router.refresh();
      }
    } catch {
      setFailed(true);
      setMessage('The research request could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  return <div className="candidate-research-control"><button className="admin-primary-button" type="button" onClick={research} disabled={running}>{running ? <><LoaderCircle className="admin-spinner" /> Researching the web</> : <><SearchCheck /> {retry ? 'Retry research' : 'Research this story'}</>}</button>{message ? <output className={failed ? 'collection-message failed' : 'collection-message'}>{message}</output> : null}</div>;
}
