import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { TagManager, type EditorialTag, type TagUsage } from '@/components/tag-manager';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tags | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function TagsPage() {
  const { supabase, admin } = await requireContentAdmin();
  const [{ data: tags, error: tagsError }, { data: aliases, error: aliasesError }, { data: usages, error: usagesError }] = await Promise.all([
    supabase.from('content_tags').select('id, name, slug, tag_type, status, description, created_at').order('status').order('name'),
    supabase.from('content_tag_aliases').select('tag_id, alias').order('alias'),
    supabase.from('story_cluster_tags').select('tag_id, confidence, rationale, story_clusters(id, working_title, status)').order('confidence', { ascending: false }),
  ]);
  if (tagsError || aliasesError || usagesError) throw new Error('Unable to load editorial tags.');

  const aliasesByTag = new Map<string, string[]>();
  for (const alias of aliases ?? []) aliasesByTag.set(alias.tag_id, [...(aliasesByTag.get(alias.tag_id) ?? []), alias.alias]);
  const usagesByTag = new Map<string, TagUsage[]>();
  for (const usage of usages ?? []) {
    const cluster = Array.isArray(usage.story_clusters) ? usage.story_clusters[0] : usage.story_clusters;
    if (!cluster) continue;
    usagesByTag.set(usage.tag_id, [...(usagesByTag.get(usage.tag_id) ?? []), {
      id: cluster.id,
      title: cluster.working_title,
      status: cluster.status,
      confidence: usage.confidence,
      rationale: usage.rationale,
    }]);
  }
  const editorialTags = (tags ?? []).map((tag) => ({
    ...tag,
    aliases: aliasesByTag.get(tag.id) ?? [],
    usages: usagesByTag.get(tag.id) ?? [],
  })) as EditorialTag[];
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="tags" />
    <div className="admin-shell admin-tags-shell">
      <section className="admin-welcome tags-heading"><div><p className="eyebrow">Controlled discovery structure</p><h1>Tags</h1><p>Approve useful discovery tags, retire weak suggestions, and merge duplicates before they become public links or SEO pages.</p></div><div className="tag-review-count"><strong>{editorialTags.filter((tag) => tag.status === 'proposed').length}</strong><span>Awaiting review</span></div></section>
      <TagManager initialTags={editorialTags} />
    </div>
  </main>;
}
