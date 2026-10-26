import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isTime } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null) as {
    automationEnabled?: boolean;
    dailyRunTime?: string;
    maxNewDrafts?: number;
    maxEstimatedCostUsd?: number;
    candidateFreshnessDays?: number;
    candidateFreshnessDecayPerDay?: number;
    candidateWildlifeBonus?: number;
  } | null;
  const maxNewDrafts = Number(body?.maxNewDrafts);
  const maxEstimatedCostUsd = Number(body?.maxEstimatedCostUsd);
  const dailyRunTime = body?.dailyRunTime?.slice(0, 5) ?? '';
  const candidateFreshnessDays = Number(body?.candidateFreshnessDays);
  const candidateFreshnessDecayPerDay = Number(body?.candidateFreshnessDecayPerDay);
  const candidateWildlifeBonus = Number(body?.candidateWildlifeBonus);

  if (typeof body?.automationEnabled !== 'boolean' || !isTime(dailyRunTime)) {
    return Response.json({ error: 'Choose a valid automation status and daily run time.' }, { status: 400 });
  }
  if (!Number.isInteger(maxNewDrafts) || maxNewDrafts < 1 || maxNewDrafts > 25) {
    return Response.json({ error: 'Maximum drafts must be between 1 and 25.' }, { status: 400 });
  }
  if (!Number.isFinite(maxEstimatedCostUsd) || maxEstimatedCostUsd < 0.05 || maxEstimatedCostUsd > 100) {
    return Response.json({ error: 'The estimated cost limit must be between $0.05 and $100.' }, { status: 400 });
  }
  if (!Number.isInteger(candidateFreshnessDays) || candidateFreshnessDays < 1 || candidateFreshnessDays > 30) {
    return Response.json({ error: 'Candidate freshness must be between 1 and 30 days.' }, { status: 400 });
  }
  if (!Number.isFinite(candidateFreshnessDecayPerDay) || candidateFreshnessDecayPerDay < 0 || candidateFreshnessDecayPerDay > 20) {
    return Response.json({ error: 'Daily freshness decay must be between 0 and 20 points.' }, { status: 400 });
  }
  if (!Number.isFinite(candidateWildlifeBonus) || candidateWildlifeBonus < 0 || candidateWildlifeBonus > 10) {
    return Response.json({ error: 'The wildlife bonus must be between 0 and 10 points.' }, { status: 400 });
  }

  const { error } = await supabase.from('editorial_run_settings').upsert({
    id: true,
    automation_enabled: body.automationEnabled,
    daily_run_time: `${dailyRunTime}:00`,
    automation_timezone: 'Europe/London',
    max_new_drafts: maxNewDrafts,
    max_estimated_cost_usd: Math.round(maxEstimatedCostUsd * 100) / 100,
    candidate_freshness_days: candidateFreshnessDays,
    candidate_freshness_decay_per_day: Math.round(candidateFreshnessDecayPerDay * 100) / 100,
    candidate_wildlife_bonus: Math.round(candidateWildlifeBonus * 100) / 100,
    updated_by: user.id,
  });
  if (error) {
    console.error('Editorial settings save failed', error);
    return Response.json({ error: 'Editorial settings could not be saved.' }, { status: 500 });
  }

  return Response.json({ saved: true });
}
