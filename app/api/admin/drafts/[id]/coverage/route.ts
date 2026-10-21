import { recalculateStoryCoverage } from '@/lib/openai/draft-story';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid draft is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user } = auth;
  try {
    return Response.json(await recalculateStoryCoverage(id, user.id));
  } catch (error) {
    return unexpectedErrorResponse('Coverage recalculation failed', error, 'Coverage analysis could not be recalculated.');
  }
}
