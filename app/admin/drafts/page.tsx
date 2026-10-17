import type { Metadata } from 'next';
import { ArrowRight, BellRing, FilePenLine, Search } from 'lucide-react';
import { AddToQueueButton } from '@/components/add-to-queue-button';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { stripSourceMarkers } from '@/lib/article-text';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Drafts | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type DraftView = 'all' | 'scheduled' | 'unscheduled' | 'held';

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });

function queueGroup(status?: string): Exclude<DraftView, 'all'> {
  if (status === 'held') return 'held';
  if (status && ['queued', 'scheduled', 'publishing'].includes(status)) return 'scheduled';
  return 'unscheduled';
}

function queueLabel(status?: string) {
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'queued') return 'Waiting for slot';
  if (status === 'publishing') return 'Publishing';
  if (status === 'held') return 'Held for review';
  return 'Not scheduled';
}

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const filters = await searchParams;
  const view: DraftView = ['all', 'scheduled', 'unscheduled', 'held'].includes(filters.view ?? '') ? filters.view as DraftView : 'all';
  const search = (filters.q ?? '').trim();
  const { supabase, admin } = await requireContentAdmin();
  const { data: stories, error } = await supabase.from('stories').select('id, cluster_id, headline, standfirst, status, updated_at, published_at, generation_metadata').in('status', ['draft', 'published']).order('updated_at', { ascending: false });
  if (error) throw new Error('Unable to load article drafts.');
  const clusterIds = (stories ?? []).flatMap((story) => story.cluster_id ? [story.cluster_id] : []);
  const { data: updateRows } = clusterIds.length ? await supabase.from('story_cluster_updates').select('cluster_id').in('cluster_id', clusterIds).eq('status', 'pending_review') : { data: [] };
  const updateCounts = new Map<string, number>();
  for (const update of updateRows ?? []) updateCounts.set(update.cluster_id, (updateCounts.get(update.cluster_id) ?? 0) + 1);
  const drafts = stories?.filter((story) => story.status === 'draft') ?? [];
  const published = stories?.filter((story) => story.status === 'published') ?? [];
  const draftIds = drafts.map((draft) => draft.id);
  const { data: queueRows, error: queueError } = draftIds.length
    ? await supabase.from('publication_queue').select('id, story_id, status, scheduled_for, hold_reason').in('story_id', draftIds)
    : { data: [], error: null };
  if (queueError) throw new Error('Unable to load draft publishing statuses.');
  const queueByStory = new Map((queueRows ?? []).map((row) => [row.story_id, row]));
  const counts = {
    all: drafts.length,
    scheduled: drafts.filter((draft) => queueGroup(queueByStory.get(draft.id)?.status) === 'scheduled').length,
    unscheduled: drafts.filter((draft) => queueGroup(queueByStory.get(draft.id)?.status) === 'unscheduled').length,
    held: drafts.filter((draft) => queueGroup(queueByStory.get(draft.id)?.status) === 'held').length,
  };
  const searchLower = search.toLocaleLowerCase('en-GB');
  const visibleDrafts = drafts.filter((draft) => {
    const matchesView = view === 'all' || queueGroup(queueByStory.get(draft.id)?.status) === view;
    const matchesSearch = !searchLower || `${draft.headline} ${draft.standfirst}`.toLocaleLowerCase('en-GB').includes(searchLower);
    return matchesView && matchesSearch;
  });
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="drafts" />
    <div className="admin-shell admin-drafts-shell">
      <section className="admin-welcome candidates-heading"><div><p className="eyebrow">Editorial workspace</p><h1>Articles</h1><p>Review private AI-assisted drafts and manage your live article library.</p></div><div className="candidate-summary"><FilePenLine /><strong>{drafts?.length ?? 0}</strong><span>awaiting review</span></div></section>
      {drafts.length ? <div className="draft-library-tools"><nav aria-label="Filter private drafts">{(['all', 'scheduled', 'unscheduled', 'held'] as DraftView[]).map((option) => { const query = new URLSearchParams(); if (option !== 'all') query.set('view', option); if (search) query.set('q', search); return <a className={view === option ? 'active' : ''} href={`/admin/drafts${query.size ? `?${query}` : ''}`} key={option}>{option === 'unscheduled' ? 'Not scheduled' : option}<span>{counts[option]}</span></a>; })}</nav><form action="/admin/drafts"><input type="hidden" name="view" value={view === 'all' ? '' : view} /><label><Search /><input aria-label="Search drafts" name="q" defaultValue={search} placeholder="Search article titles…" /></label><button type="submit">Search</button>{search ? <a href={`/admin/drafts${view === 'all' ? '' : `?view=${view}`}`}>Clear</a> : null}</form></div> : null}
      {!drafts.length ? <section className="source-empty candidate-empty"><FilePenLine /><h2>No drafts yet</h2><p>Research a candidate, then choose Generate draft.</p></section> : visibleDrafts.length ? <section className="draft-list">{visibleDrafts.map((draft) => {
        const metadata = draft.generation_metadata as { topic_classification?: { primary_topic?: string }; model?: string };
        const updates = draft.cluster_id ? updateCounts.get(draft.cluster_id) ?? 0 : 0;
        const queue = queueByStory.get(draft.id);
        const group = queueGroup(queue?.status);
        return <article key={draft.id}><div><div className="draft-card-labels"><p className="eyebrow">{metadata.topic_classification?.primary_topic ?? 'Conservation'} · Private draft</p><span className={`draft-queue-badge ${group}`}>{queueLabel(queue?.status)}</span></div>{updates ? <p className="new-coverage-badge"><BellRing /> {updates} new coverage {updates === 1 ? 'source' : 'sources'} to review</p> : null}<h2>{draft.headline}</h2><p>{stripSourceMarkers(draft.standfirst)}</p><small>Updated {dateTime.format(new Date(draft.updated_at))} · {metadata.model ?? 'OpenAI'}{queue?.scheduled_for ? ` · Publishes ${dateTime.format(new Date(queue.scheduled_for))}` : queue?.hold_reason ? ` · ${queue.hold_reason}` : ''}</small></div><div className="draft-card-actions">{group === 'unscheduled' ? <AddToQueueButton storyId={draft.id} compact /> : null}<a href={`/admin/drafts/${draft.id}`}>Review and edit <ArrowRight /></a></div></article>;
      })}</section> : <section className="source-empty candidate-empty draft-filter-empty"><Search /><h2>No matching drafts</h2><p>Try another search or choose a different queue status.</p></section>}
      {published.length ? <section className="published-admin-list"><div className="source-list-heading"><div><p className="eyebrow">Live library</p><h2>{published.length} published {published.length === 1 ? 'article' : 'articles'}</h2></div><p>Open an article to view it publicly or return it to drafts for corrections.</p></div><div className="draft-list">{published.map((story) => { const updates = story.cluster_id ? updateCounts.get(story.cluster_id) ?? 0 : 0; return <article key={story.id}><div><p className="eyebrow">Published</p>{updates ? <p className="new-coverage-badge"><BellRing /> {updates} new coverage {updates === 1 ? 'source' : 'sources'} to review</p> : null}<h2>{story.headline}</h2><p>{stripSourceMarkers(story.standfirst)}</p><small>Published {story.published_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(story.published_at)) : ''}</small></div><a href={`/admin/drafts/${story.id}`}>View article controls <ArrowRight /></a></article>; })}</div></section> : null}
    </div>
  </main>;
}
