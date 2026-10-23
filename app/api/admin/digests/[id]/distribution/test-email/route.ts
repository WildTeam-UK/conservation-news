import { unexpectedErrorResponse } from '@/lib/api-errors';
import { buildEmailDistributionPayload } from '@/lib/distribution/digest-content';
import { createBrevoTestCampaign, deleteBrevoCampaign, sendBrevoCampaignTest } from '@/lib/distribution/brevo';
import { digestTextGraphemes, type DigestContent, type DigestSourceStory } from '@/lib/digests';
import { positiveIntegerEnvironmentValue } from '@/lib/environment';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DigestStory = {
  id: string;
  slug: string;
  content_type: 'weekly_digest';
  image_url: string | null;
  generation_metadata: {
    digest_content?: DigestContent;
    digest_source_stories?: DigestSourceStory[];
  };
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = await params;
  if (!isUuid(storyId)) return Response.json({ error: 'A valid weekly digest is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== 'string') return Response.json({ error: 'Enter a test email address.' }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) return Response.json({ error: 'Enter a valid test email address.' }, { status: 400 });

  const [{ data: story, error: storyError }, { data: run, error: runError }] = await Promise.all([
    auth.supabase.from('stories').select('id, slug, content_type, image_url, generation_metadata').eq('id', storyId).eq('content_type', 'weekly_digest').maybeSingle(),
    auth.supabase.from('digest_runs').select('id').eq('story_id', storyId).eq('digest_type', 'weekly').maybeSingle(),
  ]);
  if (storyError || runError || !story || !run) return Response.json({ error: 'The weekly digest could not be found.' }, { status: 404 });

  const digestStory = story as DigestStory;
  const content = digestStory.generation_metadata.digest_content;
  if (!content) return Response.json({ error: 'The weekly digest has no verified email content.' }, { status: 409 });
  const editionDate = digestStory.slug.replace('weekly-digest-', '');
  let campaignId: string | null = null;
  let cleanupFailed = false;
  try {
    const listId = positiveIntegerEnvironmentValue('BREVO_LIST_ID', process.env.BREVO_LIST_ID);
    const payload = buildEmailDistributionPayload({
      runId: run.id,
      type: 'weekly',
      editionDate,
      content,
      sources: digestStory.generation_metadata.digest_source_stories ?? [],
      imageUrl: digestStory.image_url,
      listId,
    });
    payload.subject = digestTextGraphemes(`[TEST] ${payload.subject}`).slice(0, 150).join('');
    payload.tag = `wildnews-test-${editionDate}`;
    campaignId = await createBrevoTestCampaign(payload);
    await sendBrevoCampaignTest(campaignId, email);
  } catch (error) {
    return unexpectedErrorResponse('Brevo digest test failed', error, 'Brevo could not send the test email.', 502);
  } finally {
    if (campaignId) {
      try {
        await deleteBrevoCampaign(campaignId);
      } catch (error) {
        cleanupFailed = true;
        console.error('Brevo test campaign cleanup failed', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  await auth.supabase.from('digest_run_events').insert({
    run_id: run.id,
    stage: 'distribution',
    message: 'An editor sent a Brevo test email.',
    details: { provider: 'brevo', kind: 'test', test_campaign_removed: !cleanupFailed },
  });
  return Response.json({ sent: true, cleanupWarning: cleanupFailed });
}
