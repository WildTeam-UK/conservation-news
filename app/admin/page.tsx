import type { Metadata } from 'next';
import { BookOpenText, Newspaper, Rss, SearchCheck } from 'lucide-react';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { AdminNav } from '@/components/admin-nav';
import { Brand } from '@/components/brand';
import { RunCollectionButton } from '@/components/run-collection-button';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial dashboard | WILDNEWS',
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const { supabase, admin } = await requireContentAdmin();
  const [draftsResult, publishedResult, sourcesResult, itemsResult, runsResult] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('source_items').select('*', { count: 'exact', head: true }),
    supabase.from('ingestion_runs').select('id, status, sources_checked, items_found, items_new, created_at').order('created_at', { ascending: false }).limit(5),
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
          <article><span><SearchCheck /></span><strong>{itemsResult.count ?? 0}</strong><p>Collected source items</p></article>
        </section>

        <section className="collection-panel">
          <div className="collection-panel-copy"><p className="eyebrow">Manual test</p><h2>Collect the latest stories</h2><p>Check every active RSS source and save any items that have not been seen before. Nothing will be drafted or published yet.</p></div>
          <div className="collection-panel-actions"><RunCollectionButton />{/* oxlint-disable-next-line next/no-html-link-for-pages */}<a href="/admin/collected">View collected items</a></div>
        </section>

        {(runsResult.data?.length ?? 0) > 0 ? <section className="collection-history"><div className="collection-history-heading"><p className="eyebrow">Recent activity</p><h2>Collection runs</h2></div><div className="collection-runs">{runsResult.data?.map((run) => <article key={run.id}><span className={`run-status ${run.status}`}>{run.status}</span><div><strong>{run.items_new} new items</strong><p>{run.items_found} found across {run.sources_checked} {run.sources_checked === 1 ? 'source' : 'sources'}</p></div><time dateTime={run.created_at}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(run.created_at))}</time></article>)}</div></section> : null}
      </div>
    </main>
  );
}
