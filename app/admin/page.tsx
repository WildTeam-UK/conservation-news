import type { Metadata } from 'next';
import { BookOpenText, Newspaper, Rss, Sparkles } from 'lucide-react';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { AdminNav } from '@/components/admin-nav';
import { Brand } from '@/components/brand';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial dashboard | WILDNEWS',
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const { supabase, admin } = await requireContentAdmin();
  const [draftsResult, publishedResult, sourcesResult] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true),
  ]);

  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>

      <AdminNav active="dashboard" />

      <div className="admin-shell">
        <section className="admin-welcome" aria-labelledby="admin-heading">
          <p className="eyebrow">Editorial dashboard</p>
          <h1 id="admin-heading">Good to see you.</h1>
          <p>This is where the daily recommendations will arrive for review before anything is published.</p>
        </section>

        <section className="admin-stats" aria-label="Content overview">
          <article><span><BookOpenText /></span><strong>{draftsResult.count ?? 0}</strong><p>Drafts awaiting review</p></article>
          <article><span><Newspaper /></span><strong>{publishedResult.count ?? 0}</strong><p>Published stories</p></article>
          <article><span><Rss /></span><strong>{sourcesResult.count ?? 0}</strong><p>Active sources</p></article>
        </section>

        <section className="admin-empty-state">
          <div><Sparkles /></div>
          <h2>The editorial desk is ready.</h2>
          <p>Next, we&rsquo;ll add the source manager and the automated process that collects and recommends stories.</p>
        </section>
      </div>
    </main>
  );
}
