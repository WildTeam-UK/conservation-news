import { publishDigest } from '@/lib/publish-digest';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid digest is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => ({})) as { publicationDate?: string };
  try {
    return Response.json(await publishDigest(id, { reviewerId: auth.user.id, publicationDate: body.publicationDate }));
  } catch (error) {
    return unexpectedErrorResponse('Digest publication failed', error, 'The digest could not be published.');
  }
}
