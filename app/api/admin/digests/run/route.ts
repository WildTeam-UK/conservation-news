import { generateDigest } from '@/lib/openai/generate-digest';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { digestType?: string } | null;
  if (body?.digestType !== 'daily' && body?.digestType !== 'weekly') return Response.json({ error: 'Choose a daily or weekly digest.' }, { status: 400 });
  try {
    return Response.json(await generateDigest(body.digestType, user.id));
  } catch (error) {
    console.error('Digest generation failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'The digest could not be generated.' }, { status: 500 });
  }
}

