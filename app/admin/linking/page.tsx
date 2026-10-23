import type { Metadata } from 'next';
import { Link2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { ContextualLinkControls } from '@/components/contextual-link-controls';
import { getContextualLinkStatus } from '@/lib/openai/assess-contextual-links';
import { CONTEXTUAL_LINK_PROMPT_VERSION } from '@/lib/openai/plan-contextual-links';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { firstRelation } from '@/lib/supabase/relations';
import { londonMediumDateTimeFormatter } from '@/lib/date-format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Link health | WILDNEWS editorial', robots: { index: false, follow: false } };

type LinkedStory = { headline: string; slug: string; status: 'draft' | 'published'; content_type: 'news' | 'daily_digest' | 'weekly_digest' };
type AssessmentRow = {
  story_id: string;
  status: 'completed' | 'failed';
  proposed_count: number;
  link_count: number;
  rejected_count: number;
  rejection_reasons: Record<string, number>;
  accepted_types: Record<string, number>;
  estimated_cost_usd: number | string;
  error_summary: string | null;
  assessed_at: string;
  stories: LinkedStory | LinkedStory[];
};

function storyPath(row: AssessmentRow) {
  const story = firstRelation(row.stories);
  if (!story) return '/admin/linking';
  if (story.status === 'draft') return story.content_type === 'news' ? `/admin/drafts/${row.story_id}` : `/admin/digests/${row.story_id}`;
  if (story.content_type === 'daily_digest') return `/daily-digest/${story.slug.replace('daily-digest-', '')}`;
  if (story.content_type === 'weekly_digest') return `/weekly-digest/${story.slug.replace('weekly-digest-', '')}`;
  return `/stories/${story.slug}`;
}

export default async function LinkingAdminPage() {
  const { supabase } = await requireContentAdmin();
  const [status, { data, error }] = await Promise.all([
    getContextualLinkStatus(),
    supabase.from('story_linking_assessments')
      .select('story_id, status, proposed_count, link_count, rejected_count, rejection_reasons, accepted_types, estimated_cost_usd, error_summary, assessed_at, stories!inner(headline, slug, status, content_type)')
      .eq('prompt_version', CONTEXTUAL_LINK_PROMPT_VERSION)
      .order('assessed_at', { ascending: false })
      .limit(50),
  ]);
  if (error) throw new Error('Unable to load contextual-link assessments. Run the linking diagnostics migration first.');
  const assessments = (data ?? []) as unknown as AssessmentRow[];

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="pipeline" subview="linking" />
    <div className="admin-shell admin-linking-shell">
      <section className="taxonomy-heading">
        <div><p className="eyebrow">Editorial connections</p><h1>Link health</h1><p>Monitor the dedicated contextual-link pass across finished articles and digests, including validation outcomes and retryable failures.</p></div>
        <div className="taxonomy-summary"><span><Link2 /></span><strong>{status.acceptedLinks}</strong><small>accepted links</small></div>
      </section>
      <ContextualLinkControls initialStatus={status} />
      <section className="good-news-evidence">
        <div className="good-news-evidence-heading"><div><p className="eyebrow">Recent assessments</p><h2>What the validator accepted</h2><p>Proposals are checked for relevance confidence, exact complete-word anchors, approved destinations, duplicates and per-type limits.</p></div><strong>{assessments.length} recent</strong></div>
        <div className="good-news-evidence-table-wrap"><table>
          <thead><tr><th>Content</th><th>Status</th><th>Proposed</th><th>Accepted</th><th>Rejected</th><th>Outcome</th></tr></thead>
          <tbody>{assessments.map((assessment) => {
            const story = firstRelation(assessment.stories);
            const reasons = Object.entries(assessment.rejection_reasons ?? {}).filter(([, count]) => count > 0).map(([reason, count]) => `${reason.replaceAll('_', ' ')} (${count})`).join(', ');
            const types = Object.entries(assessment.accepted_types ?? {}).filter(([, count]) => count > 0).map(([type, count]) => `${type} ${count}`).join(', ');
            return <tr key={assessment.story_id}>
              <td><a href={storyPath(assessment)}>{story?.headline ?? 'Unknown content'}</a><small>{story?.content_type.replaceAll('_', ' ')} · {londonMediumDateTimeFormatter.format(new Date(assessment.assessed_at))}</small></td>
              <td><span className={assessment.status === 'completed' ? 'archive-status qualifies' : 'archive-status'}>{assessment.status}</span></td>
              <td><strong>{assessment.proposed_count}</strong></td>
              <td><strong>{assessment.link_count}</strong></td>
              <td><strong>{assessment.rejected_count}</strong></td>
              <td><p>{assessment.error_summary ?? (types || 'No links accepted')}{reasons ? ` · Rejected: ${reasons}` : ''} · ${Number(assessment.estimated_cost_usd).toFixed(4)}</p></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
    </div>
  </main>;
}
