import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { SourceManager, type EditorialSource, type SuggestedSource } from '@/components/source-manager';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sources | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  const { supabase, admin } = await requireContentAdmin();
  const [{ data, error }, { data: suggestionData, error: suggestionError }] = await Promise.all([
    supabase.from('sources').select('id, name, homepage_url, feed_url, source_kind, trust_status, enabled, last_success_at, last_error').order('name'),
    supabase.from('source_suggestions').select('id, domain, name, homepage_url, feed_url, feed_status, source_type, quality_score, originality_score, recommendation_score, last_reason, last_seen_at, source_suggestion_mentions(id)').eq('status', 'suggested').order('recommendation_score', { ascending: false }).order('last_seen_at', { ascending: false }).limit(30),
  ]);

  if (error || suggestionError) throw new Error('Unable to load editorial sources.');

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
        <SourceManager sources={(data ?? []) as EditorialSource[]} suggestions={(suggestionData ?? []).map((suggestion) => ({ ...suggestion, mentionCount: suggestion.source_suggestion_mentions?.length ?? 0 })) as SuggestedSource[]} />
      </div>
    </main>
  );
}
