import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { SourceManager, type EditorialSource, type SuggestedSource } from '@/components/source-manager';
import { sourceSiteKey } from '@/lib/source-discovery';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sources | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type SourcesPageProps = { searchParams?: Promise<{ view?: string }> };

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const { supabase, admin } = await requireContentAdmin();
  const params = searchParams ? await searchParams : undefined;
  const view = params?.view === 'recommendations' ? 'recommendations' : 'monitored';
  const [{ data, error }, { data: suggestionData, error: suggestionError }, { data: citedSources, error: citedSourcesError }] = await Promise.all([
    supabase.from('sources').select('id, name, homepage_url, feed_url, source_kind, trust_status, enabled, last_success_at, last_error').order('name'),
    supabase.from('source_suggestions').select('id, domain, name, description, homepage_url, feed_url, feed_status, source_type, quality_score, originality_score, recommendation_score, last_seen_at, source_suggestion_mentions(id)').eq('status', 'suggested').neq('feed_status', 'not_found').order('recommendation_score', { ascending: false }).order('last_seen_at', { ascending: false }).limit(50),
    supabase.from('story_sources').select('story_id, source_url'),
  ]);

  if (error || suggestionError || citedSourcesError) throw new Error('Unable to load editorial sources.');

  const citedStoryIdsBySite = new Map<string, Set<string>>();
  for (const source of citedSources ?? []) {
    const siteKey = sourceSiteKey(source.source_url);
    if (!siteKey) continue;
    const storyIds = citedStoryIdsBySite.get(siteKey) ?? new Set<string>();
    storyIds.add(source.story_id);
    citedStoryIdsBySite.set(siteKey, storyIds);
  }

  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>
      <AdminNav active="sources" subview={view} />
      <div className="admin-shell admin-sources-shell">
        <section className="admin-welcome" aria-labelledby="sources-heading">
          <p className="eyebrow">{view === 'recommendations' ? 'Source discovery' : 'Collection settings'}</p>
          <h1 id="sources-heading">{view === 'recommendations' ? 'Recommendations' : 'Monitored sources'}</h1>
          <p>{view === 'recommendations' ? 'Review the strongest RSS prospects discovered automatically during article research.' : 'Add the feeds and websites WildNews should check. You can pause any source without removing it.'}</p>
        </section>
        <SourceManager view={view} sources={(data ?? []) as EditorialSource[]} suggestions={(suggestionData ?? []).map((suggestion) => ({
          ...suggestion,
          mentionCount: suggestion.source_suggestion_mentions?.length ?? 0,
          citationCount: citedStoryIdsBySite.get(sourceSiteKey(suggestion.homepage_url) ?? '')?.size ?? 0,
        })) as SuggestedSource[]} />
      </div>
    </main>
  );
}
