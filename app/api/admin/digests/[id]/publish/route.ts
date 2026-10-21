import { publishDigest } from '@/lib/publish-digest';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid digest is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { publicationDate?: string };
  try {
    return Response.json(await publishDigest(id, { reviewerId: auth.user.id, publicationDate: body.publicationDate }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The digest could not be published.' }, { status: 500 });
  }
}
