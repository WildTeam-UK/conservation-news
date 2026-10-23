/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronDown, ExternalLink, Eye, Globe2, LockKeyhole, Send } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DigestTemplate } from '@/components/digest-template';
import { DigestDeliveryStatus } from '@/components/digest-delivery-status';
import { DigestEmailTest } from '@/components/digest-email-test';
import { InteriorHeader } from '@/components/interior-header';
import { PublishDigestButton } from '@/components/publish-digest-button';
import { SiteFooter } from '@/components/site-footer';
import { getPublishedDailyDigests, hydrateDigestSourceStories, type DigestContent, type DigestSourceStory } from '@/lib/digests';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { firstRelation } from '@/lib/supabase/relations';
import { londonCalendarDateFormatter } from '@/lib/date-format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Digest preview | WILDNEWS editorial', robots: { index: false, follow: false } };

type LinkedStory = { display_order: number; stories: DigestSourceStory | DigestSourceStory[] | null };

export default async function DigestPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireContentAdmin();
  const { data: story, error } = await supabase.from('stories').select('id, slug, status, headline, image_url, image_alt, digest_period_end, generation_metadata').eq('id', id).in('content_type', ['daily_digest', 'weekly_digest']).maybeSingle();
  if (error || !story) notFound();
  const [{ data: run }, { data: settings }] = await Promise.all([
    supabase.from('digest_runs').select('id').eq('story_id', story.id).maybeSingle(),
    supabase.from('digest_settings').select('social_distribution_enabled, social_distribution_mode, email_distribution_enabled').eq('id', true).maybeSingle(),
  ]);
  const [{ data: links }, { data: deliveries }] = run ? await Promise.all([
    supabase.from('digest_run_stories').select('display_order, stories(id, slug, headline, standfirst, image_url, image_alt, published_at)').eq('run_id', run.id).order('display_order'),
    supabase.from('digest_deliveries').select('id, provider, destination, status, provider_reference, attempt_count, last_error').eq('run_id', run.id).order('created_at'),
  ]) : [{ data: [] }, { data: [] }];
  const linkedStories = ((links ?? []) as unknown as LinkedStory[]).flatMap((link) => firstRelation(link.stories) ?? []);
  const sourceStories = await hydrateDigestSourceStories(linkedStories);
  const content = (story.generation_metadata as { digest_content?: DigestContent }).digest_content;
  if (!content) notFound();
  const moreDigests = content.digest_type === 'daily' ? await getPublishedDailyDigests(7) : [];
  const editionDate = story.slug.replace(`${content.digest_type}-digest-`, '');
  const publicPath = `/${content.digest_type === 'weekly' ? 'weekly-digest' : 'daily-digest'}/${editionDate}`;
  const historicalPublicationDate = editionDate < londonCalendarDateFormatter.format(new Date()) ? editionDate : undefined;
  const distributionParts = [settings?.social_distribution_enabled ? settings.social_distribution_mode === 'immediate' ? 'Buffer social posts will publish immediately.' : 'Buffer social posts will be queued.' : '', settings?.email_distribution_enabled && content.digest_type === 'weekly' ? 'The Brevo weekly campaign will be scheduled.' : ''].filter(Boolean);
  const distributionSummary = historicalPublicationDate ? 'External distribution remains paused for recovered historical editions.' : distributionParts.length ? distributionParts.join(' ') : 'External distribution is paused.';
  const distributionDeliveries = (deliveries ?? []) as Array<{ id: string; provider: 'buffer' | 'brevo'; destination: string; status: string; provider_reference: string | null; attempt_count: number; last_error: string | null }>;
  const deliveryNeedsAttention = distributionDeliveries.some((delivery) => ['failed', 'uncertain'].includes(delivery.status));

  return <main className="admin-page digest-preview-page">
    <AdminHeader />
    <AdminNav active="digests" />
    <div className="admin-shell digest-preview-shell">
      <a className="admin-back-link" href="/admin/digests"><ArrowLeft /> All digests</a>
      <section className={`digest-preview-status ${story.status === 'published' ? 'published' : ''}`}><span>{story.status === 'published' ? <Globe2 /> : <LockKeyhole />}</span><div><p className="eyebrow">Editorial preview</p><h1>{story.status === 'published' ? 'Published edition' : 'Private digest draft'}</h1><p>{story.status === 'published' ? `This edition is live on the public site. ${distributionSummary}` : historicalPublicationDate ? `This recovered edition will publish with a 14:00 UK timestamp on ${historicalPublicationDate}. ${distributionSummary}` : `Only signed-in editors can see this page. ${distributionSummary}`}</p></div><div className="digest-preview-actions">{story.status === 'published' ? <a href={publicPath} target="_blank" rel="noopener noreferrer"><Eye /> View public edition</a> : <><a href={`/admin/digests/${story.id}/full-preview`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Full-page preview</a><PublishDigestButton storyId={story.id} publicationDate={historicalPublicationDate} distributionSummary={distributionSummary} /></>}</div></section>
      {content.digest_type === 'weekly' || distributionDeliveries.length ? <details className="admin-control-disclosure digest-operations-disclosure" open={deliveryNeedsAttention}>
        <summary><span><Send /><span><strong>Distribution and email tools</strong><small>Send a private email test, review provider deliveries and retry failures</small></span></span><span className={`admin-disclosure-state${deliveryNeedsAttention ? ' needs-attention' : ''}`}>{deliveryNeedsAttention ? 'Needs attention' : distributionDeliveries.length ? `${distributionDeliveries.length} ${distributionDeliveries.length === 1 ? 'delivery' : 'deliveries'}` : 'Test available'} <ChevronDown /></span></summary>
        <div className="digest-preview-operations">
          {content.digest_type === 'weekly' ? <DigestEmailTest storyId={story.id} configured={Boolean(process.env.BREVO_API_KEY?.trim() && /^\d+$/.test(process.env.BREVO_LIST_ID?.trim() ?? '') && /^\d+$/.test(process.env.BREVO_SENDER_ID?.trim() ?? ''))} /> : null}
          <DigestDeliveryStatus storyId={story.id} deliveries={distributionDeliveries} />
        </div>
      </details> : null}
      <div className="digest-preview-heading"><div><p className="eyebrow">Edition preview</p><h2>{story.headline}</h2></div><p>This is the exact public page layout. Use the controls above for publishing and distribution.</p></div>
      <div className="digest-preview-canvas"><InteriorHeader /><DigestTemplate content={content} stories={sourceStories} periodEnd={story.digest_period_end} imageUrl={story.image_url} imageAlt={story.image_alt} moreDigests={moreDigests} /><SiteFooter /></div>
    </div>
  </main>;
}

