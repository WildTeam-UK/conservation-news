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
    runTime?: string;
    dailyMinStories?: number;
    dailyMaxStories?: number;
    weeklyMinStories?: number;
    weeklyMaxStories?: number;
    maxEstimatedCostUsd?: number;
    automationEnabled?: boolean;
    publishImmediately?: boolean;
  } | null;

  const runTime = body?.runTime?.slice(0, 5) ?? '';
  const dailyMin = Number(body?.dailyMinStories);
  const dailyMax = Number(body?.dailyMaxStories);
  const weeklyMin = Number(body?.weeklyMinStories);
  const weeklyMax = Number(body?.weeklyMaxStories);
  const maxCost = Number(body?.maxEstimatedCostUsd);

  if (!timePattern.test(runTime)) return Response.json({ error: 'Choose a valid digest time.' }, { status: 400 });
  if (!Number.isInteger(dailyMin) || !Number.isInteger(dailyMax) || dailyMin < 1 || dailyMax > 50 || dailyMax < dailyMin) {
    return Response.json({ error: 'Daily story limits must be between 1 and 50, with the maximum no lower than the minimum.' }, { status: 400 });
  }
  if (!Number.isInteger(weeklyMin) || !Number.isInteger(weeklyMax) || weeklyMin < 1 || weeklyMax > 100 || weeklyMax < weeklyMin) {
    return Response.json({ error: 'Weekly story limits must be between 1 and 100, with the maximum no lower than the minimum.' }, { status: 400 });
  }
  if (!Number.isFinite(maxCost) || maxCost < 0.05 || maxCost > 100) {
    return Response.json({ error: 'The estimated cost limit must be between $0.05 and $100.' }, { status: 400 });
  }
  if (typeof body?.automationEnabled !== 'boolean' || typeof body?.publishImmediately !== 'boolean') return Response.json({ error: 'Choose valid automation and publishing modes.' }, { status: 400 });

  const { error } = await supabase.from('digest_settings').update({
    automation_enabled: body.automationEnabled,
    run_time: `${runTime}:00`,
    automation_timezone: 'Europe/London',
    weekly_day: 5,
    daily_min_stories: dailyMin,
    daily_max_stories: dailyMax,
    weekly_min_stories: weeklyMin,
    weekly_max_stories: weeklyMax,
    max_estimated_cost_usd: Math.round(maxCost * 100) / 100,
    publish_immediately: body.publishImmediately,
    social_distribution_enabled: false,
    email_distribution_enabled: false,
    updated_by: user.id,
  }).eq('id', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ saved: true, automationEnabled: body.automationEnabled });
}
