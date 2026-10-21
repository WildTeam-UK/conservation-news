import { researchCandidate } from '@/lib/openai/research-story';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => null) as { clusterId?: string } | null;
  if (!isUuid(body?.clusterId)) {
    return Response.json({ error: 'A valid candidate is required.' }, { status: 400 });
  }

  try {
    return Response.json(await researchCandidate(body.clusterId));
  } catch (error) {
    console.error('Candidate research failed', error);
    return Response.json({ error: 'The research pack could not be completed.' }, { status: 500 });
  }
}
