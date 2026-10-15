import { advanceEditorialRun, startEditorialRun } from '@/lib/editorial-runner';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    action?: 'start' | 'advance';
    runId?: string;
    maxNewDrafts?: number;
    maxEstimatedCostUsd?: number;
  } | null;

  try {
    if (body?.action === 'start') {
      const maxNewDrafts = Number(body.maxNewDrafts);
      const maxEstimatedCostUsd = Number(body.maxEstimatedCostUsd);
      if (!Number.isFinite(maxNewDrafts) || !Number.isFinite(maxEstimatedCostUsd)) return Response.json({ error: 'Valid run limits are required.' }, { status: 400 });
      return Response.json(await startEditorialRun(user.id, maxNewDrafts, maxEstimatedCostUsd));
    }
    if (body?.action === 'advance' && body.runId && uuidPattern.test(body.runId)) {
      return Response.json(await advanceEditorialRun(body.runId, user.id));
    }
    return Response.json({ error: 'A valid run action is required.' }, { status: 400 });
  } catch (error) {
    console.error('Editorial run request failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'The editorial run could not continue.' }, { status: 500 });
  }
}
