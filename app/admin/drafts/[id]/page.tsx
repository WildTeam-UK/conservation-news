import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { DraftEditor, type DraftSource } from '@/components/draft-editor';
import { PublishControls } from '@/components/publish-controls';
import { migrateDraftContent, type DraftCoverageAnalysis } from '@/lib/openai/draft-story';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit draft | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, admin } = await requireContentAdmin();
  const { data: story, error } = await supabase.from('stories').select('id, slug, headline, status, published_at, generation_metadata, updated_at, image_url, image_alt, byline').eq('id', id).maybeSingle();
  if (error || !story) notFound();
  const metadata = story.generation_metadata as { article_content?: unknown; source_ids?: DraftSource[]; model?: string; estimated_cost_usd?: number | string; topic_classification?: { primary_topic?: string; secondary_topics?: string[] }; coverage_analysis?: Partial<DraftCoverageAnalysis> };
  if (!metadata.article_content) notFound();
  const topics = [metadata.topic_classification?.primary_topic, ...(metadata.topic_classification?.secondary_topics ?? [])].filter((topic): topic is string => Boolean(topic));
  const articleContent = migrateDraftContent(metadata.article_content, { topics, coverage_analysis: metadata.coverage_analysis, image_url: story.image_url, image_alt: story.image_alt, byline: story.byline });
  const name = admin.display_name || admin.email;

  return <main className="admin-page">
    <header className="admin-header"><Brand /><div className="admin-account"><span>{name}</span><AdminSignOutButton /></div></header>
    <AdminNav active="drafts" />
    <div className="admin-shell admin-draft-shell">
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className="admin-back-link" href="/admin/drafts"><ArrowLeft /> All drafts</a>
      <section className="admin-welcome draft-page-heading"><div><p className="eyebrow">Human review required</p><h1><FilePenLine /> Edit draft</h1><p>This article is private. Saving changes will not publish it.</p></div><div className="draft-status-card"><span>Status</span><strong>{story.status}</strong><small>Last saved {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(story.updated_at))}</small></div></section>
      <PublishControls storyId={story.id} slug={story.slug} status={story.status} publishedAt={story.published_at} content={articleContent} sourceCount={metadata.source_ids?.length ?? 0} />
      <DraftEditor storyId={story.id} initialContent={articleContent} sourceList={metadata.source_ids ?? []} updatedAt={story.updated_at} readOnly={story.status === 'published'} />
      <p className="draft-model-note">Generated with {metadata.model ?? 'OpenAI'} · estimated model cost ${Number(metadata.estimated_cost_usd ?? 0).toFixed(4)}. Sources and factual claims still require human review.</p>
    </div>
  </main>;
}
