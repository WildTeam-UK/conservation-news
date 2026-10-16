'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Play } from 'lucide-react';

type CollectionResponse = {
  status?: 'completed' | 'partial' | 'failed';
  sourcesChecked?: number;
  itemsFound?: number;
  itemsNew?: number;
  error?: string;
  errors?: string[];
};

export function RunCollectionButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function runCollection() {
    setRunning(true);
    setMessage('');
    setFailed(false);

    try {
      const response = await fetch('/api/admin/collect', { method: 'POST' });
      const result = await response.json() as CollectionResponse;

      if (!response.ok) {
        setFailed(true);
        setMessage(result.errors?.[0] ?? result.error ?? 'Collection failed.');
      } else {
        const sourceCount = result.sourcesChecked ?? 0;
        const summary = `Checked ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'} and found ${result.itemsNew ?? 0} new items from ${result.itemsFound ?? 0} available.`;
        const errorDetail = result.errors?.length ? ` ${result.errors.join(' ')}` : '';
        setFailed(Boolean(result.errors?.length));
        setMessage(`${summary}${errorDetail}`);
        router.refresh();
      }
    } catch {
      setFailed(true);
      setMessage('The collection request could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="collection-control">
      <button className="admin-primary-button" type="button" onClick={runCollection} disabled={running}>
        {running ? <><LoaderCircle className="admin-spinner" /> Collecting stories</> : <><Play /> Run collection</>}
      </button>
      {message ? <output className={failed ? 'collection-message failed' : 'collection-message'}>{message}</output> : null}
    </div>
  );
}
