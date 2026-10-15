import { researchCandidate } from '@/lib/openai/research-story';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { clusterId?: string } | null;
  if (!body?.clusterId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.clusterId)) {
    return Response.json({ error: 'A valid candidate is required.' }, { status: 400 });
  }

  try {
    return Response.json(await researchCandidate(body.clusterId));
  } catch (error) {
    console.error('Candidate research failed', error);
    return Response.json({ error: 'The research pack could not be completed.' }, { status: 500 });
  }
}
