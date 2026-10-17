/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh the protected Supabase session in Vinext */
import type { Metadata } from 'next';
import { BookOpen, Tags } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { TagManager, type EditorialTag, type TagUsage } from '@/components/tag-manager';
import { TaxonomyControls } from '@/components/taxonomy-controls';
import { TopicManager, type EditorialTopic } from '@/components/topic-manager';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Taxonomy | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type TaxonomyPageProps = { searchParams?: Promise<{ view?: string }> };

export default async function TaxonomyPage({ searchParams }: TaxonomyPageProps) {
  const { supabase, admin } = await requireContentAdmin();
  const params = searchParams ? await searchParams : undefined;
  const view = params?.view === 'tags' ? 'tags' : 'topics';
  const [topicsResult, tagsResult, aliasesResult, usagesResult, publishedStoriesResult, storyTopicsResult, storyTagsResult, settingsResult] = await Promise.all([
    supabase.from('topics').select('id, name, slug, description, seo_title, meta_description, seo_generated_at').eq('active', true).order('name'),
    supabase.from('content_tags').select('id, name, slug, tag_type, status, description, seo_title, meta_description, seo_generated_at, created_at').order('status').order('name'),
    supabase.from('content_tag_aliases').select('tag_id, alias').order('alias'),
    supabase.from('story_cluster_tags').select('tag_id, confidence, rationale, story_clusters(id, working_title, status)').order('confidence', { ascending: false }),
    supabase.from('stories').select('id').eq('status', 'published').not('published_at', 'is', null),
    supabase.from('story_topics').select('story_id, topic_id'),
    supabase.from('story_tags').select('story_id, tag_id, confidence, rationale, stories(id, slug, headline, status, published_at)'),
    supabase.from('taxonomy_settings').select('automation_enabled, min_published_stories, last_governance_run_at, last_governance_error, last_estimated_cost_usd').eq('id', true).single(),
  ]);
  if (topicsResult.error || tagsResult.error || aliasesResult.error || usagesResult.error || publishedStoriesResult.error || storyTopicsResult.error || storyTagsResult.error || settingsResult.error) throw new Error('Unable to load editorial taxonomy. Run the taxonomy migration if this is the first deployment.');

  const publishedIds = new Set((publishedStoriesResult.data ?? []).map((story) => story.id));
  const topicCounts = new Map<string, number>();
  for (const link of storyTopicsResult.data ?? []) if (publishedIds.has(link.story_id)) topicCounts.set(link.topic_id, (topicCounts.get(link.topic_id) ?? 0) + 1);
  const tagCounts = new Map<string, number>();
  for (const link of storyTagsResult.data ?? []) if (publishedIds.has(link.story_id)) tagCounts.set(link.tag_id, (tagCounts.get(link.tag_id) ?? 0) + 1);
  const publishedUsagesByTag = new Map<string, TagUsage[]>();
  for (const link of storyTagsResult.data ?? []) {
    if (!publishedIds.has(link.story_id)) continue;
    const story = Array.isArray(link.stories) ? link.stories[0] : link.stories;
    if (!story) continue;
    publishedUsagesByTag.set(link.tag_id, [...(publishedUsagesByTag.get(link.tag_id) ?? []), { id: story.id, title: story.headline, slug: story.slug, status: story.status, confidence: link.confidence, rationale: link.rationale }]);
  }

  const aliasesByTag = new Map<string, string[]>();
  for (const alias of aliasesResult.data ?? []) aliasesByTag.set(alias.tag_id, [...(aliasesByTag.get(alias.tag_id) ?? []), alias.alias]);
  const usagesByTag = new Map<string, TagUsage[]>();
  for (const usage of usagesResult.data ?? []) {
    const cluster = Array.isArray(usage.story_clusters) ? usage.story_clusters[0] : usage.story_clusters;
    if (!cluster) continue;
    usagesByTag.set(usage.tag_id, [...(usagesByTag.get(usage.tag_id) ?? []), { id: cluster.id, title: cluster.working_title, status: cluster.status, confidence: usage.confidence, rationale: usage.rationale }]);
  }
  const editorialTags = (tagsResult.data ?? []).map((tag) => ({ ...tag, aliases: aliasesByTag.get(tag.id) ?? [], usages: tag.status === 'approved' ? publishedUsagesByTag.get(tag.id) ?? [] : usagesByTag.get(tag.id) ?? [], publishedCount: tagCounts.get(tag.id) ?? 0 })) as EditorialTag[];
  const editorialTopics = (topicsResult.data ?? []).map((topic) => ({ ...topic, storyCount: topicCounts.get(topic.id) ?? 0 })) as EditorialTopic[];
  const populatedTopicCount = editorialTopics.filter((topic) => topic.storyCount > 0).length;
  const settings = settingsResult.data;
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="tags" />
    <div className="admin-shell admin-taxonomy-shell">
      <section className="taxonomy-heading"><div><p className="eyebrow">Discovery and SEO structure</p><h1>Taxonomy</h1><p>Topics organise every article into a controlled editorial structure. Tags add precise discovery routes when enough coverage exists to support a useful archive.</p></div><div className="taxonomy-summary"><span><BookOpen /></span><strong>{populatedTopicCount}</strong><small>populated topics</small><span><Tags /></span><strong>{editorialTags.filter((tag) => tag.status === 'approved').length}</strong><small>live tags</small></div></section>
      <section className="taxonomy-definition-grid" aria-label="Topic and tag rules"><article><BookOpen /><div><strong>Topics</strong><p>Nine broad, controlled sections such as Wildlife, Climate and Policy &amp; Governance. An archive becomes public with its first published article.</p></div></article><article><Tags /><div><strong>Tags</strong><p>Specific species, places, habitats or themes such as rhinoceroses, islands or soil. They are attached and reused immediately, but remain private until they reach the archive threshold.</p></div></article></section>
      <TaxonomyControls settings={settings} />
      <nav className="taxonomy-tabs" aria-label="Taxonomy views"><a className={view === 'topics' ? 'active' : ''} href="/admin/tags?view=topics"><BookOpen /> Topics <span>{editorialTopics.length}</span></a><a className={view === 'tags' ? 'active' : ''} href="/admin/tags?view=tags"><Tags /> Tags <span>{editorialTags.length}</span></a></nav>
      {view === 'topics' ? <><section className="taxonomy-view-heading"><div><p className="eyebrow">Controlled editorial sections</p><h2>Topic archives</h2></div><p>Only populated topics appear publicly. AI generates their first archive description from real coverage, and every field remains editable.</p></section><TopicManager topics={editorialTopics} /></> : <><section className="taxonomy-view-heading"><div><p className="eyebrow">Automatic discovery</p><h2>Tag archives</h2></div><p>Growing tags are already attached to articles internally. They become visible, linkable archives after {settings.min_published_stories} published articles and complete SEO copy.</p></section><TagManager initialTags={editorialTags} minPublishedStories={settings.min_published_stories} /></>}
    </div>
  </main>;
}
