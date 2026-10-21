import { cancelQueuedPublication } from '@/lib/publication-queue';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid queue item is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  try {
    return Response.json(await cancelQueuedPublication(id));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The article could not be removed from the queue.';
    return Response.json({ error: detail }, { status: 409 });
  }
}
