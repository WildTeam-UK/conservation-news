/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Eye, Globe2, LockKeyhole } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { DigestTemplate } from '@/components/digest-template';
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
  const { data: run } = await supabase.from('digest_runs').select('id').eq('story_id', story.id).maybeSingle();
  const { data: links } = run ? await supabase.from('digest_run_stories').select('display_order, stories(id, slug, headline, standfirst, image_url, image_alt, published_at)').eq('run_id', run.id).order('display_order') : { data: [] };
  const linkedStories = ((links ?? []) as unknown as LinkedStory[]).flatMap((link) => firstRelation(link.stories) ?? []);
  const sourceStories = await hydrateDigestSourceStories(linkedStories);
  const content = (story.generation_metadata as { digest_content?: DigestContent }).digest_content;
  if (!content) notFound();
  const moreDigests = content.digest_type === 'daily' ? await getPublishedDailyDigests(7) : [];
  const editionDate = story.slug.replace(`${content.digest_type}-digest-`, '');
  const publicPath = `/${content.digest_type === 'weekly' ? 'weekly-digest' : 'daily-digest'}/${editionDate}`;
  const historicalPublicationDate = editionDate < londonCalendarDateFormatter.format(new Date()) ? editionDate : undefined;

  return <main className="admin-page digest-preview-page">
    <AdminHeader />
    <AdminNav active="digests" />
    <div className="admin-shell digest-preview-shell">
      <a className="admin-back-link" href="/admin/digests"><ArrowLeft /> All digests</a>
      <section className={`digest-preview-status ${story.status === 'published' ? 'published' : ''}`}><span>{story.status === 'published' ? <Globe2 /> : <LockKeyhole />}</span><div><p className="eyebrow">Editorial preview</p><h1>{story.status === 'published' ? 'Published edition' : 'Private digest draft'}</h1><p>{story.status === 'published' ? 'This edition is live on the public site.' : historicalPublicationDate ? `This recovered edition will publish with a 14:00 UK timestamp on ${historicalPublicationDate}. Social and email distribution are disabled.` : 'Only signed-in editors can see this page. Social and email distribution are disabled.'}</p></div><div className="digest-preview-actions">{story.status === 'published' ? <a href={publicPath} target="_blank" rel="noopener noreferrer"><Eye /> View public edition</a> : <><a href={`/admin/digests/${story.id}/full-preview`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Full-page preview</a><PublishDigestButton storyId={story.id} publicationDate={historicalPublicationDate} /></>}</div></section>
      <div className="digest-preview-canvas"><InteriorHeader /><DigestTemplate content={content} stories={sourceStories} periodEnd={story.digest_period_end} imageUrl={story.image_url} imageAlt={story.image_alt} moreDigests={moreDigests} /><SiteFooter /></div>
    </div>
  </main>;
}

