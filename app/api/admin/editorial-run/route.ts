import { advanceEditorialRun, startEditorialRun } from '@/lib/editorial-runner';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user } = auth;

  const body = await request.json().catch(() => null) as {
    action?: 'start' | 'advance';
    runId?: string;
    dailyArticleTarget?: number;
    maxEstimatedCostUsd?: number;
  } | null;

  try {
    if (body?.action === 'start') {
      const dailyArticleTarget = Number(body.dailyArticleTarget);
      const maxEstimatedCostUsd = Number(body.maxEstimatedCostUsd);
      if (!Number.isFinite(dailyArticleTarget) || !Number.isFinite(maxEstimatedCostUsd)) return Response.json({ error: 'Valid run limits are required.' }, { status: 400 });
      return Response.json(await startEditorialRun(user.id, dailyArticleTarget, maxEstimatedCostUsd));
    }
    if (body?.action === 'advance' && isUuid(body.runId)) {
      return Response.json(await advanceEditorialRun(body.runId, user.id));
    }
    return Response.json({ error: 'A valid run action is required.' }, { status: 400 });
  } catch (error) {
    return unexpectedErrorResponse('Editorial run request failed', error, 'The editorial run could not continue.');
  }
}
