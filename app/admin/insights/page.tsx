/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh protected Supabase admin views in Vinext */
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, ExternalLink, HeartHandshake, Mail, MousePointerClick, Share2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Insights | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type ContentOutcome = {
  story_id: string;
  slug: string;
  headline: string;
  content_type: 'news' | 'daily_digest' | 'weekly_digest';
  views: number;
  usefulness_positive: number;
  usefulness_negative: number;
  share_actions: number;
  outbound_source_clicks: number;
  digest_story_clicks: number;
};

type SourceOutcome = { source_id: string | null; source_name: string; outbound_clicks: number; stories_clicked: number };
type Delivery = { provider: 'buffer' | 'brevo'; status: string };
type CostRun = { status: string; estimated_cost_usd: number | string | null };

function contentHref(outcome: ContentOutcome) {
  if (outcome.content_type === 'news') return `/stories/${outcome.slug}`;
  const type = outcome.content_type === 'weekly_digest' ? 'weekly' : 'daily';
  return `/${type}-digest/${outcome.slug.replace(`${type}-digest-`, '')}`;
}

function total(rows: ContentOutcome[], key: keyof Pick<ContentOutcome, 'views' | 'usefulness_positive' | 'usefulness_negative' | 'share_actions' | 'outbound_source_clicks' | 'digest_story_clicks'>) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

export default async function InsightsPage() {
  const { supabase } = await requireContentAdmin();
  // This dynamic server-rendered page needs the current request time for rolling windows.
  // oxlint-disable-next-line react/react-compiler
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [contentResult, sourceResult, deliveriesResult, editorialRunsResult, digestRunsResult, heldResult, recommendationResult, policyResult] = await Promise.all([
    supabase.from('content_outcomes_30d').select('*').order('views', { ascending: false }).limit(50),
    supabase.from('source_outcomes_30d').select('*').order('outbound_clicks', { ascending: false }).limit(25),
    supabase.from('digest_deliveries').select('provider, status').gte('created_at', thirtyDaysAgo),
    supabase.from('editorial_runs').select('status, estimated_cost_usd').gte('created_at', sevenDaysAgo),
    supabase.from('digest_runs').select('status, estimated_cost_usd').neq('status', 'skipped').gte('created_at', sevenDaysAgo),
    supabase.from('publication_queue').select('*', { count: 'exact', head: true }).eq('status', 'held'),
    supabase.from('source_network_recommendations').select('status').in('status', ['open', 'accepted', 'dismissed']).gte('last_seen_at', ninetyDaysAgo),
    supabase.from('source_learning_policy').select('*').eq('id', true).single(),
  ]);

  if (contentResult.error || sourceResult.error || deliveriesResult.error || editorialRunsResult.error || digestRunsResult.error || heldResult.error || recommendationResult.error || policyResult.error) {
    throw new Error('Unable to load editorial insights.');
  }

  const content = (contentResult.data ?? []) as ContentOutcome[];
  const sources = (sourceResult.data ?? []) as SourceOutcome[];
  const deliveries = (deliveriesResult.data ?? []) as Delivery[];
  const editorialRuns = (editorialRunsResult.data ?? []) as CostRun[];
  const digestRuns = (digestRunsResult.data ?? []) as CostRun[];
  const failedRuns = [...editorialRuns, ...digestRuns].filter((run) => ['failed', 'partial', 'budget_stopped'].includes(run.status)).length;
  const deliveryIssues = deliveries.filter((delivery) => ['failed', 'uncertain'].includes(delivery.status)).length;
  const completedRuns = [...editorialRuns, ...digestRuns].filter((run) => ['completed', 'published'].includes(run.status)).length;
  const estimatedCost = [...editorialRuns, ...digestRuns].reduce((sum, run) => sum + Number(run.estimated_cost_usd ?? 0), 0);
  const heldCount = heldResult.count ?? 0;
  const operationalIssues = failedRuns + deliveryIssues + heldCount;
  const positive = total(content, 'usefulness_positive');
  const negative = total(content, 'usefulness_negative');
  const feedbackTotal = positive + negative;
  const buffer = deliveries.filter((delivery) => delivery.provider === 'buffer');
  const brevo = deliveries.filter((delivery) => delivery.provider === 'brevo');
  const reviewedRecommendations = (recommendationResult.data ?? []).filter((recommendation) => recommendation.status !== 'open').length;
  const acceptedRecommendations = (recommendationResult.data ?? []).filter((recommendation) => recommendation.status === 'accepted').length;
  const policy = policyResult.data;

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="insights" />
    <div className="admin-shell admin-insights-shell">
      <section className="admin-welcome" aria-labelledby="insights-heading"><p className="eyebrow">Editorial learning</p><h1 id="insights-heading">Insights</h1><p>Anonymous usefulness and interaction signals, source outcomes and operational performance. Early numbers are directional, not editorial instructions.</p></section>

      <section className={`insights-health ${operationalIssues ? 'attention' : 'healthy'}`} aria-label="Seven-day operational summary">
        {operationalIssues ? <AlertTriangle /> : <CheckCircle2 />}
        <div><p className="eyebrow">Last seven days</p><h2>{operationalIssues ? `${operationalIssues} item${operationalIssues === 1 ? '' : 's'} need attention` : 'Nothing to see here, all good'}</h2><p>{completedRuns} successful workflow run{completedRuns === 1 ? '' : 's'} · ${estimatedCost.toFixed(2)} estimated AI cost · {heldCount} held article{heldCount === 1 ? '' : 's'} · {deliveryIssues} delivery issue{deliveryIssues === 1 ? '' : 's'}</p></div>
      </section>

      <section className="insights-metrics" aria-label="Thirty-day audience signals">
        <article><MousePointerClick /><span><strong>{total(content, 'views')}</strong><small>Content views</small></span></article>
        <article><HeartHandshake /><span><strong>{feedbackTotal ? `${Math.round((positive / feedbackTotal) * 100)}%` : 'No data'}</strong><small>Found useful · {feedbackTotal} votes</small></span></article>
        <article><Share2 /><span><strong>{total(content, 'share_actions')}</strong><small>Share actions</small></span></article>
        <article><ExternalLink /><span><strong>{total(content, 'outbound_source_clicks') + total(content, 'digest_story_clicks')}</strong><small>Reading clicks</small></span></article>
      </section>

      <section className="insights-panel">
        <div className="overview-section-heading"><div><p className="eyebrow">Articles and digests</p><h2>Content outcomes, last 30 days</h2></div><p>Views are page loads, not unique visitors. Usefulness comes from explicit reader votes.</p></div>
        <div className="insights-table-wrap"><table className="insights-table"><thead><tr><th scope="col">Content</th><th scope="col">Views</th><th scope="col">Useful</th><th scope="col">Not useful</th><th scope="col">Shares</th><th scope="col">Clicks</th></tr></thead><tbody>{content.filter((row) => row.views || row.usefulness_positive || row.usefulness_negative || row.share_actions || row.outbound_source_clicks || row.digest_story_clicks).map((row) => <tr key={row.story_id}><td><a href={contentHref(row)} target="_blank" rel="noopener noreferrer" aria-label={`Open published content: ${row.headline}`}><span>{row.content_type.replaceAll('_', ' ')}</span><strong>{row.headline}</strong></a></td><td>{row.views}</td><td>{row.usefulness_positive}</td><td>{row.usefulness_negative}</td><td>{row.share_actions}</td><td>{row.outbound_source_clicks + row.digest_story_clicks}</td></tr>)}</tbody></table></div>
        {!content.some((row) => row.views || row.usefulness_positive || row.usefulness_negative || row.share_actions || row.outbound_source_clicks || row.digest_story_clicks) ? <p className="insights-empty">Signals will appear here after the migration is live and readers visit published content.</p> : null}
      </section>

      <div className="insights-columns">
        <section className="insights-panel"><div className="overview-section-heading"><div><p className="eyebrow">Source outcomes</p><h2>Readers following reporting</h2></div></div>{sources.length ? <ol className="insights-ranked-list">{sources.map((source) => <li key={`${source.source_id ?? 'unmonitored'}-${source.source_name}`}><span><strong>{source.source_name}</strong><small>{source.stories_clicked} article{source.stories_clicked === 1 ? '' : 's'} prompted clicks</small></span><b>{source.outbound_clicks}</b></li>)}</ol> : <p className="insights-empty">No outbound source clicks have been recorded yet.</p>}</section>
        <section className="insights-panel"><div className="overview-section-heading"><div><p className="eyebrow">Distribution outcomes</p><h2>Digest delivery, last 30 days</h2></div></div><div className="insights-delivery-grid"><article><Share2 /><strong>{buffer.filter((item) => ['submitted', 'completed'].includes(item.status)).length}</strong><span>Buffer submissions</span><small>{buffer.filter((item) => ['failed', 'uncertain'].includes(item.status)).length} unresolved</small></article><article><Mail /><strong>{brevo.filter((item) => ['submitted', 'completed'].includes(item.status)).length}</strong><span>Brevo sends</span><small>{brevo.filter((item) => ['failed', 'uncertain'].includes(item.status)).length} unresolved</small></article></div><p className="insights-note">Provider engagement metrics will be added only after the available Buffer fields are confirmed. These figures currently report WildNews delivery outcomes.</p></section>
      </div>

      <section className="insights-panel insights-calibration"><div><p className="eyebrow">Source learning guardrail</p><h2>Recommendations remain review-only</h2><p>Automatic source-list changes are locked off. A future migration may enable them only after at least {policy.observation_days} days, {policy.minimum_reviewed_recommendations} reviewed recommendations, {policy.minimum_decisions_per_rule} decisions for every rule and an acceptance rate of at least {Math.round(Number(policy.minimum_acceptance_rate) * 100)}%.</p></div><strong>{reviewedRecommendations ? `${Math.round((acceptedRecommendations / reviewedRecommendations) * 100)}%` : 'No baseline yet'}<small>{reviewedRecommendations} reviewed in the current 90-day window</small></strong></section>
    </div>
  </main>;
}
