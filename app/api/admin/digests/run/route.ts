import { generateDigest } from '@/lib/openai/generate-digest';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isCalendarDate } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user } = auth;
  const body = await request.json().catch(() => null) as { digestType?: string; targetDate?: string } | null;
  if (body?.digestType !== 'daily' && body?.digestType !== 'weekly') return Response.json({ error: 'Choose a daily or weekly digest.' }, { status: 400 });
  if (body.targetDate && !isCalendarDate(body.targetDate)) return Response.json({ error: 'Choose a valid missed daily edition date.' }, { status: 400 });
  try {
    return Response.json(await generateDigest(body.digestType, user.id, { targetDate: body.targetDate }));
  } catch (error) {
    console.error('Digest generation failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'The digest could not be generated.' }, { status: 500 });
  }
}

