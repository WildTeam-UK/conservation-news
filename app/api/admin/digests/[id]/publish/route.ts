import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publishDigest } from '@/lib/publish-digest';

export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return admin ? user : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid digest is required.' }, { status: 400 });
  const user = await adminUser();
  if (!user) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { publicationDate?: string };
  try {
    return Response.json(await publishDigest(id, { reviewerId: user.id, publicationDate: body.publicationDate }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The digest could not be published.' }, { status: 500 });
  }
}
