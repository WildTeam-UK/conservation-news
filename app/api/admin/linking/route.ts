import { assessContextualLinkBatch, assessStoryContextualLinks } from '@/lib/openai/assess-contextual-links';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const payload = await request.json().catch(() => ({})) as { storyId?: string; retryFailed?: boolean; limit?: number };
    if (payload.storyId) return Response.json(await assessStoryContextualLinks(payload.storyId));
    return Response.json(await assessContextualLinkBatch(payload.limit ?? 5, Boolean(payload.retryFailed)));
  } catch (error) {
    return unexpectedErrorResponse('Contextual-link assessment failed', error, 'Contextual links could not be assessed.');
  }
}
