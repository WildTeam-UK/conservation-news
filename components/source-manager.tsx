'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, LoaderCircle, Plus, Radar, Rss, Search, X } from 'lucide-react';
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

export type SuggestedSource = {
  id: string;
  domain: string;
  name: string;
  homepage_url: string;
  feed_url: string | null;
  feed_status: 'unchecked' | 'checking' | 'found' | 'not_found' | 'failed';
  source_type: 'primary' | 'academic' | 'government' | 'organisation' | 'news' | 'other';
  quality_score: number;
  originality_score: number;
  recommendation_score: number;
  last_reason: string | null;
  last_seen_at: string;
  mentionCount: number;
};

export function SourceManager({ sources, suggestions }: { sources: EditorialSource[]; suggestions: SuggestedSource[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [sourceKind, setSourceKind] = useState<EditorialSource['source_kind']>('rss');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);

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

  async function refreshSuggestions() {
    setRefreshingSuggestions(true);
    setSuggestionMessage('');
    const response = await fetch('/api/admin/source-suggestions', { method: 'POST' });
    const result = await response.json().catch(() => ({})) as { suggestions?: number; checked?: number; found?: number; error?: string };
    if (!response.ok) setSuggestionMessage(result.error ?? 'Source recommendations could not be refreshed.');
    else setSuggestionMessage(`Reviewed the research library and checked ${result.checked ?? 0} promising sites. ${result.found ?? 0} new RSS ${result.found === 1 ? 'feed was' : 'feeds were'} found.`);
    setRefreshingSuggestions(false);
    if (response.ok) window.location.reload();
  }

  async function runSuggestionAction(suggestion: SuggestedSource, action: 'find_feed' | 'add' | 'dismiss') {
    setUpdatingId(suggestion.id);
    setSuggestionMessage('');
    const response = await fetch(`/api/admin/source-suggestions/${suggestion.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const result = await response.json().catch(() => ({})) as { found?: boolean; error?: string };
    if (!response.ok) setSuggestionMessage(result.error ?? 'The source recommendation could not be updated.');
    else if (action === 'find_feed') setSuggestionMessage(result.found ? `A valid RSS feed was found for ${suggestion.name}.` : `No public RSS feed was found for ${suggestion.name}. You can still review the site manually.`);
    else if (action === 'add') setSuggestionMessage(`${suggestion.name} was added as an active provisional source.`);
    else setSuggestionMessage(`${suggestion.name} was removed from recommendations.`);
    setUpdatingId(null);
    if (response.ok) window.location.reload();
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

      <section className="source-suggestion-section" aria-labelledby="source-suggestions-heading">
        <div className="source-suggestion-heading"><div><p className="eyebrow">Discovered during research</p><h2 id="source-suggestions-heading">Recommended sources</h2><p>WildNews learns from the evidence it already consults. Repeated, authoritative domains rise through this list; nothing is monitored until you add it.</p></div><button type="button" disabled={refreshingSuggestions} onClick={refreshSuggestions}>{refreshingSuggestions ? <LoaderCircle className="admin-spinner" /> : <Radar />} Refresh recommendations</button></div>
        {suggestionMessage ? <output className={suggestionMessage.includes('could not') ? 'source-message' : 'source-message success'}>{suggestionMessage}</output> : null}
        {suggestions.length ? <div className="source-suggestion-list">{suggestions.map((suggestion) => (
          <article className="source-suggestion-card" key={suggestion.id}>
            <div className="source-suggestion-score"><strong>{suggestion.recommendation_score}</strong><span>score</span></div>
            <div className="source-suggestion-copy"><div className="source-suggestion-labels"><span>{suggestion.source_type}</span><span>{suggestion.mentionCount} {suggestion.mentionCount === 1 ? 'story' : 'stories'}</span><span>{suggestion.feed_status === 'found' ? 'RSS found' : suggestion.feed_status.replace('_', ' ')}</span></div><h3>{suggestion.name}</h3><a href={suggestion.homepage_url} target="_blank" rel="noreferrer">{suggestion.domain} <ExternalLink /></a>{suggestion.last_reason ? <p>{suggestion.last_reason}</p> : null}<small>Quality {suggestion.quality_score} · Originality {suggestion.originality_score}</small>{suggestion.feed_url ? <a className="source-found-feed" href={suggestion.feed_url} target="_blank" rel="noreferrer">Validated feed: {suggestion.feed_url}</a> : null}</div>
            <div className="source-suggestion-actions">{suggestion.feed_status === 'found' ? <button className="source-suggestion-add" type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'add')}>{updatingId === suggestion.id ? <LoaderCircle className="admin-spinner" /> : <Check />} Add feed</button> : <button type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'find_feed')}>{updatingId === suggestion.id ? <LoaderCircle className="admin-spinner" /> : <Search />} {suggestion.feed_status === 'not_found' ? 'Check again' : 'Find RSS feed'}</button>}<button className="source-suggestion-dismiss" type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'dismiss')}><X /> Dismiss</button></div>
          </article>
        ))}</div> : <div className="source-empty"><Radar /><h3>No recommendations yet</h3><p>Refresh recommendations to analyse completed research packs. Future research will update this list automatically.</p></div>}
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
