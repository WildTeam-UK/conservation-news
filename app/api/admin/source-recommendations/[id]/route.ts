import { unexpectedErrorResponse } from '@/lib/api-errors';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid source recommendation is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body?.action || !['accept', 'dismiss'].includes(body.action)) {
    return Response.json({ error: 'Choose a valid recommendation decision.' }, { status: 400 });
  }

  try {
    const { data, error } = await auth.supabase
      .from('source_network_recommendations')
      .update({
        status: body.action === 'accept' ? 'accepted' : 'dismissed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq('id', id)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: 'This recommendation has already been reviewed.' }, { status: 409 });
    return Response.json({ saved: true });
  } catch (error) {
    return unexpectedErrorResponse('Source recommendation decision failed', error, 'The recommendation could not be updated.');
  }
}
