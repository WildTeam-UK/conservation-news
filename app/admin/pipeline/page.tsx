/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh the protected Supabase session in Vinext */
import type { Metadata } from 'next';
import { Activity, AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, Clock3, ExternalLink, Inbox, Rss } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { RunAssessmentButton } from '@/components/run-assessment-button';
import { RunCollectionButton } from '@/components/run-collection-button';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { sourceRelationName } from '@/lib/supabase/relations';
import { londonMediumDateTimeFormatter as dateTime } from '@/lib/date-format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type RecentItem = {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  discovered_at: string;
  assessment_status: string;
  sources: { name: string } | { name: string }[] | null;
};

type TopCandidate = {
  id: string;
  working_title: string;
  overall_score: number | null;
  evidence_score: number | null;
  assessment: { primary_topic?: string } | null;
};

export default async function PipelinePage() {
  const { supabase } = await requireContentAdmin();
  const [itemsResult, pendingResult, processingResult, failedResult, selectedResult, rejectedResult, sourcesResult, recentItemsResult, candidatesResult, ingestionResult, editorialResult] = await Promise.all([
    supabase.from('source_items').select('*', { count: 'exact', head: true }),
    supabase.from('source_items').select('*', { count: 'exact', head: true }).eq('assessment_status', 'pending'),
    supabase.from('source_items').select('*', { count: 'exact', head: true }).eq('assessment_status', 'processing'),
    supabase.from('source_items').select('*', { count: 'exact', head: true }).eq('assessment_status', 'failed'),
    supabase.from('story_clusters').select('*', { count: 'exact', head: true }).eq('status', 'selected'),
    supabase.from('story_clusters').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('source_items').select('id, title, url, published_at, discovered_at, assessment_status, sources(name)').order('discovered_at', { ascending: false }).limit(6),
    supabase.from('story_clusters').select('id, working_title, overall_score, evidence_score, assessment').eq('status', 'selected').order('overall_score', { ascending: false }).limit(5),
    supabase.from('ingestion_runs').select('id, status, sources_checked, items_found, items_new, error_summary, created_at').order('created_at', { ascending: false }).limit(1),
    supabase.from('editorial_runs').select('id, status, drafts_created, candidates_selected, estimated_cost_usd, created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  if (recentItemsResult.error || candidatesResult.error) throw new Error('Unable to load the editorial pipeline.');

  const recentItems = (recentItemsResult.data ?? []) as RecentItem[];
  const candidates = (candidatesResult.data ?? []) as TopCandidate[];
  const latestIngestion = ingestionResult.data?.[0];
  const latestEditorial = editorialResult.data?.[0];
  const pending = pendingResult.count ?? 0;
  const processing = processingResult.count ?? 0;
  const failed = failedResult.count ?? 0;
  const attentionCount = processing + failed;

  return (
    <main className="admin-page">
      <AdminHeader />
      <AdminNav active="pipeline" subview="pipeline-status" />

      <div className="admin-shell admin-pipeline-shell">
        <section className="pipeline-heading" aria-labelledby="pipeline-heading">
          <div><p className="eyebrow">Editorial engine</p><h1 id="pipeline-heading">Pipeline</h1><p>See content move from monitored sources through assessment and into article production. The daily workflow handles this automatically; these controls are here when you need them.</p></div>
          <div className={`overview-health-pill ${attentionCount ? 'attention' : 'healthy'}`}>{attentionCount ? <AlertTriangle /> : <CheckCircle2 />}<span><strong>{attentionCount ? 'Review pipeline' : 'Pipeline healthy'}</strong><small>{attentionCount ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} processing or failed` : `${pending} awaiting assessment`}</small></span></div>
        </section>

        <section className="pipeline-flow" aria-label="Pipeline status">
          <a href="/admin/collected"><span><Rss /></span><div><small>Collected</small><strong>{itemsResult.count ?? 0}</strong><p>items from {sourcesResult.count ?? 0} active sources</p></div><ArrowRight /></a>
          <a href="/admin/collected"><span><Clock3 /></span><div><small>Awaiting assessment</small><strong>{pending}</strong><p>{processing ? `${processing} currently processing` : 'ready for the next run'}</p></div><ArrowRight /></a>
          <a href="/admin/candidates"><span><BrainCircuit /></span><div><small>Recommended</small><strong>{selectedResult.count ?? 0}</strong><p>{rejectedResult.count ?? 0} assessed but not selected</p></div><ArrowRight /></a>
        </section>

        <details className="pipeline-tools-disclosure">
          <summary><span><Activity /><span><strong>Manual pipeline tools</strong><small>Run collection or assessment outside the daily workflow.</small></span></span><span>Open tools</span></summary>
          <section className="pipeline-controls" aria-labelledby="pipeline-controls-heading">
            <div className="overview-section-heading"><div><p className="eyebrow">Manual tools</p><h2 id="pipeline-controls-heading">Run an individual stage</h2></div><p>The scheduled workflow already runs both stages. Use these for testing or an extra check during the day.</p></div>
            <div className="pipeline-control-grid">
              <article><span><Rss /></span><div><h3>Collect source items</h3><p>Check every active RSS feed and save anything the system has not seen before.</p></div><RunCollectionButton /></article>
              <article><span><BrainCircuit /></span><div><h3>Assess pending items</h3><p>Group related coverage, score the stories and add qualifying recommendations to Candidates.</p></div><RunAssessmentButton /></article>
            </div>
          </section>
        </details>

        <div className="pipeline-columns">
          <section className="pipeline-panel">
            <div className="overview-section-heading"><div><p className="eyebrow">Latest arrivals</p><h2>Recently collected</h2></div><a href="/admin/collected">Open inbox <ArrowRight /></a></div>
            {recentItems.length ? <div className="pipeline-recent-list">{recentItems.map((item) => <article key={item.id}><div><span>{sourceRelationName(item.sources)}</span><time dateTime={item.published_at ?? item.discovered_at}>{dateTime.format(new Date(item.published_at ?? item.discovered_at))}</time></div><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} <ExternalLink /></a><strong className={`assessment-status ${item.assessment_status}`}>{item.assessment_status}</strong></article>)}</div> : <div className="overview-calm-state"><Inbox /><p>No source items have been collected yet.</p></div>}
          </section>

          <section className="pipeline-panel">
            <div className="overview-section-heading"><div><p className="eyebrow">Editorial shortlist</p><h2>Top candidates</h2></div><a href="/admin/candidates">View candidates <ArrowRight /></a></div>
            {candidates.length ? <div className="pipeline-candidate-list">{candidates.map((candidate, index) => <a href={`/admin/candidates#candidate-${candidate.id}`} key={candidate.id}><span>{index + 1}</span><div><small>{candidate.assessment?.primary_topic ?? 'Conservation'}</small><strong>{candidate.working_title}</strong><p>Overall {candidate.overall_score ?? 0} · Evidence {candidate.evidence_score ?? 0}</p></div><ArrowRight /></a>)}</div> : <div className="overview-calm-state"><BrainCircuit /><p>No candidates are currently waiting.</p></div>}
          </section>
        </div>

        <section className="pipeline-runs">
          <div><Activity /><span><small>Latest collection</small><strong>{latestIngestion ? `${latestIngestion.items_new} new from ${latestIngestion.sources_checked} sources` : 'No runs yet'}</strong>{latestIngestion ? <time>{dateTime.format(new Date(latestIngestion.created_at))}</time> : null}</span></div>
          <div><BrainCircuit /><span><small>Latest editorial run</small><strong>{latestEditorial ? `${latestEditorial.drafts_created} drafts from ${latestEditorial.candidates_selected} candidates` : 'No runs yet'}</strong>{latestEditorial ? <time>{dateTime.format(new Date(latestEditorial.created_at))} · ${Number(latestEditorial.estimated_cost_usd ?? 0).toFixed(4)}</time> : null}</span></div>
        </section>
      </div>
    </main>
  );
}
