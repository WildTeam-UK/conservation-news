import { unexpectedErrorResponse } from '@/lib/api-errors';
import type { StoryDraftContent } from '@/lib/openai/draft-story';
import { firstRelation, sourceRelationName } from '@/lib/supabase/relations';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type CoverageDecision = 'dismiss' | 'no_change' | 'prepare_revision';
type StoredSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  source_type: string;
  source_item_id?: string;
  published_at?: string | null;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid coverage update is required.' }, { status: 400 });

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json().catch(() => null) as { decision?: CoverageDecision } | null;
  if (!body?.decision || !['dismiss', 'no_change', 'prepare_revision'].includes(body.decision)) {
    return Response.json({ error: 'Choose a valid coverage decision.' }, { status: 400 });
  }

  try {
    const { data: update, error: updateError } = await supabase
      .from('story_cluster_updates')
      .select('id, cluster_id, source_item_id, status, relationship, source_items(id, title, url, published_at, sources(name))')
      .eq('id', id)
      .maybeSingle();
    if (updateError) throw updateError;
    if (!update) return Response.json({ error: 'Coverage update not found.' }, { status: 404 });
    if (update.status !== 'pending_review') return Response.json({ error: 'This coverage update has already been reviewed.' }, { status: 409 });

    if (body.decision !== 'prepare_revision') {
      const status = body.decision === 'dismiss' ? 'dismissed' : 'no_change';
      const { error } = await supabase.from('story_cluster_updates').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id).eq('status', 'pending_review');
      if (error) throw error;
      return Response.json({ reviewed: true, status });
    }

    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, generation_metadata')
      .eq('cluster_id', update.cluster_id)
      .eq('content_type', 'news')
      .in('status', ['draft', 'published'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (storyError) throw storyError;
    if (!story) return Response.json({ error: 'The linked article could not be found.' }, { status: 404 });

    const metadata = story.generation_metadata as { article_content?: StoryDraftContent; source_ids?: StoredSource[] };
    if (!metadata.article_content) return Response.json({ error: 'The linked article has no editable content.' }, { status: 409 });
    const sourceItem = firstRelation(update.source_items);
    if (!sourceItem) return Response.json({ error: 'The matched source could not be loaded.' }, { status: 409 });

    const { data: existingRevision, error: revisionLookupError } = await supabase
      .from('story_editorial_revisions')
      .select('id, source_list')
      .eq('story_id', story.id)
      .eq('status', 'draft')
      .maybeSingle();
    if (revisionLookupError) throw revisionLookupError;

    const currentSources = ((existingRevision?.source_list ?? metadata.source_ids ?? []) as StoredSource[]);
    const nextSourceNumber = currentSources.reduce((maximum, source) => {
      const number = Number(source.id.replace('source-', ''));
      return Number.isFinite(number) ? Math.max(maximum, number) : maximum;
    }, 0) + 1;
    const appendedSource: StoredSource = {
      id: `source-${nextSourceNumber}`,
      source_item_id: update.source_item_id,
      title: sourceItem.title,
      publisher: sourceRelationName(sourceItem.sources, 'Source'),
      url: sourceItem.url,
      source_type: currentSources.length ? 'supporting' : 'primary',
      published_at: sourceItem.published_at,
    };
    const sourceList = currentSources.some((source) => source.url === appendedSource.url) ? currentSources : [...currentSources, appendedSource];

    let revisionId = existingRevision?.id;
    if (revisionId) {
      const { error } = await supabase.from('story_editorial_revisions').update({ source_list: sourceList }).eq('id', revisionId).eq('status', 'draft');
      if (error) throw error;
    } else {
      const { data: revision, error } = await supabase.from('story_editorial_revisions').insert({
        story_id: story.id,
        base_content: metadata.article_content,
        proposed_content: metadata.article_content,
        source_list: sourceList,
        created_by: user.id,
      }).select('id').single();
      if (error) throw error;
      revisionId = revision.id;
    }

    const { error: linkError } = await supabase.from('story_editorial_revision_updates').upsert({ revision_id: revisionId, update_id: update.id }, { onConflict: 'update_id' });
    if (linkError) throw linkError;
    const { error: statusError } = await supabase.from('story_cluster_updates').update({ status: 'in_revision' }).eq('id', update.id).eq('status', 'pending_review');
    if (statusError) throw statusError;

    return Response.json({ reviewed: true, status: 'in_revision', revisionId });
  } catch (error) {
    return unexpectedErrorResponse('Coverage update decision failed', error, 'The coverage decision could not be saved.');
  }
}
