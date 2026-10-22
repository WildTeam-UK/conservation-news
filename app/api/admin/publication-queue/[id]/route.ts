import { unexpectedErrorResponse } from '@/lib/api-errors';
import { cancelQueuedPublication, PublicationQueueConflict } from '@/lib/publication-queue';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid queue item is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  try {
    return Response.json(await cancelQueuedPublication(id));
  } catch (error) {
    if (error instanceof PublicationQueueConflict) return Response.json({ error: error.message }, { status: 409 });
    return unexpectedErrorResponse('Removing an article from the publication queue failed', error, 'The article could not be removed from the queue.');
  }
}
