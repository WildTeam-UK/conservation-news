import { unexpectedErrorResponse } from '@/lib/api-errors';
import { CONTENT_INTERACTION_TYPES, type ContentInteractionType } from '@/lib/content-interactions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type InteractionRequest = {
  eventId?: unknown;
  storyId?: unknown;
  eventType?: unknown;
  relatedStoryId?: unknown;
  storySourceId?: unknown;
};

function isInteractionType(value: unknown): value is ContentInteractionType {
  return typeof value === 'string' && CONTENT_INTERACTION_TYPES.includes(value as ContentInteractionType);
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || new URL(origin).origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Interaction origin is not permitted.' }, { status: 403 });

  const body = await request.json().catch(() => null) as InteractionRequest | null;
  if (!body || !isUuid(body.eventId) || !isUuid(body.storyId) || !isInteractionType(body.eventType)) {
    return Response.json({ error: 'A valid interaction is required.' }, { status: 400 });
  }
  if (body.relatedStoryId !== undefined && !isUuid(body.relatedStoryId)) return Response.json({ error: 'A valid related story is required.' }, { status: 400 });
  if (body.storySourceId !== undefined && !isUuid(body.storySourceId)) return Response.json({ error: 'A valid source is required.' }, { status: 400 });
  if (body.eventType === 'digest_story' && !isUuid(body.relatedStoryId)) return Response.json({ error: 'A related story is required.' }, { status: 400 });
  if (body.eventType === 'outbound_source' && !isUuid(body.storySourceId)) return Response.json({ error: 'A source is required.' }, { status: 400 });

  try {
    const supabase = getSupabaseAdminClient();
    const { data: story, error: storyError } = await supabase.from('stories').select('id, content_type').eq('id', body.storyId).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle();
    if (storyError) throw storyError;
    if (!story) return Response.json({ error: 'Published content was not found.' }, { status: 404 });

    if (body.eventType === 'digest_story') {
      if (story.content_type === 'news') return Response.json({ error: 'Digest interaction is invalid.' }, { status: 400 });
      const { data: related, error } = await supabase.from('stories').select('id').eq('id', body.relatedStoryId as string).eq('status', 'published').maybeSingle();
      if (error) throw error;
      if (!related) return Response.json({ error: 'Related story was not found.' }, { status: 404 });
    }

    if (body.eventType === 'outbound_source') {
      const { data: source, error } = await supabase.from('story_sources').select('id').eq('id', body.storySourceId as string).eq('story_id', story.id).maybeSingle();
      if (error) throw error;
      if (!source) return Response.json({ error: 'Story source was not found.' }, { status: 404 });
    }

    const { data: saved, error } = await supabase.rpc('record_content_interaction', {
      p_event_key: body.eventId,
      p_story_id: story.id,
      p_event_type: body.eventType,
      p_related_story_id: body.eventType === 'digest_story' ? body.relatedStoryId : null,
      p_story_source_id: body.eventType === 'outbound_source' ? body.storySourceId : null,
    });
    if (error) throw error;
    if (!saved) return Response.json({ error: 'This interaction key belongs to another event.' }, { status: 409 });
    return Response.json({ saved: true });
  } catch (error) {
    return unexpectedErrorResponse('Content interaction failed', error, 'The interaction could not be saved.');
  }
}
