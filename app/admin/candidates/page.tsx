import type { Metadata } from 'next';
import { BrainCircuit, ExternalLink, Newspaper, ShieldCheck } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Candidates | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

type Candidate = {
  id: string;
  working_title: string;
  relevance_score: number | null;
  evidence_score: number | null;
  practitioner_value_score: number | null;
  novelty_score: number | null;
  overall_score: number | null;
  selection_rank: number | null;
  assessment: { primary_topic?: string; rationale?: string } | null;
  created_at: string;
};

type CandidateSource = {
  id: string;
  title: string;
  url: string;
  sources: { name: string } | { name: string }[] | null;
};

function sourceName(source: CandidateSource['sources']) {
  if (Array.isArray(source)) return source[0]?.name ?? 'Unknown source';
  return source?.name ?? 'Unknown source';
}

export default async function CandidatesPage() {
  const { supabase, admin } = await requireContentAdmin();
  const [candidatesResult, rejectedResult] = await Promise.all([
    supabase
      .from('story_clusters')
      .select('id, working_title, relevance_score, evidence_score, practitioner_value_score, novelty_score, overall_score, selection_rank, assessment, created_at')
      .eq('status', 'selected')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('story_clusters').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  if (candidatesResult.error) throw new Error('Unable to load assessed candidates.');

  const candidates = ((candidatesResult.data ?? []) as Candidate[]).sort(
    (a, b) => (a.selection_rank ?? 999) - (b.selection_rank ?? 999),
  );
  const candidateIds = candidates.map((candidate) => candidate.id);
  const sourceMap = new Map<string, CandidateSource[]>();

  if (candidateIds.length) {
    const { data: links, error: linkError } = await supabase
      .from('story_cluster_items')
      .select('cluster_id, source_item_id')
      .in('cluster_id', candidateIds);
    if (linkError) throw new Error('Unable to load candidate sources.');

    const sourceItemIds = [...new Set((links ?? []).map((link) => link.source_item_id))];
    if (sourceItemIds.length) {
      const { data: sourceItems, error: sourceError } = await supabase
        .from('source_items')
        .select('id, title, url, sources(name)')
        .in('id', sourceItemIds);
      if (sourceError) throw new Error('Unable to load candidate sources.');

      const itemsById = new Map(((sourceItems ?? []) as CandidateSource[]).map((item) => [item.id, item]));
      for (const link of links ?? []) {
        const item = itemsById.get(link.source_item_id);
        if (item) sourceMap.set(link.cluster_id, [...(sourceMap.get(link.cluster_id) ?? []), item]);
      }
    }
  }

  const name = admin.display_name || admin.email;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="admin-account"><span>{name}</span><AdminSignOutButton /></div>
      </header>
      <AdminNav active="candidates" />

      <div className="admin-shell admin-candidates-shell">
        <section className="admin-welcome candidates-heading" aria-labelledby="candidates-heading">
          <div><p className="eyebrow">AI story assessment</p><h1 id="candidates-heading">Candidates</h1><p>The strongest stories from the collected inbox, ranked for editorial review. Nothing on this page is published.</p></div>
          <div className="candidate-summary"><BrainCircuit /><strong>{candidates.length}</strong><span>recommended</span></div>
        </section>

        {candidates.length === 0 ? (
          <section className="source-empty candidate-empty"><BrainCircuit /><h2>No recommendations yet</h2><p>Go to Collected and assess the new items to create today&apos;s shortlist.</p></section>
        ) : (
          <section className="candidate-list" aria-label="Recommended story candidates">
            {candidates.map((candidate, index) => {
              const assessment = candidate.assessment ?? {};
              const sources = sourceMap.get(candidate.id) ?? [];
              return (
                <article className="candidate-card" key={candidate.id}>
                  <div className="candidate-rank"><span>Rank</span><strong>{candidate.selection_rank ?? index + 1}</strong></div>
                  <div className="candidate-main">
                    <div className="candidate-labels"><span>{assessment.primary_topic ?? 'Conservation'}</span><span><ShieldCheck /> AI recommendation</span></div>
                    <h2>{candidate.working_title}</h2>
                    {assessment.rationale ? <p>{assessment.rationale}</p> : null}
                    <div className="candidate-sources">
                      <h3><Newspaper /> Source {sources.length === 1 ? 'story' : 'stories'}</h3>
                      {sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{sourceName(source.sources)}</span>{source.title}<ExternalLink /></a>)}
                    </div>
                  </div>
                  <dl className="candidate-scores">
                    <div className="candidate-overall"><dt>Overall</dt><dd>{candidate.overall_score ?? 0}</dd></div>
                    <div><dt>Relevance</dt><dd>{candidate.relevance_score ?? 0}</dd></div>
                    <div><dt>Evidence</dt><dd>{candidate.evidence_score ?? 0}</dd></div>
                    <div><dt>Practitioner value</dt><dd>{candidate.practitioner_value_score ?? 0}</dd></div>
                    <div><dt>Novelty</dt><dd>{candidate.novelty_score ?? 0}</dd></div>
                  </dl>
                </article>
              );
            })}
          </section>
        )}

        <p className="candidate-rejected-note">{rejectedResult.count ?? 0} assessed {rejectedResult.count === 1 ? 'story was' : 'stories were'} not selected. They remain recorded for audit and can be reviewed later.</p>
      </div>
    </main>
  );
}
