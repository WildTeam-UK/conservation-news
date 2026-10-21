'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleAlert, ExternalLink, Globe2, LoaderCircle, LockKeyhole, X } from 'lucide-react';
import type { StoryDraftContent } from '@/lib/openai/draft-story';
import { publicationChecks } from '@/lib/publishing';
import { londonLongDateTimeFormatter } from '@/lib/date-format';

export function PublishControls({ storyId, slug, status, publishedAt, content, sourceCount }: { storyId: string; slug: string; status: string; publishedAt: string | null; content: StoryDraftContent; sourceCount: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const checks = publicationChecks(content, sourceCount);
  const ready = checks.every((check) => check.passed);

  async function changePublication(action: 'publish' | 'unpublish') {
    if (action === 'publish' && !window.confirm('Publish this article now? It will become publicly accessible immediately.')) return;
    if (action === 'unpublish' && !window.confirm('Unpublish this article? Its public URL will stop working until it is published again.')) return;
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/drafts/${storyId}/publish`, { method: action === 'publish' ? 'POST' : 'DELETE' });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) setMessage(result.error ?? `The article could not be ${action}ed.`);
      else {
        setMessage(action === 'publish' ? 'Article published successfully.' : 'Article returned to drafts.');
        router.refresh();
      }
    } catch {
      setMessage(`The article could not be ${action}ed.`);
    } finally {
      setWorking(false);
    }
  }

  if (status === 'published') return <section className="publish-panel published"><div className="publish-panel-heading"><span><Globe2 /></span><div><p className="eyebrow">Public article</p><h2>Published</h2><p>Published {publishedAt ? londonLongDateTimeFormatter.format(new Date(publishedAt)) : 'now'}.</p></div></div><div className="publish-panel-actions"><a href={`/stories/${slug}`} target="_blank" rel="noreferrer">View public article <ExternalLink /></a><button type="button" disabled={working} onClick={() => changePublication('unpublish')}>{working ? <LoaderCircle className="admin-spinner" /> : <LockKeyhole />} Unpublish to edit</button></div>{message ? <output>{message}</output> : null}</section>;

  return <section className="publish-panel"><div className="publish-panel-heading"><span><Globe2 /></span><div><p className="eyebrow">Final editorial gate</p><h2>Ready to publish?</h2><p>Publishing makes this article immediately available on the public website.</p></div></div><ul>{checks.map((check) => <li className={check.passed ? 'passed' : ''} key={check.key}>{check.passed ? <Check /> : <X />} {check.label}</li>)}</ul><div className="publish-panel-actions"><button className="publish-button" type="button" disabled={!ready || working} onClick={() => changePublication('publish')}>{working ? <LoaderCircle className="admin-spinner" /> : ready ? <Globe2 /> : <CircleAlert />} {ready ? 'Publish article' : 'Complete checklist first'}</button></div>{message ? <output>{message}</output> : null}</section>;
}
