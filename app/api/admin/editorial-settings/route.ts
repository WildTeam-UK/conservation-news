import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    automationEnabled?: boolean;
    dailyRunTime?: string;
    maxNewDrafts?: number;
    maxEstimatedCostUsd?: number;
  } | null;
  const maxNewDrafts = Number(body?.maxNewDrafts);
  const maxEstimatedCostUsd = Number(body?.maxEstimatedCostUsd);
  const dailyRunTime = body?.dailyRunTime?.slice(0, 5) ?? '';

  if (typeof body?.automationEnabled !== 'boolean' || !timePattern.test(dailyRunTime)) {
    return Response.json({ error: 'Choose a valid automation status and daily run time.' }, { status: 400 });
  }
  if (!Number.isInteger(maxNewDrafts) || maxNewDrafts < 1 || maxNewDrafts > 25) {
    return Response.json({ error: 'Maximum drafts must be between 1 and 25.' }, { status: 400 });
  }
  if (!Number.isFinite(maxEstimatedCostUsd) || maxEstimatedCostUsd < 0.05 || maxEstimatedCostUsd > 100) {
    return Response.json({ error: 'The estimated cost limit must be between $0.05 and $100.' }, { status: 400 });
  }

  const { error } = await supabase.from('editorial_run_settings').upsert({
    id: true,
    automation_enabled: body.automationEnabled,
    daily_run_time: `${dailyRunTime}:00`,
    automation_timezone: 'Europe/London',
    max_new_drafts: maxNewDrafts,
    max_estimated_cost_usd: Math.round(maxEstimatedCostUsd * 100) / 100,
    updated_by: user.id,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ saved: true });
}
