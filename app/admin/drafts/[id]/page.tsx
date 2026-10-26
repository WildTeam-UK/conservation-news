/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BellRing, CalendarClock, CircleAlert, ExternalLink, FilePenLine } from 'lucide-react';
import { AddToQueueButton } from '@/components/add-to-queue-button';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DraftEditor, type DraftSource } from '@/components/draft-editor';
import { CoverageUpdateActions } from '@/components/coverage-update-actions';
import { EditorialRevisionActions } from '@/components/editorial-revision-actions';
import { PublishControls } from '@/components/publish-controls';
import { migrateDraftContent, type DraftCoverageAnalysis } from '@/lib/openai/draft-story';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { firstRelation, sourceRelationName } from '@/lib/supabase/relations';
import type { TrainingCoursePromotion } from '@/lib/training-courses';
import { attachStoredArticleLinks, type ArticleLinkSection, type ArticleLinkType } from '@/lib/article-linking';
import { londonLongDateTimeFormatter, londonMediumDateTimeFormatter } from '@/lib/date-format';

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

type EditorialRevision = {
  id: string;
  proposed_content: unknown;
  source_list: DraftSource[];
  updated_at: string;
};

type AppliedRevision = {
  id: string;
  change_summary: string;
  applied_at: string;
};

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireContentAdmin();
  const { data: story, error } = await supabase.from('stories').select('id, cluster_id, slug, headline, status, published_at, generation_metadata, updated_at, image_url, image_alt, taxonomy_review_required, taxonomy_review_reason, taxonomy_confidence').eq('id', id).maybeSingle();
  if (error || !story) notFound();
  const metadata = story.generation_metadata as { article_content?: unknown; source_ids?: DraftSource[]; model?: string; estimated_cost_usd?: number | string; topic_classification?: { primary_topic?: string; secondary_topics?: string[] }; coverage_analysis?: Partial<DraftCoverageAnalysis> };
  if (!metadata.article_content) notFound();
  const topics = [metadata.topic_classification?.primary_topic, ...(metadata.topic_classification?.secondary_topics ?? [])].filter((topic): topic is string => Boolean(topic));
  const articleContent = migrateDraftContent(metadata.article_content, { topics, coverage_analysis: metadata.coverage_analysis, image_url: story.image_url, image_alt: story.image_alt });
  const [{ data: coverageUpdateRows }, { data: revisionRow, error: revisionError }, { data: queueItem, error: queueError }, { data: courseRecommendation, error: courseError }, { data: contextualLinkRows, error: contextualLinksError }] = await Promise.all([
    story.cluster_id ? supabase.from('story_cluster_updates').select('id, relationship, rationale, created_at, source_items(title, url, sources(name))').eq('cluster_id', story.cluster_id).eq('status', 'pending_review').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('story_editorial_revisions').select('id, proposed_content, source_list, updated_at').eq('story_id', story.id).eq('status', 'draft').maybeSingle(),
    supabase.from('publication_queue').select('id, status, scheduled_for, hold_reason').eq('story_id', story.id).maybeSingle(),
    supabase.from('story_course_recommendations').select('training_courses(id, title, short_title, description, course_url, primary_colour, ad_headline, ad_description, cta_label)').eq('story_id', story.id).eq('placement', 'featured').maybeSingle(),
    supabase.from('story_contextual_links').select('link_type, target_id, href, anchor_text, section_key, item_index, external, confidence, rationale').eq('story_id', story.id),
  ]);
  if (queueError) throw new Error('Unable to load this article’s publishing status.');
  if (revisionError) throw new Error('Unable to load this article’s editorial revision. Run the coverage-revision migration first.');
  if (courseError) throw new Error('Unable to load this article’s training recommendation.');
  if (contextualLinksError) throw new Error('Unable to load this article’s contextual links. Run the article-linking migration first.');
  const { data: appliedRevisionRows, error: appliedRevisionsError } = await supabase.from('story_editorial_revisions').select('id, change_summary, applied_at').eq('story_id', story.id).eq('status', 'applied').order('applied_at', { ascending: false }).limit(10);
  if (appliedRevisionsError) throw new Error('Unable to load this article’s revision history.');
  attachStoredArticleLinks(articleContent, (contextualLinkRows ?? []).map((link) => ({ type: link.link_type as ArticleLinkType, target_id: link.target_id, href: link.href, anchor_text: link.anchor_text, section_key: link.section_key as ArticleLinkSection, item_index: link.item_index, external: link.external, confidence: link.confidence, rationale: link.rationale ?? '' })));
  const linkedCourse = courseRecommendation?.training_courses;
  const coursePromotion = firstRelation(linkedCourse) as TrainingCoursePromotion | null;
  const coverageUpdates = (coverageUpdateRows ?? []) as CoverageUpdate[];
  const revision = revisionRow as EditorialRevision | null;
  const appliedRevisions = (appliedRevisionRows ?? []) as AppliedRevision[];
  const revisionContent = revision ? migrateDraftContent(revision.proposed_content, { topics, coverage_analysis: metadata.coverage_analysis, image_url: story.image_url, image_alt: story.image_alt }) : null;
  const queueStatus = queueItem?.status;
  const isQueued = queueStatus && ['queued', 'scheduled', 'publishing'].includes(queueStatus);
  const isHeld = queueStatus === 'held';

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="drafts" />
    <div className="admin-shell admin-draft-shell">
      {/* oxlint-disable-next-line next/no-html-link-for-pages -- a full page load reliably refreshes the protected Supabase article list */}
      <a className="admin-back-link" href="/admin/drafts"><ArrowLeft /> All articles</a>
      <section className="admin-welcome draft-page-heading"><div><p className="eyebrow">{story.status === 'published' ? 'Published article' : 'Human review required'}</p><h1><FilePenLine /> {revision ? 'Review editorial update' : story.status === 'published' ? 'Article controls' : 'Edit draft'}</h1><p>{revision ? 'The current article remains unchanged while you edit and review this separate revision.' : story.status === 'published' ? 'This article is live and locked. Use the coverage-review workflow for an editorial update, or unpublish it before making a correction.' : 'This article is private. Saving changes will not publish it.'}</p></div><div className="draft-status-card"><span>Status</span><strong>{revision ? 'revision draft' : story.status}</strong><small>Last saved {londonMediumDateTimeFormatter.format(new Date(revision?.updated_at ?? story.updated_at))}</small></div></section>
      {story.taxonomy_review_required ? <section className="new-coverage-panel taxonomy-review-panel"><div><CircleAlert /><span><strong>Topic review required</strong><small>{story.taxonomy_review_reason ?? 'The system could not confidently place this article in the controlled topic structure.'}{story.taxonomy_confidence !== null ? ` Confidence: ${story.taxonomy_confidence}%.` : ''} Choose the best topic below and save the article.</small></span></div></section> : null}
      {story.status === 'draft' ? <section className={`draft-queue-panel ${isHeld ? 'held' : isQueued ? 'scheduled' : 'unscheduled'}`}><span>{isHeld ? <CircleAlert /> : <CalendarClock />}</span><div><p className="eyebrow">Publishing queue</p><h2>{isHeld ? 'Held for review' : isQueued ? queueStatus === 'queued' ? 'Waiting for a slot' : 'Scheduled' : 'Not scheduled'}</h2><p>{isHeld ? `${queueItem?.hold_reason || 'This article needs attention before it can be scheduled.'} Review and save any changes, then add it to the queue when you are happy.` : isQueued ? queueItem?.scheduled_for ? `Due to publish ${londonLongDateTimeFormatter.format(new Date(queueItem.scheduled_for))}.` : 'It will receive a publishing time when the schedule is next balanced.' : 'This private draft will not publish automatically unless you add it to the queue.'}</p></div><div className="draft-queue-panel-actions">{!isQueued ? <AddToQueueButton storyId={story.id} approveHeld={isHeld} /> : null}<a href="/admin/queue">View queue</a></div></section> : null}
      {coverageUpdates?.length ? <section className="new-coverage-panel"><div><BellRing /><span><strong>New coverage available</strong><small>These sources were matched to this story after the article was drafted. Review each one and record a decision.</small></span></div>{coverageUpdates.map((update) => { const item = firstRelation(update.source_items); return item ? <article className="coverage-update-item" key={update.id}><a href={item.url} target="_blank" rel="noopener noreferrer"><span><strong>{item.title}</strong><small>{sourceRelationName(item.sources, 'Source')} · {update.relationship.replace('_', ' ')}</small>{update.rationale ? <em>{update.rationale}</em> : null}</span><ExternalLink /></a><CoverageUpdateActions updateId={update.id} /></article> : null; })}</section> : null}
      <PublishControls storyId={story.id} slug={story.slug} status={story.status} publishedAt={story.published_at} content={articleContent} sourceCount={metadata.source_ids?.length ?? 0} />
      {appliedRevisions.length ? <details className="editorial-revision-history"><summary>Revision history <span>{appliedRevisions.length}</span></summary><div>{appliedRevisions.map((appliedRevision) => <article key={appliedRevision.id}><time dateTime={appliedRevision.applied_at}>{londonLongDateTimeFormatter.format(new Date(appliedRevision.applied_at))}</time><p>{appliedRevision.change_summary}</p></article>)}</div></details> : null}
      {revision && revisionContent ? <>
        <EditorialRevisionActions revisionId={revision.id} published={Boolean(story.published_at)} />
        <DraftEditor storyId={story.id} initialContent={revisionContent} sourceList={revision.source_list} updatedAt={revision.updated_at} coursePromotion={coursePromotion} saveEndpoint={`/api/admin/story-revisions/${revision.id}`} editorLabel="Protected revision workspace" editorTitle="Edit the proposed update" editorDescription="Saving here changes only this revision. The current article stays live until you explicitly apply it." saveLabel="Save revision" savedMessage="Revision saved. The live article has not changed." previewLabel="Proposed revision using the live article template" allowCoverageRecalculation={false} />
      </> : <DraftEditor storyId={story.id} initialContent={articleContent} sourceList={metadata.source_ids ?? []} updatedAt={story.updated_at} coursePromotion={coursePromotion} readOnly={story.status === 'published'} />}
      <p className="draft-model-note">Generated with {metadata.model ?? 'OpenAI'} · estimated model cost ${Number(metadata.estimated_cost_usd ?? 0).toFixed(4)}. Sources and factual claims still require human review.</p>
    </div>
  </main>;
}
