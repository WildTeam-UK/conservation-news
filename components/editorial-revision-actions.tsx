'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, Trash2 } from 'lucide-react';

export function EditorialRevisionActions({ revisionId, published }: { revisionId: string; published: boolean }) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [working, setWorking] = useState<'apply' | 'discard' | null>(null);
  const [message, setMessage] = useState('');

  async function applyRevision() {
    if (summary.trim().length < 20) {
      setMessage('Add a clear public summary of at least 20 characters.');
      return;
    }
    if (!window.confirm(published ? 'Apply this editorial update to the live article? The original publication date will be preserved.' : 'Apply this coverage revision to the private draft?')) return;
    setWorking('apply');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/story-revisions/${revisionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeSummary: summary }),
      });
      const result = await response.json() as { applied?: boolean; error?: string };
      if (!response.ok || !result.applied) setMessage(result.error ?? 'The editorial revision could not be applied.');
      else router.refresh();
    } catch {
      setMessage('The editorial revision could not be applied.');
    } finally {
      setWorking(null);
    }
  }

  async function discardRevision() {
    if (!window.confirm('Discard this revision? Its linked coverage will return to the review list.')) return;
    setWorking('discard');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/story-revisions/${revisionId}`, { method: 'DELETE' });
      const result = await response.json() as { discarded?: boolean; error?: string };
      if (!response.ok || !result.discarded) setMessage(result.error ?? 'The editorial revision could not be discarded.');
      else router.refresh();
    } catch {
      setMessage('The editorial revision could not be discarded.');
    } finally {
      setWorking(null);
    }
  }

  return <section className="editorial-revision-gate">
    <div><p className="eyebrow">Final editorial gate</p><h2>{published ? 'Apply to the live article' : 'Apply to the private draft'}</h2><p>{published ? 'Save the revision below before applying it. The live article remains unchanged until then, and its original publication date will be preserved.' : 'Save the revision below before applying it to the private draft.'}</p></div>
    <label><span>{published ? 'Public “What changed” summary' : 'Revision summary'}</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} minLength={20} maxLength={1000} rows={4} placeholder="Briefly explain the meaningful additions or corrections in this revision." /></label>
    <div className="editorial-revision-actions"><button type="button" disabled={working !== null} onClick={applyRevision}>{working === 'apply' ? <LoaderCircle className="admin-spinner" /> : <Check />} Apply revision</button><button type="button" disabled={working !== null} onClick={discardRevision}>{working === 'discard' ? <LoaderCircle className="admin-spinner" /> : <Trash2 />} Discard revision</button></div>
    {message ? <output>{message}</output> : null}
  </section>;
}
