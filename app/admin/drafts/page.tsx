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
  const { data: drafts, error } = await supabase.from('stories').select('id, headline, standfirst, status, updated_at, generation_metadata').eq('status', 'draft').order('updated_at', { ascending: false });
  if (error) throw new Error('Unable to load article drafts.');
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="drafts" />
    <div className="admin-shell admin-drafts-shell">
      <section className="admin-welcome candidates-heading"><div><p className="eyebrow">Private editorial workspace</p><h1>Drafts</h1><p>AI-assisted first drafts awaiting human review. Nothing here is public.</p></div><div className="candidate-summary"><FilePenLine /><strong>{drafts?.length ?? 0}</strong><span>awaiting review</span></div></section>
      {!drafts?.length ? <section className="source-empty candidate-empty"><FilePenLine /><h2>No drafts yet</h2><p>Research a candidate, then choose Generate draft.</p></section> : <section className="draft-list">{drafts.map((draft) => {
        const metadata = draft.generation_metadata as { topic_classification?: { primary_topic?: string }; model?: string };
        return <article key={draft.id}><div><p className="eyebrow">{metadata.topic_classification?.primary_topic ?? 'Conservation'} · Private draft</p><h2>{draft.headline}</h2><p>{draft.standfirst}</p><small>Updated {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(draft.updated_at))} · {metadata.model ?? 'OpenAI'}</small></div><a href={`/admin/drafts/${draft.id}`}>Review and edit <ArrowRight /></a></article>;
      })}</section>}
    </div>
  </main>;
}
