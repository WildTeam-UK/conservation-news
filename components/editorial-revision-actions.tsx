'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, Sparkles, Trash2 } from 'lucide-react';

export function EditorialRevisionActions({ revisionId, published }: { revisionId: string; published: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState<'apply' | 'discard' | null>(null);
  const [message, setMessage] = useState('');

  async function applyRevision() {
    if (!window.confirm(published ? 'Generate the public update summary and apply this revision to the live article? The original publication date will be preserved.' : 'Generate the revision summary and apply this coverage revision to the private draft?')) return;
    setWorking('apply');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/story-revisions/${revisionId}`, {
        method: 'POST',
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
    <div className="editorial-revision-summary-automation"><Sparkles /><span><strong>{published ? 'Public summary generated automatically' : 'Revision summary generated automatically'}</strong><small>When you apply this revision, WildNews will compare the saved article with the proposed update and write the “What changed” note.</small></span></div>
    <div className="editorial-revision-actions"><button type="button" disabled={working !== null} onClick={applyRevision}>{working === 'apply' ? <><LoaderCircle className="admin-spinner" /> Generating and applying</> : <><Check /> Apply revision</>}</button><button type="button" disabled={working !== null} onClick={discardRevision}>{working === 'discard' ? <LoaderCircle className="admin-spinner" /> : <Trash2 />} Discard revision</button></div>
    {message ? <output>{message}</output> : null}
  </section>;
}
