'use client';
/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ExternalLink, LoaderCircle, Merge, Pencil, RotateCcw, Tag, X } from 'lucide-react';

export type TagUsage = { id: string; title: string; slug?: string; status: string; confidence: number | null; rationale: string | null };
export type EditorialTag = {
  id: string;
  name: string;
  slug: string;
  tag_type: 'species' | 'place' | 'habitat' | 'theme';
  status: 'proposed' | 'approved' | 'retired';
  description: string | null;
  seo_title: string | null;
  meta_description: string | null;
  seo_generated_at: string | null;
  created_at: string;
  publishedCount: number;
  aliases: string[];
  usages: TagUsage[];
};

type TagAction = 'approve' | 'retire' | 'restore' | 'update' | 'merge';

function TagCard({ tag, mergeTargets, minimum, onChanged }: { tag: EditorialTag; mergeTargets: EditorialTag[]; minimum: number; onChanged: () => void }) {
  const [name, setName] = useState(tag.name);
  const [tagType, setTagType] = useState(tag.tag_type);
  const [description, setDescription] = useState(tag.description ?? '');
  const [seoTitle, setSeoTitle] = useState(tag.seo_title ?? '');
  const [metaDescription, setMetaDescription] = useState(tag.meta_description ?? '');
  const [aliases, setAliases] = useState(tag.aliases.join(', '));
  const [targetId, setTargetId] = useState('');
  const [working, setWorking] = useState<TagAction | null>(null);
  const [message, setMessage] = useState('');
  const visibleUsages = tag.usages.slice(0, 3);

  async function runAction(action: TagAction, extra: Record<string, unknown> = {}) {
    setWorking(action);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) setMessage(result.error ?? 'The tag could not be updated.');
      else onChanged();
    } catch {
      setMessage('The tag could not be updated.');
    } finally {
      setWorking(null);
    }
  }

  function saveDetails(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAction('update', { name, tagType, description, seoTitle, metaDescription, aliases: aliases.split(',').map((alias) => alias.trim()).filter(Boolean) });
  }

  return <article className={`tag-review-card tag-status-${tag.status}`}>
    <div className="tag-card-main">
      <div className="tag-card-icon"><Tag /></div>
      <div><div className="tag-card-labels"><span>{tag.tag_type}</span><span>{tag.status === 'proposed' ? 'growing' : tag.status}</span><span>{tag.publishedCount}/{minimum} published</span></div><h2>{tag.status === 'approved' ? <a href={`/tags/${tag.slug}`}>{tag.name}<ExternalLink /></a> : tag.name}</h2>{tag.aliases.length ? <p>Also recognised as: {tag.aliases.join(', ')}</p> : null}{tag.status === 'proposed' ? <p className="tag-growth-note">This archive will go live automatically after {Math.max(0, minimum - tag.publishedCount)} more qualifying {minimum - tag.publishedCount === 1 ? 'article' : 'articles'}.</p> : tag.description ? <p className="tag-growth-note">{tag.description}</p> : null}</div>
    </div>
    <div className="tag-card-actions">
      {tag.status !== 'approved' && tag.publishedCount >= minimum ? <button className="tag-approve" type="button" disabled={Boolean(working)} onClick={() => runAction('approve')}>{working === 'approve' ? <LoaderCircle className="admin-spinner" /> : <Check />} Approve</button> : null}
      {tag.status === 'retired' ? <button type="button" disabled={Boolean(working)} onClick={() => runAction('restore')}>{working === 'restore' ? <LoaderCircle className="admin-spinner" /> : <RotateCcw />} Restore</button> : <button className="tag-retire" type="button" disabled={Boolean(working)} onClick={() => runAction('retire')}>{working === 'retire' ? <LoaderCircle className="admin-spinner" /> : <X />} Retire</button>}
    </div>
    {visibleUsages.length ? <div className={`tag-usage-list${tag.status === 'approved' ? ' tag-published-usage-list' : ''}`}><strong>{tag.status === 'approved' ? `Published articles (${tag.publishedCount})` : 'Suggested article matches'}</strong>{visibleUsages.map((usage) => <div key={usage.id}><span>{tag.status === 'approved' ? 'Live' : `${usage.confidence ?? '—'}%`}</span><p>{tag.status === 'approved' && usage.slug ? <a href={`/stories/${usage.slug}`}>{usage.title}</a> : usage.title}{tag.status !== 'approved' && usage.rationale ? <small>{usage.rationale}</small> : null}</p></div>)}{tag.status === 'approved' && tag.publishedCount > visibleUsages.length ? <a className="tag-view-all" href={`/tags/${tag.slug}`}>View all {tag.publishedCount} articles <ExternalLink /></a> : null}</div> : null}
    <details className="tag-edit-panel"><summary><Pencil /> Edit, add aliases or merge <ChevronDown /></summary>
      <div className="tag-edit-grid">
        <form onSubmit={saveDetails}>
          <label><span>Canonical name</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label><span>Type</span><select value={tagType} onChange={(event) => setTagType(event.target.value as EditorialTag['tag_type'])}><option value="species">Species</option><option value="place">Place</option><option value="habitat">Habitat</option><option value="theme">Theme</option></select></label>
          <label className="tag-wide-field"><span>Aliases, separated by commas</span><input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="Rhino, rhinos" /></label>
          <label className="tag-wide-field"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Optional editorial definition" /></label>
          <label className="tag-wide-field"><span>SEO title</span><input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder="Generated once the archive qualifies" /></label>
          <label className="tag-wide-field"><span>Meta description</span><textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={2} placeholder="Generated once the archive qualifies" /></label>
          <button type="submit" disabled={Boolean(working)}>{working === 'update' ? <LoaderCircle className="admin-spinner" /> : <Check />} Save details</button>
        </form>
        <div className="tag-merge-control"><div><Merge /><span><strong>Merge duplicate</strong><small>Moves every article and alias to the selected tag, then removes this one.</small></span></div><select aria-label="Tag to keep after merging" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Choose the tag to keep</option>{mergeTargets.map((target) => <option value={target.id} key={target.id}>{target.name} · {target.tag_type} · {target.status}</option>)}</select><button type="button" disabled={!targetId || Boolean(working)} onClick={() => runAction('merge', { targetId })}>{working === 'merge' ? <LoaderCircle className="admin-spinner" /> : <Merge />} Merge into selected tag</button></div>
      </div>
    </details>
    {message ? <p className="tag-action-message">{message}</p> : null}
  </article>;
}

export function TagManager({ initialTags, minPublishedStories }: { initialTags: EditorialTag[]; minPublishedStories: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'proposed' | 'approved' | 'retired' | 'all'>('proposed');
  const visibleTags = filter === 'all' ? initialTags : initialTags.filter((tag) => tag.status === filter);
  const mergeTargets = initialTags.filter((tag) => tag.status !== 'retired');
  return <section className="tag-manager" aria-label="Tag review queue">
    <div className="tag-filter-bar"><div>{(['proposed', 'approved', 'retired', 'all'] as const).map((status) => <button className={filter === status ? 'active' : ''} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} key={status}>{status === 'proposed' ? 'growing' : status === 'approved' ? 'live' : status}<span>{status === 'all' ? initialTags.length : initialTags.filter((tag) => tag.status === status).length}</span></button>)}</div><p>The system reuses known tags and publishes qualifying archives automatically. Manual controls remain for exceptions, aliases and merges.</p></div>
    {visibleTags.length ? <div className="tag-review-list">{visibleTags.map((tag) => <TagCard tag={tag} mergeTargets={mergeTargets.filter((target) => target.id !== tag.id)} minimum={minPublishedStories} onChanged={() => router.refresh()} key={tag.id} />)}</div> : <div className="source-empty"><Tag /><h3>No {filter === 'all' ? '' : filter === 'proposed' ? 'growing' : filter === 'approved' ? 'live' : filter} tags</h3><p>New AI suggestions will appear here after a research pack is completed.</p></div>}
  </section>;
}
