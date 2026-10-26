import { unexpectedErrorResponse } from '@/lib/api-errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import { articleLinkRows } from '@/lib/article-linking';
import { recordUnsplashSelection } from '@/lib/images/unsplash';
import { cleanDraftContent, type StoryDraftContent } from '@/lib/openai/draft-story';
import { revisionChangesPublicContent } from '@/lib/openai/generate-editorial-revision';
import { generateRevisionSummary, type RevisionSummaryEvidence } from '@/lib/openai/generate-revision-summary';
import { firstRelation, sourceRelationName } from '@/lib/supabase/relations';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { normalizeEditorialTopics } from '@/lib/taxonomy';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type StoredSource = { id?: string; url?: string };

function sourceOnlyChangeSummary(evidence: RevisionSummaryEvidence[]) {
  const publishers = [...new Set(evidence.map((item) => item.publisher.trim()).filter(Boolean))];
  if (!publishers.length) return 'The source list was updated with additional reporting. The briefing text was unchanged.';
  const publisherList = new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' }).format(publishers);
  return `The source list was updated with additional reporting from ${publisherList}. The briefing text was unchanged.`;
}

async function loadDraftRevision(supabase: SupabaseClient, id: string) {
  return supabase.from('story_editorial_revisions').select('id, story_id, status, base_content, proposed_content, source_list, public_content_changed').eq('id', id).maybeSingle();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid editorial revision is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase } = auth;
  const body = await request.json().catch(() => null) as { content?: StoryDraftContent } | null;
  if (!body?.content) return Response.json({ error: 'Revision content is required.' }, { status: 400 });

  try {
    const { data: revision, error: revisionError } = await loadDraftRevision(supabase, id);
    if (revisionError) throw revisionError;
    if (!revision) return Response.json({ error: 'Editorial revision not found.' }, { status: 404 });
    if (revision.status !== 'draft') return Response.json({ error: 'Only a draft revision can be edited.' }, { status: 409 });
    const validSourceIds = new Set(((revision.source_list ?? []) as StoredSource[]).flatMap((source) => source.id ? [source.id] : []));
    const content = cleanDraftContent({ ...body.content, topics: normalizeEditorialTopics(body.content.topics ?? []) }, validSourceIds);
    const baseContent = revision.base_content as StoryDraftContent;
    const { error } = await supabase.from('story_editorial_revisions').update({ proposed_content: content, public_content_changed: revisionChangesPublicContent(baseContent, content) }).eq('id', id).eq('status', 'draft');
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    return unexpectedErrorResponse('Editorial revision save failed', error, 'The editorial revision could not be saved.');
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid editorial revision is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase } = auth;
  try {
    const { data: revision, error: revisionError } = await loadDraftRevision(supabase, id);
    if (revisionError) throw revisionError;
    if (!revision) return Response.json({ error: 'Editorial revision not found.' }, { status: 404 });
    if (revision.status !== 'draft') return Response.json({ error: 'This editorial revision has already been resolved.' }, { status: 409 });
    const proposedContent = revision.proposed_content as StoryDraftContent;
    const baseContent = revision.base_content as StoryDraftContent;
    const contentChanged = revisionChangesPublicContent(baseContent, proposedContent);
    const { data: revisionLinks, error: revisionLinksError } = await supabase.from('story_editorial_revision_updates').select('update_id').eq('revision_id', id);
    if (revisionLinksError) throw revisionLinksError;
    const updateIds = (revisionLinks ?? []).map((link) => link.update_id);
    let coverageEvidence: RevisionSummaryEvidence[] = [];
    if (updateIds.length) {
      const { data: updates, error: updatesError } = await supabase
        .from('story_cluster_updates')
        .select('relationship, rationale, source_items(title, sources(name))')
        .in('id', updateIds);
      if (updatesError) throw updatesError;
      coverageEvidence = (updates ?? []).flatMap((update) => {
        const sourceItem = firstRelation(update.source_items);
        return sourceItem ? [{
          relationship: update.relationship,
          rationale: update.rationale,
          title: sourceItem.title,
          publisher: sourceRelationName(sourceItem.sources, 'Source'),
        }] : [];
      });
    }
    const generatedSummary = contentChanged ? await generateRevisionSummary({ baseContent, proposedContent, coverageEvidence }) : null;
    const changeSummary = generatedSummary?.summary ?? sourceOnlyChangeSummary(coverageEvidence);
    const { error: summaryError } = await supabase.from('story_editorial_revisions').update({ change_summary: changeSummary, public_content_changed: contentChanged }).eq('id', id).eq('status', 'draft');
    if (summaryError) throw summaryError;
    if (generatedSummary) {
      const { error: generationLogError } = await supabase.from('ai_generations').insert({
        story_id: revision.story_id,
        purpose: 'revision_summary',
        provider: 'openai',
        model: generatedSummary.model,
        prompt_version: generatedSummary.promptVersion,
        input_tokens: generatedSummary.inputTokens,
        output_tokens: generatedSummary.outputTokens,
        estimated_cost_usd: generatedSummary.estimatedCostUsd,
        warnings: [],
      });
      if (generationLogError) throw generationLogError;
    }
    const { data: storyId, error: applyError } = await supabase.rpc('apply_story_editorial_revision_v2', { target_revision_id: id, has_public_content_changes: contentChanged });
    if (applyError) throw applyError;

    const warnings: string[] = [];
    try {
      const contextualLinks = articleLinkRows(storyId, proposedContent);
      const { error: clearLinksError } = await supabase.from('story_contextual_links').delete().eq('story_id', storyId);
      if (clearLinksError) throw clearLinksError;
      if (contextualLinks.length) {
        const { error: linkError } = await supabase.from('story_contextual_links').insert(contextualLinks);
        if (linkError) throw linkError;
      }
    } catch (error) {
      console.warn('Editorial revision applied, but contextual links could not be refreshed', error);
      warnings.push('Contextual links could not be refreshed.');
    }
    const newCredit = proposedContent.image_credit;
    const oldCredit = baseContent.image_credit;
    if (newCredit?.provider === 'unsplash' && newCredit.source_id !== oldCredit?.source_id) {
      try {
        await recordUnsplashSelection(newCredit.download_location);
      } catch (error) {
        console.warn('Unsplash selection tracking failed after applying an editorial revision', error);
        warnings.push('Unsplash selection tracking could not be recorded.');
      }
    }
    return Response.json({ applied: true, storyId, warnings });
  } catch (error) {
    return unexpectedErrorResponse('Editorial revision apply failed', error, 'The revision was not applied. Its public update summary can be generated again when you retry.');
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid editorial revision is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase } = auth;

  try {
    const { data: links, error: linksError } = await supabase.from('story_editorial_revision_updates').select('update_id').eq('revision_id', id);
    if (linksError) throw linksError;
    const { error } = await supabase.from('story_editorial_revisions').update({ status: 'discarded', discarded_at: new Date().toISOString() }).eq('id', id).eq('status', 'draft');
    if (error) throw error;
    const updateIds = (links ?? []).map((link) => link.update_id);
    if (updateIds.length) {
      const { error: updateError } = await supabase.from('story_cluster_updates').update({ status: 'pending_review' }).in('id', updateIds).eq('status', 'in_revision');
      if (updateError) throw updateError;
    }
    return Response.json({ discarded: true });
  } catch (error) {
    return unexpectedErrorResponse('Editorial revision discard failed', error, 'The editorial revision could not be discarded.');
  }
}
