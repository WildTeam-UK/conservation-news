import type { Metadata } from 'next';
import { ExternalLink, Inbox } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { RunAssessmentButton } from '@/components/run-assessment-button';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Collected items | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type CollectedItem = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  discovered_at: string;
  assessment_status: 'pending' | 'processing' | 'assessed' | 'failed' | 'expired';
  assessment_error: string | null;
  sources: { name: string } | { name: string }[] | null;
};

function sourceName(source: CollectedItem['sources']) {
  if (Array.isArray(source)) return source[0]?.name ?? 'Unknown source';
  return source?.name ?? 'Unknown source';
}

export default async function CollectedItemsPage() {
  const { supabase, admin } = await requireContentAdmin();
  const { data, error, count } = await supabase
    .from('source_items')
    .select('id, title, url, summary, author, published_at, discovered_at, assessment_status, assessment_error, sources(name)', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error('Unable to load collected source items.');

  const name = admin.display_name || admin.email;
  const items = (data ?? []) as CollectedItem[];
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>
      <AdminNav active="pipeline" subview="collected" />

      <div className="admin-shell admin-collected-shell">
        <section className="admin-welcome collected-heading" aria-labelledby="collected-heading">
          <div><p className="eyebrow">Ingestion inbox</p><h1 id="collected-heading">Collected items</h1><p>Raw stories found in your active feeds, with their current assessment-queue status.</p></div>
          <div className="collected-heading-actions"><span>{count ?? items.length} total</span><RunAssessmentButton /></div>
        </section>

        {items.length === 0 ? (
          <section className="source-empty"><Inbox /><h2>No collected items yet</h2><p>Run collection from the dashboard to fill this inbox.</p></section>
        ) : (
          <section className="collected-list" aria-label="Latest collected source items">
            {items.map((item) => (
              <article className="collected-item" key={item.id}>
                <div className="collected-item-meta"><span>{sourceName(item.sources)}</span><time dateTime={item.published_at ?? item.discovered_at}>{dateFormatter.format(new Date(item.published_at ?? item.discovered_at))}</time><strong className={`assessment-status ${item.assessment_status}`}>{item.assessment_status.replace('_', ' ')}</strong></div>
                <h2><a href={item.url} target="_blank" rel="noreferrer">{item.title} <ExternalLink /></a></h2>
                {item.summary ? <p>{item.summary}</p> : null}
                {item.assessment_status === 'failed' && item.assessment_error ? <small className="assessment-error">Assessment will retry automatically: {item.assessment_error}</small> : null}
                {item.author ? <small>By {item.author}</small> : null}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
