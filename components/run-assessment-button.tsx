'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit, LoaderCircle } from 'lucide-react';

type AssessmentResponse = {
  assessedItems?: number;
  clustersCreated?: number;
  selected?: number;
  rejected?: number;
  estimatedCostUsd?: number;
  remainingItems?: number;
  matchedItems?: number;
  updatesFlagged?: number;
  expiredItems?: number;
  error?: string;
};

export function RunAssessmentButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function assess() {
    setRunning(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch('/api/admin/assess', { method: 'POST' });
      const result = await response.json() as AssessmentResponse;
      if (!response.ok) {
        setFailed(true);
        setMessage(result.error ?? 'Assessment failed.');
      } else if (!result.assessedItems) {
        const expired = result.expiredItems ? ` ${result.expiredItems} old item${result.expiredItems === 1 ? ' was' : 's were'} closed without assessment.` : '';
        setMessage(`There are no recent collected items to assess.${expired}`);
      } else {
        const matching = result.matchedItems ? ` Matched ${result.matchedItems} to recent stories.` : '';
        const updates = result.updatesFlagged ? ` Flagged ${result.updatesFlagged} new coverage update${result.updatesFlagged === 1 ? '' : 's'}.` : '';
        const remaining = result.remainingItems ? ` ${result.remainingItems} recent items remain for the next batch.` : '';
        const expired = result.expiredItems ? ` Closed ${result.expiredItems} old item${result.expiredItems === 1 ? '' : 's'} without assessment.` : '';
        setMessage(`Assessed ${result.assessedItems} items and recommended ${result.selected} candidates.${matching}${updates}${remaining}${expired} Estimated AI cost: $${(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
        router.refresh();
      }
    } catch {
      setFailed(true);
      setMessage('The assessment request could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  return <div className="assessment-control"><button className="admin-primary-button" type="button" onClick={assess} disabled={running}>{running ? <><LoaderCircle className="admin-spinner" /> Assessing items</> : <><BrainCircuit /> Assess new items</>}</button>{message ? <output className={failed ? 'collection-message failed' : 'collection-message'}>{message}</output> : null}</div>;
}
