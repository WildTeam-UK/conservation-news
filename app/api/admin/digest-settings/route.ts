import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isTime } from '@/lib/validation';
import { refreshDigestDistributionStatus } from '@/lib/digest-distribution';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null) as {
    runTime?: string;
    dailyMinStories?: number;
    dailyMaxStories?: number;
    weeklyMinStories?: number;
    weeklyMaxStories?: number;
    maxEstimatedCostUsd?: number;
    automationEnabled?: boolean;
    publishImmediately?: boolean;
    socialDistributionEnabled?: boolean;
    emailDistributionEnabled?: boolean;
  } | null;

  const runTime = body?.runTime?.slice(0, 5) ?? '';
  const dailyMin = Number(body?.dailyMinStories);
  const dailyMax = Number(body?.dailyMaxStories);
  const weeklyMin = Number(body?.weeklyMinStories);
  const weeklyMax = Number(body?.weeklyMaxStories);
  const maxCost = Number(body?.maxEstimatedCostUsd);

  if (!isTime(runTime)) return Response.json({ error: 'Choose a valid digest time.' }, { status: 400 });
  if (!Number.isInteger(dailyMin) || !Number.isInteger(dailyMax) || dailyMin < 1 || dailyMax > 50 || dailyMax < dailyMin) {
    return Response.json({ error: 'Daily story limits must be between 1 and 50, with the maximum no lower than the minimum.' }, { status: 400 });
  }
  if (!Number.isInteger(weeklyMin) || !Number.isInteger(weeklyMax) || weeklyMin < 1 || weeklyMax > 100 || weeklyMax < weeklyMin) {
    return Response.json({ error: 'Weekly story limits must be between 1 and 100, with the maximum no lower than the minimum.' }, { status: 400 });
  }
  if (!Number.isFinite(maxCost) || maxCost < 0.05 || maxCost > 100) {
    return Response.json({ error: 'The estimated cost limit must be between $0.05 and $100.' }, { status: 400 });
  }
  if (typeof body?.automationEnabled !== 'boolean' || typeof body?.publishImmediately !== 'boolean' || typeof body?.socialDistributionEnabled !== 'boolean' || typeof body?.emailDistributionEnabled !== 'boolean') return Response.json({ error: 'Choose valid automation, publishing and distribution modes.' }, { status: 400 });
  const bufferConfigured = Boolean(process.env.BUFFER_API_KEY?.trim() && process.env.BUFFER_CHANNEL_IDS?.split(',').some((value) => value.trim()));
  const brevoConfigured = Boolean(process.env.BREVO_API_KEY?.trim() && /^\d+$/.test(process.env.BREVO_LIST_ID?.trim() ?? '') && /^\d+$/.test(process.env.BREVO_SENDER_ID?.trim() ?? ''));
  if (body.socialDistributionEnabled && !bufferConfigured) return Response.json({ error: 'Configure the Buffer API key and channel IDs before enabling social distribution.' }, { status: 400 });
  if (body.emailDistributionEnabled && !brevoConfigured) return Response.json({ error: 'Configure the Brevo API key, list and sender before enabling email distribution.' }, { status: 400 });

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
    social_distribution_enabled: body.socialDistributionEnabled,
    email_distribution_enabled: body.emailDistributionEnabled,
    updated_by: user.id,
  }).eq('id', true);
  if (error) {
    console.error('Digest settings save failed', error);
    return Response.json({ error: 'Digest settings could not be saved.' }, { status: 500 });
  }

  const disabledProviders = [!body.socialDistributionEnabled ? 'buffer' : '', !body.emailDistributionEnabled ? 'brevo' : ''].filter(Boolean);
  if (disabledProviders.length) {
    const { data: pending } = await supabase.from('digest_deliveries').select('id, run_id').in('provider', disabledProviders).eq('status', 'pending');
    if (pending?.length) {
      await supabase.from('digest_deliveries').update({ status: 'cancelled', completed_at: new Date().toISOString(), last_error: 'Distribution channel disabled by an editor.' }).in('id', pending.map((delivery) => delivery.id)).eq('status', 'pending');
      await Promise.all([...new Set(pending.map((delivery) => delivery.run_id))].map(refreshDigestDistributionStatus));
    }
  }

  return Response.json({ saved: true, automationEnabled: body.automationEnabled });
}
