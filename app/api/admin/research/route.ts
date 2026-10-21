import { researchCandidate } from '@/lib/openai/research-story';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

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
