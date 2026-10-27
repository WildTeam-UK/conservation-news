'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BarChart3, Check, CircleCheck, ExternalLink, LoaderCircle, Plus, Radar, Rss, Search, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export type EditorialSource = {
  id: string;
  name: string;
  homepage_url: string | null;
  feed_url: string;
  source_kind: 'rss' | 'api' | 'website';
  enabled: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  items_collected: number;
  items_collected_30d: number;
  items_assessed: number;
  items_expired: number;
  items_unresolved: number;
  last_item_at: string | null;
  candidate_clusters: number;
  candidate_clusters_30d: number;
  rejected_clusters: number;
  research_uses: number;
  research_uses_30d: number;
  published_story_uses: number;
  published_story_uses_30d: number;
  coverage_updates: number;
  incorporated_updates: number;
  checks_30d: number;
  successful_checks_30d: number;
  failed_checks_30d: number;
  new_items_30d: number;
  published_news_30d: number;
  candidate_yield_30d: number | string | null;
  contribution_share_30d: number | string;
};

export type SourceNetworkRecommendation = {
  id: string;
  kind: 'dominance' | 'coverage_gap' | 'collection_failure' | 'low_yield';
  title: string;
  summary: string;
  first_seen_at: string;
  last_seen_at: string;
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
  description: string | null;
  last_seen_at: string;
  mentionCount: number;
  citationCount: number;
};

const percentage = (value: number | string | null) => value === null ? 'Not enough data' : `${Math.round(Number(value) * 100)}%`;
const formattedDate = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Europe/London' }).format(new Date(value));

function sourceHealth(source: EditorialSource) {
  if (!source.enabled) return { label: 'Paused', tone: 'paused' };
  if (source.failed_checks_30d >= 3 || source.last_error) return { label: 'Needs attention', tone: 'attention' };
  if (source.checks_30d === 0 || source.items_collected_30d === 0) return { label: 'Quiet', tone: 'quiet' };
  return { label: 'Healthy', tone: 'healthy' };
}

export function SourceManager({ sources, suggestions, networkRecommendations, view }: { sources: EditorialSource[]; suggestions: SuggestedSource[]; networkRecommendations: SourceNetworkRecommendation[]; view: 'monitored' | 'recommendations' }) {
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
  const activeSources = sources.filter((source) => source.enabled).length;
  const attentionSources = sources.filter((source) => source.enabled && (source.failed_checks_30d >= 3 || Boolean(source.last_error))).length;
  const publishedNews = sources[0]?.published_news_30d ?? 0;
  const leadingSource = sources.reduce<EditorialSource | null>((leader, source) => !leader || Number(source.contribution_share_30d) > Number(leader.contribution_share_30d) ? source : leader, null);

  async function addSource(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const { error } = await getSupabaseBrowserClient().from('sources').insert({ name: name.trim(), feed_url: feedUrl.trim(), homepage_url: homepageUrl.trim() || null, source_kind: sourceKind, trust_status: 'provisional', enabled: true });
    if (error) {
      setMessage(error.code === '23505' ? 'That feed or source URL has already been added.' : 'The source could not be added. Please check the details and try again.');
      setSubmitting(false);
      return;
    }
    setName(''); setFeedUrl(''); setHomepageUrl(''); setSourceKind('rss'); setMessage('Source added successfully.'); setSubmitting(false); router.refresh();
  }

  async function setEnabled(source: EditorialSource, enabled: boolean) {
    setUpdatingId(source.id); setMessage('');
    const { error } = await getSupabaseBrowserClient().from('sources').update({ enabled }).eq('id', source.id);
    if (error) setMessage(`We could not ${enabled ? 'enable' : 'pause'} ${source.name}.`);
    setUpdatingId(null); router.refresh();
  }

  async function refreshSuggestions() {
    setRefreshingSuggestions(true); setSuggestionMessage('');
    const response = await fetch('/api/admin/source-suggestions', { method: 'POST' });
    const result = await response.json().catch(() => ({})) as { checked?: number; found?: number; openRecommendations?: number; error?: string };
    if (!response.ok) setSuggestionMessage(result.error ?? 'Source recommendations could not be refreshed.');
    else setSuggestionMessage(`Reviewed the source network and research library. ${result.openRecommendations ?? 0} network signals are open and ${result.found ?? 0} usable RSS ${result.found === 1 ? 'feed was' : 'feeds were'} found.`);
    setRefreshingSuggestions(false);
    if (response.ok) window.location.reload();
  }

  async function runNetworkAction(recommendation: SourceNetworkRecommendation, action: 'accept' | 'dismiss') {
    setUpdatingId(recommendation.id); setSuggestionMessage('');
    const response = await fetch(`/api/admin/source-recommendations/${recommendation.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setSuggestionMessage(result.error ?? 'The source-network recommendation could not be updated.');
    else setSuggestionMessage(action === 'accept' ? 'Recommendation accepted for the source improvement plan. No source settings were changed.' : 'Recommendation dismissed. The decision is retained as calibration evidence.');
    setUpdatingId(null);
    if (response.ok) window.location.reload();
  }

  async function runSuggestionAction(suggestion: SuggestedSource, action: 'find_feed' | 'add' | 'dismiss') {
    setUpdatingId(suggestion.id); setSuggestionMessage('');
    const response = await fetch(`/api/admin/source-suggestions/${suggestion.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const result = await response.json().catch(() => ({})) as { found?: boolean; error?: string };
    if (!response.ok) setSuggestionMessage(result.error ?? 'The source recommendation could not be updated.');
    else if (action === 'find_feed') setSuggestionMessage(result.found ? `A valid RSS feed was found for ${suggestion.name}.` : `No public RSS feed was found for ${suggestion.name}. You can still review the site manually.`);
    else if (action === 'add') setSuggestionMessage(`${suggestion.name} was added as an active provisional source.`);
    else setSuggestionMessage(`${suggestion.name} was removed from recommendations.`);
    setUpdatingId(null);
    if (response.ok) window.location.reload();
  }

  return <div className="source-manager">
    {view === 'recommendations' ? <>
      <section className="source-network-section" aria-labelledby="source-network-heading">
        <div className="source-suggestion-heading"><div><p className="eyebrow">Editorial signals</p><h2 id="source-network-heading">{networkRecommendations.length} source-network {networkRecommendations.length === 1 ? 'recommendation' : 'recommendations'}</h2><p>Evidence-led prompts for improving the source mix. Accepting or dismissing records your editorial judgement but never changes a source automatically.</p></div><button type="button" disabled={refreshingSuggestions} onClick={refreshSuggestions}>{refreshingSuggestions ? <LoaderCircle className="admin-spinner" /> : <Radar />} Refresh</button></div>
        {suggestionMessage ? <output className={suggestionMessage.includes('could not') ? 'source-message' : 'source-message success'}>{suggestionMessage}</output> : null}
        {networkRecommendations.length ? <div className="source-network-list">{networkRecommendations.map((recommendation) => <article className="source-network-card" key={recommendation.id}>
          <span className={`source-network-icon ${recommendation.kind}`} aria-hidden="true">{recommendation.kind === 'dominance' || recommendation.kind === 'collection_failure' ? <AlertTriangle /> : <BarChart3 />}</span>
          <div><span className="source-network-kind">{recommendation.kind.replace('_', ' ')}</span><h3>{recommendation.title}</h3><p>{recommendation.summary}</p><small>First identified {formattedDate(recommendation.first_seen_at)}</small></div>
          <div className="source-suggestion-actions"><button className="source-suggestion-add" type="button" disabled={updatingId === recommendation.id} onClick={() => runNetworkAction(recommendation, 'accept')}><Check /> Accept</button><button className="source-suggestion-dismiss" type="button" disabled={updatingId === recommendation.id} onClick={() => runNetworkAction(recommendation, 'dismiss')}><X /> Dismiss</button></div>
        </article>)}</div> : <div className="source-empty"><CircleCheck /><h3>No open network signals</h3><p>The latest review found no source dominance, repeated failures, low-yield feeds or obvious topic gaps.</p></div>}
      </section>
      <section className="source-suggestion-section" aria-labelledby="source-suggestions-heading">
        <div className="source-suggestion-heading"><div><p className="eyebrow">Publishers discovered during research</p><h2 id="source-suggestions-heading">{suggestions.length} ranked {suggestions.length === 1 ? 'prospect' : 'prospects'}</h2><p>Ranked using research reuse, article citations, editorial fit and RSS availability. Nothing is monitored until you add it.</p></div></div>
        {suggestions.length ? <div className="source-suggestion-list">{suggestions.map((suggestion) => <article className="source-suggestion-card" key={suggestion.id}>
          <div className="source-suggestion-score" aria-label={`Recommendation score ${suggestion.recommendation_score}`}><strong>{suggestion.recommendation_score}</strong></div>
          <div className="source-suggestion-copy"><div className="source-suggestion-labels"><span>{suggestion.source_type}</span><span>{suggestion.feed_status === 'found' ? 'RSS found' : 'RSS not checked'}</span></div><h3>{suggestion.name}</h3><a href={suggestion.homepage_url} target="_blank" rel="noopener noreferrer">{suggestion.domain} <ExternalLink /></a><p>{suggestion.description ?? 'Publisher discovered through WildNews research. Refresh recommendations to generate its profile.'}</p><p className="source-suggestion-usage">Used in research for <strong>{suggestion.mentionCount}</strong> {suggestion.mentionCount === 1 ? 'article' : 'articles'} · Cited as a source in <strong>{suggestion.citationCount}</strong> {suggestion.citationCount === 1 ? 'article' : 'articles'}</p>{suggestion.feed_url ? <a className="source-found-feed" href={suggestion.feed_url} target="_blank" rel="noopener noreferrer">Validated feed: {suggestion.feed_url}</a> : null}</div>
          <div className="source-suggestion-actions">{suggestion.feed_status === 'found' ? <button className="source-suggestion-add" type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'add')}>{updatingId === suggestion.id ? <LoaderCircle className="admin-spinner" /> : <Check />} Add feed</button> : <button type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'find_feed')}>{updatingId === suggestion.id ? <LoaderCircle className="admin-spinner" /> : <Search />} {suggestion.feed_status === 'not_found' ? 'Check again' : 'Find RSS feed'}</button>}<button className="source-suggestion-dismiss" type="button" disabled={updatingId === suggestion.id} onClick={() => runSuggestionAction(suggestion, 'dismiss')}><X /> Dismiss</button></div>
        </article>)}</div> : <div className="source-empty"><Radar /><h3>No publisher prospects yet</h3><p>Refresh recommendations to analyse completed research packs. Future research will update this list automatically.</p></div>}
      </section>
    </> : null}

    {view === 'monitored' ? <>
      <section className="source-health-summary" aria-label="Source network summary"><article><strong>{activeSources}</strong><span>Active sources</span></article><article><strong>{attentionSources}</strong><span>Need attention</span></article><article><strong>{publishedNews}</strong><span>Articles in 30 days</span></article><article><strong>{leadingSource ? percentage(leadingSource.contribution_share_30d) : '0%'}</strong><span>Largest source contribution</span></article></section>
      <p className="source-metric-note">Contribution shows how many recent articles drew on a source. One article can use several sources, so shares can overlap. These measures inform source improvement and never alter candidate ranking.</p>
      <details className="source-add-disclosure"><summary><span><Plus /><span><strong>Add a source</strong><small>Monitor another RSS feed, website or API.</small></span></span><span>Open form</span></summary><section className="source-add-card" aria-labelledby="add-source-heading">
        <div className="source-card-heading"><span><Plus /></span><div><p className="eyebrow">New source</p><h2 id="add-source-heading">Monitor something new</h2></div></div>
        <form className="source-form" onSubmit={addSource}><div className="admin-field"><label htmlFor="source-name">Source name</label><input id="source-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mongabay" required /></div><div className="source-form-row"><div className="admin-field"><label htmlFor="source-kind">Source type</label><select id="source-kind" value={sourceKind} onChange={(event) => setSourceKind(event.target.value as EditorialSource['source_kind'])}><option value="rss">RSS feed</option><option value="website">Website</option><option value="api">API</option></select></div><div className="admin-field"><label htmlFor="feed-url">{sourceKind === 'rss' ? 'RSS feed URL' : 'Source URL'}</label><input id="feed-url" type="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.org/feed" required /></div></div><div className="admin-field"><label htmlFor="homepage-url">Homepage URL <span>optional</span></label><input id="homepage-url" type="url" value={homepageUrl} onChange={(event) => setHomepageUrl(event.target.value)} placeholder="https://example.org" /></div>{message ? <output className={message.includes('successfully') ? 'source-message success' : 'source-message'}>{message}</output> : null}<button className="admin-primary-button" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="admin-spinner" /> Adding source</> : <><Plus /> Add source</>}</button></form>
      </section></details>
      <section className="source-list-section" aria-labelledby="source-list-heading"><div className="source-list-heading"><div><p className="eyebrow">Source performance</p><h2 id="source-list-heading">{sources.length} monitored {sources.length === 1 ? 'source' : 'sources'}</h2></div><p>Recent collection, editorial yield and published contribution in one place.</p></div>
        {sources.length === 0 ? <div className="source-empty"><Rss /><h3>No sources yet</h3><p>Add the first RSS feed or website using the form.</p></div> : <div className="source-performance-list">{sources.map((source) => { const health = sourceHealth(source); return <article className="source-performance-card" key={source.id}>
          <div className="source-performance-heading"><div className="source-identity"><span><Rss /></span><div><h3>{source.name}</h3><a href={source.feed_url} target="_blank" rel="noopener noreferrer">{source.feed_url} <ExternalLink /></a></div></div><div className="source-performance-controls"><span className={`source-health ${health.tone}`}>{health.label}</span><button className={`source-toggle ${source.enabled ? 'enabled' : ''}`} type="button" aria-pressed={source.enabled} disabled={updatingId === source.id} onClick={() => setEnabled(source, !source.enabled)}><span aria-hidden="true" />{source.enabled ? 'Active' : 'Paused'}</button></div></div>
          {source.last_error ? <p className="source-collection-error">Latest collection issue: {source.last_error}</p> : null}
          <dl className="source-performance-metrics"><div><dt>Collected</dt><dd>{source.items_collected_30d}</dd><small>last 30 days</small></div><div><dt>Candidate yield</dt><dd>{percentage(source.candidate_yield_30d)}</dd><small>{source.candidate_clusters_30d} candidate contributions</small></div><div><dt>Used in research</dt><dd>{source.research_uses_30d}</dd><small>last 30 days</small></div><div><dt>Published use</dt><dd>{source.published_story_uses_30d}</dd><small>{percentage(source.contribution_share_30d)} of recent articles</small></div></dl>
          <details className="source-performance-details"><summary>View lifetime and collection details</summary><div><span><strong>{source.items_collected}</strong> items collected</span><span><strong>{source.candidate_clusters}</strong> candidate contributions</span><span><strong>{source.published_story_uses}</strong> published uses</span><span><strong>{source.incorporated_updates}</strong> incorporated updates</span><span><strong>{source.successful_checks_30d}/{source.checks_30d}</strong> successful checks</span><span><strong>{source.items_unresolved}</strong> unresolved items</span></div></details>
        </article>; })}</div>}
      </section>
    </> : null}
  </div>;
}
