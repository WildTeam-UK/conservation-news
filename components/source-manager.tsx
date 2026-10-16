'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, LoaderCircle, Plus, Rss } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export type EditorialSource = {
  id: string;
  name: string;
  homepage_url: string | null;
  feed_url: string;
  source_kind: 'rss' | 'api' | 'website';
  trust_status: 'trusted' | 'provisional' | 'blocked';
  enabled: boolean;
  last_success_at: string | null;
  last_error: string | null;
};

export function SourceManager({ sources }: { sources: EditorialSource[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [sourceKind, setSourceKind] = useState<EditorialSource['source_kind']>('rss');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function addSource(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    const { error } = await getSupabaseBrowserClient().from('sources').insert({
      name: name.trim(),
      feed_url: feedUrl.trim(),
      homepage_url: homepageUrl.trim() || null,
      source_kind: sourceKind,
      trust_status: 'provisional',
      enabled: true,
    });

    if (error) {
      setMessage(error.code === '23505'
        ? 'That feed or source URL has already been added.'
        : 'The source could not be added. Please check the details and try again.');
      setSubmitting(false);
      return;
    }

    setName('');
    setFeedUrl('');
    setHomepageUrl('');
    setSourceKind('rss');
    setMessage('Source added successfully.');
    setSubmitting(false);
    router.refresh();
  }

  async function setEnabled(source: EditorialSource, enabled: boolean) {
    setUpdatingId(source.id);
    setMessage('');

    const { error } = await getSupabaseBrowserClient()
      .from('sources')
      .update({ enabled })
      .eq('id', source.id);

    if (error) setMessage(`We could not ${enabled ? 'enable' : 'pause'} ${source.name}.`);
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="source-manager">
      <section className="source-add-card" aria-labelledby="add-source-heading">
        <div className="source-card-heading"><span><Plus /></span><div><p className="eyebrow">Add a source</p><h2 id="add-source-heading">Monitor something new</h2></div></div>
        <form className="source-form" onSubmit={addSource}>
          <div className="admin-field"><label htmlFor="source-name">Source name</label><input id="source-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mongabay" required /></div>
          <div className="source-form-row">
            <div className="admin-field"><label htmlFor="source-kind">Source type</label><select id="source-kind" value={sourceKind} onChange={(event) => setSourceKind(event.target.value as EditorialSource['source_kind'])}><option value="rss">RSS feed</option><option value="website">Website</option><option value="api">API</option></select></div>
            <div className="admin-field"><label htmlFor="feed-url">{sourceKind === 'rss' ? 'RSS feed URL' : 'Source URL'}</label><input id="feed-url" type="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.org/feed" required /></div>
          </div>
          <div className="admin-field"><label htmlFor="homepage-url">Homepage URL <span>optional</span></label><input id="homepage-url" type="url" value={homepageUrl} onChange={(event) => setHomepageUrl(event.target.value)} placeholder="https://example.org" /></div>
          {message ? <output className={message.includes('successfully') ? 'source-message success' : 'source-message'}>{message}</output> : null}
          <button className="admin-primary-button" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="admin-spinner" /> Adding source</> : <><Plus /> Add source</>}</button>
        </form>
      </section>

      <section className="source-list-section" aria-labelledby="source-list-heading">
        <div className="source-list-heading"><div><p className="eyebrow">Source library</p><h2 id="source-list-heading">{sources.length} {sources.length === 1 ? 'source' : 'sources'}</h2></div><p>New sources begin as provisional and will never publish stories automatically.</p></div>
        {sources.length === 0 ? (
          <div className="source-empty"><Rss /><h3>No sources yet</h3><p>Add the first RSS feed or website using the form.</p></div>
        ) : (
          <div className="source-list">
            {sources.map((source) => (
              <article className="source-row" key={source.id}>
                <div className="source-identity"><span><Rss /></span><div><h3>{source.name}</h3><a href={source.feed_url} target="_blank" rel="noreferrer">{source.feed_url} <ExternalLink /></a>{source.last_error ? <p className="source-collection-error">Last collection failed: {source.last_error}</p> : null}</div></div>
                <div className="source-labels"><span>{source.source_kind}</span><span className={`trust-${source.trust_status}`}>{source.trust_status}</span></div>
                <button className={`source-toggle ${source.enabled ? 'enabled' : ''}`} type="button" aria-pressed={source.enabled} disabled={updatingId === source.id} onClick={() => setEnabled(source, !source.enabled)}><span aria-hidden="true" />{source.enabled ? 'Active' : 'Paused'}</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
