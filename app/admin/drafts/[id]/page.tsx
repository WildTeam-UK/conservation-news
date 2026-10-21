import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BellRing, CalendarClock, CircleAlert, ExternalLink, FilePenLine } from 'lucide-react';
import { AddToQueueButton } from '@/components/add-to-queue-button';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DraftEditor, type DraftSource } from '@/components/draft-editor';
import { PublishControls } from '@/components/publish-controls';
import { migrateDraftContent, type DraftCoverageAnalysis } from '@/lib/openai/draft-story';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import type { TrainingCoursePromotion } from '@/lib/training-courses';
import { attachStoredArticleLinks, type ArticleLinkSection, type ArticleLinkType } from '@/lib/article-linking';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit draft | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type CoverageUpdate = {
  id: string;
  relationship: 'same_event' | 'meaningful_update';
  rationale: string | null;
  source_items: {
    title: string;
    url: string;
    sources: { name: string } | { name: string }[] | null;
  } | {
    title: string;
    url: string;
    sources: { name: string } | { name: string }[] | null;
  }[] | null;
};

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireContentAdmin();
  const { data: story, error } = await supabase.from('stories').select('id, cluster_id, slug, headline, status, published_at, generation_metadata, updated_at, image_url, image_alt, byline, taxonomy_review_required, taxonomy_review_reason, taxonomy_confidence').eq('id', id).maybeSingle();
  if (error || !story) notFound();
  const metadata = story.generation_metadata as { article_content?: unknown; source_ids?: DraftSource[]; model?: string; estimated_cost_usd?: number | string; topic_classification?: { primary_topic?: string; secondary_topics?: string[] }; coverage_analysis?: Partial<DraftCoverageAnalysis> };
  if (!metadata.article_content) notFound();
  const topics = [metadata.topic_classification?.primary_topic, ...(metadata.topic_classification?.secondary_topics ?? [])].filter((topic): topic is string => Boolean(topic));
  const articleContent = migrateDraftContent(metadata.article_content, { topics, coverage_analysis: metadata.coverage_analysis, image_url: story.image_url, image_alt: story.image_alt, byline: story.byline });
  const [{ data: coverageUpdateRows }, { data: queueItem, error: queueError }, { data: courseRecommendation, error: courseError }, { data: contextualLinkRows, error: contextualLinksError }] = await Promise.all([
    story.cluster_id ? supabase.from('story_cluster_updates').select('id, relationship, rationale, created_at, source_items(title, url, sources(name))').eq('cluster_id', story.cluster_id).eq('status', 'pending_review').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('publication_queue').select('id, status, scheduled_for, hold_reason').eq('story_id', story.id).maybeSingle(),
    supabase.from('story_course_recommendations').select('training_courses(id, title, short_title, description, course_url, primary_colour, ad_headline, ad_description, cta_label)').eq('story_id', story.id).eq('placement', 'featured').maybeSingle(),
    supabase.from('story_contextual_links').select('link_type, target_id, href, anchor_text, section_key, item_index, external, confidence, rationale').eq('story_id', story.id),
  ]);
  if (queueError) throw new Error('Unable to load this article’s publishing status.');
  if (courseError) throw new Error('Unable to load this article’s training recommendation.');
  if (contextualLinksError) throw new Error('Unable to load this article’s contextual links. Run the article-linking migration first.');
  attachStoredArticleLinks(articleContent, (contextualLinkRows ?? []).map((link) => ({ type: link.link_type as ArticleLinkType, target_id: link.target_id, href: link.href, anchor_text: link.anchor_text, section_key: link.section_key as ArticleLinkSection, item_index: link.item_index, external: link.external, confidence: link.confidence, rationale: link.rationale ?? '' })));
  const linkedCourse = courseRecommendation?.training_courses;
  const coursePromotion = (Array.isArray(linkedCourse) ? linkedCourse[0] : linkedCourse) as TrainingCoursePromotion | null | undefined;
  const coverageUpdates = (coverageUpdateRows ?? []) as CoverageUpdate[];
  const queueStatus = queueItem?.status;
  const isQueued = queueStatus && ['queued', 'scheduled', 'publishing'].includes(queueStatus);
  const isHeld = queueStatus === 'held';

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="drafts" />
    <div className="admin-shell admin-draft-shell">
      {/* oxlint-disable-next-line next/no-html-link-for-pages -- a full page load reliably refreshes the protected Supabase article list */}
      <a className="admin-back-link" href="/admin/drafts"><ArrowLeft /> All drafts</a>
      <section className="admin-welcome draft-page-heading"><div><p className="eyebrow">{story.status === 'published' ? 'Published article' : 'Human review required'}</p><h1><FilePenLine /> {story.status === 'published' ? 'Article controls' : 'Edit draft'}</h1><p>{story.status === 'published' ? 'This article is live and locked. Unpublish it before making corrections.' : 'This article is private. Saving changes will not publish it.'}</p></div><div className="draft-status-card"><span>Status</span><strong>{story.status}</strong><small>Last saved {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(story.updated_at))}</small></div></section>
      {story.taxonomy_review_required ? <section className="new-coverage-panel taxonomy-review-panel"><div><CircleAlert /><span><strong>Topic review required</strong><small>{story.taxonomy_review_reason ?? 'The system could not confidently place this article in the controlled topic structure.'}{story.taxonomy_confidence !== null ? ` Confidence: ${story.taxonomy_confidence}%.` : ''} Choose the best topic below and save the article.</small></span></div></section> : null}
      {story.status === 'draft' ? <section className={`draft-queue-panel ${isHeld ? 'held' : isQueued ? 'scheduled' : 'unscheduled'}`}><span>{isHeld ? <CircleAlert /> : <CalendarClock />}</span><div><p className="eyebrow">Publishing queue</p><h2>{isHeld ? 'Held for review' : isQueued ? queueStatus === 'queued' ? 'Waiting for a slot' : 'Scheduled' : 'Not scheduled'}</h2><p>{isHeld ? queueItem?.hold_reason || 'This article needs attention before it can be scheduled.' : isQueued ? queueItem?.scheduled_for ? `Due to publish ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(queueItem.scheduled_for))}.` : 'It will receive a publishing time when the schedule is next balanced.' : 'This private draft will not publish automatically unless you add it to the queue.'}</p></div><div className="draft-queue-panel-actions">{!isQueued && !isHeld ? <AddToQueueButton storyId={story.id} /> : null}<Link href="/admin/queue">View queue</Link></div></section> : null}
      {coverageUpdates?.length ? <section className="new-coverage-panel"><div><BellRing /><span><strong>New coverage available</strong><small>These sources were matched to this story after the article was drafted. Review them before deciding whether the article needs updating.</small></span></div>{coverageUpdates.map((update) => { const item = Array.isArray(update.source_items) ? update.source_items[0] : update.source_items; const publisher = item && (Array.isArray(item.sources) ? item.sources[0]?.name : item.sources?.name); return item ? <a href={item.url} target="_blank" rel="noreferrer" key={update.id}><span><strong>{item.title}</strong><small>{publisher ?? 'Source'} · {update.relationship.replace('_', ' ')}</small>{update.rationale ? <em>{update.rationale}</em> : null}</span><ExternalLink /></a> : null; })}</section> : null}
      <PublishControls storyId={story.id} slug={story.slug} status={story.status} publishedAt={story.published_at} content={articleContent} sourceCount={metadata.source_ids?.length ?? 0} />
      <DraftEditor storyId={story.id} initialContent={articleContent} sourceList={metadata.source_ids ?? []} updatedAt={story.updated_at} coursePromotion={coursePromotion} readOnly={story.status === 'published'} />
      <p className="draft-model-note">Generated with {metadata.model ?? 'OpenAI'} · estimated model cost ${Number(metadata.estimated_cost_usd ?? 0).toFixed(4)}. Sources and factual claims still require human review.</p>
    </div>
  </main>;
}
