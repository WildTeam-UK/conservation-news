import type { Metadata } from 'next';
import { ArrowRight, FilePenLine } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Drafts | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function DraftsPage() {
  const { supabase, admin } = await requireContentAdmin();
  const { data: stories, error } = await supabase.from('stories').select('id, headline, standfirst, status, updated_at, published_at, generation_metadata').in('status', ['draft', 'published']).order('updated_at', { ascending: false });
  if (error) throw new Error('Unable to load article drafts.');
  const drafts = stories?.filter((story) => story.status === 'draft') ?? [];
  const published = stories?.filter((story) => story.status === 'published') ?? [];
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="drafts" />
    <div className="admin-shell admin-drafts-shell">
      <section className="admin-welcome candidates-heading"><div><p className="eyebrow">Private editorial workspace</p><h1>Drafts</h1><p>AI-assisted first drafts awaiting human review. Nothing here is public.</p></div><div className="candidate-summary"><FilePenLine /><strong>{drafts?.length ?? 0}</strong><span>awaiting review</span></div></section>
      {!drafts.length ? <section className="source-empty candidate-empty"><FilePenLine /><h2>No drafts yet</h2><p>Research a candidate, then choose Generate draft.</p></section> : <section className="draft-list">{drafts.map((draft) => {
        const metadata = draft.generation_metadata as { topic_classification?: { primary_topic?: string }; model?: string };
        return <article key={draft.id}><div><p className="eyebrow">{metadata.topic_classification?.primary_topic ?? 'Conservation'} · Private draft</p><h2>{draft.headline}</h2><p>{draft.standfirst}</p><small>Updated {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(draft.updated_at))} · {metadata.model ?? 'OpenAI'}</small></div><a href={`/admin/drafts/${draft.id}`}>Review and edit <ArrowRight /></a></article>;
      })}</section>}
      {published.length ? <section className="published-admin-list"><div className="source-list-heading"><div><p className="eyebrow">Live library</p><h2>{published.length} published {published.length === 1 ? 'article' : 'articles'}</h2></div><p>Open an article to view it publicly or return it to drafts for corrections.</p></div><div className="draft-list">{published.map((story) => <article key={story.id}><div><p className="eyebrow">Published</p><h2>{story.headline}</h2><p>{story.standfirst}</p><small>Published {story.published_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(story.published_at)) : ''}</small></div><a href={`/admin/drafts/${story.id}`}>View article controls <ArrowRight /></a></article>)}</div></section> : null}
    </div>
  </main>;
}
