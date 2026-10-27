'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, Sparkles, Trash2 } from 'lucide-react';
import { useAdminConfirmation } from '@/components/admin-confirmation';

export function EditorialRevisionActions({ revisionId, published, contentChanged }: { revisionId: string; published: boolean; contentChanged: boolean }) {
  const router = useRouter();
  const { confirmAdminAction } = useAdminConfirmation();
  const [working, setWorking] = useState<'apply' | 'discard' | null>(null);
  const [message, setMessage] = useState('');

  async function applyRevision() {
    const confirmed = await confirmAdminAction({
      title: contentChanged ? 'Apply this editorial revision?' : 'Apply this source update?',
      description: contentChanged
        ? published ? 'WildNews will generate the public update summary and apply the revision to the live article. The original publication date will be preserved.' : 'WildNews will generate the revision summary and apply this coverage revision to the private draft.'
        : 'The source will be retained without changing the public article copy, update date or public “What changed” note.',
      confirmLabel: contentChanged ? 'Apply revision' : 'Apply source update',
    });
    if (!confirmed) return;
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
    const confirmed = await confirmAdminAction({
      title: 'Discard this revision?',
      description: 'Its linked coverage will return to the review list.',
      confirmLabel: 'Discard revision',
      tone: 'warning',
    });
    if (!confirmed) return;
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
    <div className="editorial-revision-summary-automation"><Sparkles /><span><strong>{contentChanged ? published ? 'Public summary generated automatically' : 'Revision summary generated automatically' : 'Source-only update detected'}</strong><small>{contentChanged ? 'When you apply this revision, WildNews will compare the saved article with the proposed update and write the “What changed” note.' : 'The proposed article copy matches the current article. Applying this revision will retain the additional source without adding a public update date or note.'}</small></span></div>
    <div className="editorial-revision-actions"><button type="button" disabled={working !== null} onClick={applyRevision}>{working === 'apply' ? <><LoaderCircle className="admin-spinner" /> {contentChanged ? 'Generating and applying' : 'Applying source update'}</> : <><Check /> {contentChanged ? 'Apply revision' : 'Apply source update'}</>}</button><button type="button" disabled={working !== null} onClick={discardRevision}>{working === 'discard' ? <LoaderCircle className="admin-spinner" /> : <Trash2 />} Discard revision</button></div>
    {message ? <output>{message}</output> : null}
  </section>;
}
