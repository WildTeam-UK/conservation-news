import type { Metadata } from 'next';
import { HeartHandshake } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { GoodNewsControls } from '@/components/good-news-controls';
import { getGoodNewsStatus } from '@/lib/good-news-status';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { firstRelation } from '@/lib/supabase/relations';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Good News | WILDNEWS editorial', robots: { index: false, follow: false } };

type OutlookRow = {
  story_id: string;
  classification: 'positive' | 'mixed' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  rationale: string;
  assessed_at: string;
  stories: { headline: string; slug: string; status: 'draft' | 'published'; published_at: string | null } | { headline: string; slug: string; status: 'draft' | 'published'; published_at: string | null }[];
};

function relatedStory(row: OutlookRow) {
  return firstRelation(row.stories);
}

export default async function GoodNewsAdminPage() {
  const { supabase } = await requireContentAdmin();
  const [{ data: settings, error }, status, { data: outlookData, error: outlookError }] = await Promise.all([
    supabase.from('good_news_settings').select('minimum_score, minimum_confidence').eq('id', true).single(),
    getGoodNewsStatus(),
    supabase.from('story_conservation_outlooks').select('story_id, classification, score, confidence, rationale, assessed_at, stories!inner(headline, slug, status, published_at)').order('score', { ascending: false }).order('confidence', { ascending: false }).limit(1000),
  ]);
  if (error || !settings || outlookError) throw new Error('Unable to load Good News settings. Run the Good News migration first.');
  const outlooks = (outlookData ?? []) as unknown as OutlookRow[];
  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="tags" subview="good-news" />
    <div className="admin-shell admin-good-news-shell">
      <section className="taxonomy-heading">
        <div><p className="eyebrow">Editorial classification</p><h1>Good News</h1><p>Control the evidence threshold for WILDNEWS stories that demonstrate meaningful conservation progress.</p></div>
        <div className="taxonomy-summary"><span><HeartHandshake /></span><strong>{status.qualifying}</strong><small>qualifying articles</small></div>
      </section>
      <GoodNewsControls initialStatus={status} initialSettings={settings} />
      <section className="good-news-evidence">
        <div className="good-news-evidence-heading"><div><p className="eyebrow">Classification evidence</p><h2>How every article was judged</h2><p>Sorted by conservation outlook score. Only published, positive articles that pass both current thresholds qualify for the public archive.</p></div><strong>{outlooks.length} assessments</strong></div>
        <div className="good-news-evidence-table-wrap"><table>
          <thead><tr><th>Article</th><th>Classification</th><th>Outlook</th><th>Confidence</th><th>Archive</th><th>Rationale</th></tr></thead>
          <tbody>{outlooks.map((outlook) => {
            const story = relatedStory(outlook);
            const qualifies = story?.status === 'published' && outlook.classification === 'positive' && outlook.score >= settings.minimum_score && outlook.confidence >= settings.minimum_confidence;
            const archiveReason = qualifies ? 'Qualifies' : story?.status !== 'published' ? 'Not published' : outlook.classification !== 'positive' ? 'Not positive' : outlook.score < settings.minimum_score ? `Below ${settings.minimum_score} outlook` : `Below ${settings.minimum_confidence}% confidence`;
            return <tr key={outlook.story_id}>
              <td><a href={story?.status === 'published' ? `/stories/${story.slug}` : `/admin/drafts/${outlook.story_id}`}>{story?.headline ?? 'Unknown article'}</a><small>{story?.status ?? 'unknown'}</small></td>
              <td><span className={`outlook-label ${outlook.classification}`}>{outlook.classification}</span></td>
              <td><strong>{outlook.score}</strong><small>/100</small></td>
              <td><strong>{outlook.confidence}%</strong></td>
              <td><span className={qualifies ? 'archive-status qualifies' : 'archive-status'}>{archiveReason}</span></td>
              <td><p>{outlook.rationale}</p></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
    </div>
  </main>;
}
