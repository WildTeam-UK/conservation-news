import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { SourceManager, type EditorialSource } from '@/components/source-manager';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sources | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  const { supabase, admin } = await requireContentAdmin();
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, homepage_url, feed_url, source_kind, trust_status, enabled, last_success_at, last_error')
    .order('name');

  if (error) throw new Error('Unable to load editorial sources.');

  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>
      <AdminNav active="sources" />
      <div className="admin-shell admin-sources-shell">
        <section className="admin-welcome" aria-labelledby="sources-heading">
          <p className="eyebrow">Collection settings</p>
          <h1 id="sources-heading">Sources</h1>
          <p>Add the feeds and websites WildNews should check. You can pause any source without removing it.</p>
        </section>
        <SourceManager sources={(data ?? []) as EditorialSource[]} />
      </div>
    </main>
  );
}
