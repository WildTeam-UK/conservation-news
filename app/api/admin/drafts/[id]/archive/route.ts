import { unexpectedErrorResponse } from '@/lib/api-errors';
import { blocksArticleArchive } from '@/lib/article-lifecycle';
import { runTaxonomyGovernance } from '@/lib/taxonomy-governance';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type LifecycleAction = 'archive' | 'restore';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid article is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user } = auth;
  const body = await request.json().catch(() => null) as { action?: LifecycleAction } | null;
  if (!body?.action || !['archive', 'restore'].includes(body.action)) return Response.json({ error: 'Choose a valid article action.' }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  try {
    const [{ data: story, error: storyError }, { data: queueItem, error: queueError }] = await Promise.all([
      supabase.from('stories').select('id, status, content_type, published_at').eq('id', id).maybeSingle(),
      supabase.from('publication_queue').select('id, status').eq('story_id', id).maybeSingle(),
    ]);
    if (storyError) throw storyError;
    if (queueError) throw queueError;
    if (!story || story.content_type !== 'news') return Response.json({ error: 'Article not found.' }, { status: 404 });

    if (body.action === 'archive') {
      if (!['draft', 'published'].includes(story.status)) return Response.json({ error: 'Only an active draft or published article can be archived.' }, { status: 409 });
      if (blocksArticleArchive(queueItem?.status)) return Response.json({ error: 'Remove this article from the active publishing queue before archiving it.' }, { status: 409 });
      const wasPublished = story.status === 'published';
      if (queueItem) {
        const { data: cancelled, error: cancelError } = await supabase.from('publication_queue').update({
          status: 'cancelled',
          scheduled_for: null,
          claimed_at: null,
          hold_reason: wasPublished ? 'Published article was archived by an editor.' : 'Private article was archived by an editor.',
          editor_approved_at: null,
          editor_approved_by: null,
        }).eq('id', queueItem.id).eq('status', queueItem.status).select('id').maybeSingle();
        if (cancelError) throw cancelError;
        if (!cancelled) return Response.json({ error: 'The publishing status changed before the article could be archived. Refresh and try again.' }, { status: 409 });
      }
      const { data: archived, error: archiveError } = await supabase.from('stories').update({ status: 'archived', reviewer_id: user.id }).eq('id', id).eq('status', story.status).select('id').maybeSingle();
      if (archiveError) throw archiveError;
      if (!archived) return Response.json({ error: 'The article changed before it could be archived. Refresh and try again.' }, { status: 409 });
      const { error: actionError } = await supabase.from('editorial_actions').insert({
        story_id: id,
        user_id: user.id,
        action: 'archived',
        notes: wasPublished ? 'Published article archived and removed from the public website. Its original publication date was preserved.' : 'Private article archived and removed from the publishing workflow.',
      });
      if (actionError) throw actionError;
      if (wasPublished) {
        try {
          await runTaxonomyGovernance({ includeTopics: true, maxEntities: 8 });
        } catch (error) {
          console.warn('Article archived, but taxonomy governance could not be refreshed', error);
        }
      }
      return Response.json({ saved: true, status: 'archived' });
    }

    if (story.status !== 'archived') return Response.json({ error: 'Only an archived article can be restored.' }, { status: 409 });
    const { data: restored, error: restoreError } = await supabase.from('stories').update({ status: 'draft', reviewer_id: user.id }).eq('id', id).eq('status', 'archived').select('id').maybeSingle();
    if (restoreError) throw restoreError;
    if (!restored) return Response.json({ error: 'The article changed before it could be restored. Refresh and try again.' }, { status: 409 });
    const { error: actionError } = await supabase.from('editorial_actions').insert({
      story_id: id,
      user_id: user.id,
      action: 'edited',
      notes: 'Archived article restored as an unscheduled private draft. Its original publication date was preserved.',
    });
    if (actionError) throw actionError;
    return Response.json({ saved: true, status: 'draft' });
  } catch (error) {
    return unexpectedErrorResponse('Article lifecycle update failed', error, 'The article lifecycle could not be updated.');
  }
}
