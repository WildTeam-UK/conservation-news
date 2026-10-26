import type { Metadata } from 'next';
import { BrainCircuit, ClockAlert, ExternalLink, FileSearch, Newspaper, ShieldCheck } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { GenerateDraftButton } from '@/components/generate-draft-button';
import { ResearchCandidateButton } from '@/components/research-candidate-button';
import type { ResearchClaim, ResearchContent } from '@/lib/openai/research-story';
import { requireContentAdmin } from '@/lib/supabase/require-admin';
import { sourceRelationName } from '@/lib/supabase/relations';
import { londonMediumDateFormatter } from '@/lib/date-format';
import { candidateRankingSettings, compareRankedCandidates, rankCandidate, type CandidateRanking } from '@/lib/candidate-ranking';

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
  last_source_at: string | null;
};

type RankedCandidate = Candidate & { ranking: CandidateRanking };

const candidateSorts = {
  score: 'Highest current priority',
  assessment: 'Highest assessment score',
  newest: 'Newest first',
  oldest: 'Oldest first',
  relevance: 'Highest relevance',
  evidence: 'Strongest evidence',
  practitioner: 'Highest practitioner value',
  novelty: 'Highest novelty',
} as const;

type CandidateSort = keyof typeof candidateSorts;

type CandidatesPageProps = {
  searchParams?: Promise<{ sort?: string }>;
};

type CandidateSource = {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  discovered_at: string;
  sources: { name: string } | { name: string }[] | null;
};

type ResearchPack = {
  cluster_id: string;
  status: 'researching' | 'completed' | 'failed';
  content: ResearchContent | null;
  estimated_cost_usd: number | string | null;
  web_search_actions: number;
  error_message: string | null;
};

function ResearchClaims({ claims, sourceNumbers }: { claims: ResearchClaim[]; sourceNumbers: Map<string, number> }) {
  if (!claims.length) return <p className="research-none">Nothing material was identified.</p>;
  return <ul>{claims.map((item) => <li key={item.claim}><span>{item.claim}</span><small>{item.source_urls.map((url) => {
    const number = sourceNumbers.get(url);
    return number ? <a href={url} target="_blank" rel="noopener noreferrer" key={url}>Source {number}</a> : null;
  })}</small></li>)}</ul>;
}

function ResearchPackView({ pack }: { pack: ResearchPack }) {
  if (pack.status !== 'completed' || !pack.content) return null;
  const content = pack.content;
  const sourceNumbers = new Map(content.sources.map((source, index) => [source.url, index + 1]));
  const coverage = content.coverage_analysis;

  return <section className="research-pack" aria-label="Completed research pack">
    <div className="research-pack-heading"><div><p className="eyebrow">Completed research pack</p><h3>Evidence gathered before drafting</h3></div><span><FileSearch /> {content.sources.length} sources</span></div>
    <p className="research-summary">{content.summary}</p>
    <div className="research-topics"><strong>{content.topic_classification.primary_topic}</strong>{content.topic_classification.secondary_topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
    {content.tags?.length ? <section className="research-tags"><h4>Suggested discovery tags</h4><div>{content.tags.map((tag) => <span key={`${tag.tag_type}-${tag.name}`} title={tag.rationale}><small>{tag.tag_type}</small>{tag.name}<em>{tag.confidence}%</em></span>)}</div><p>New tags grow privately and become public SEO archives automatically once they reach the published-article threshold.</p></section> : null}
    <div className="research-columns">
      <section><h4>Key facts</h4><ResearchClaims claims={content.key_facts} sourceNumbers={sourceNumbers} /></section>
      <section><h4>Areas of agreement</h4><ResearchClaims claims={content.areas_of_agreement} sourceNumbers={sourceNumbers} /></section>
      <section><h4>Disputed or uncertain</h4><ResearchClaims claims={content.disputed_points} sourceNumbers={sourceNumbers} /></section>
      <section><h4>Open questions</h4>{content.open_questions.length ? <ul>{content.open_questions.map((question) => <li key={question}>{question}</li>)}</ul> : <p className="research-none">No material open questions were identified.</p>}</section>
    </div>
    <section className="research-coverage"><div><h4>Coverage analysis</h4><p>{coverage.explanation}</p>{coverage.conservation_outlook_rationale ? <p>{coverage.conservation_outlook_rationale}</p> : null}</div><dl><div><dt>Ecological framing</dt><dd>{coverage.ecological}</dd></div><div><dt>Evidence-led</dt><dd>{coverage.evidence}</dd></div><div><dt>Source agreement</dt><dd>{coverage.consensus}</dd></div><div><dt>Conservation outlook</dt><dd>{coverage.conservation_outlook}{Number.isFinite(coverage.conservation_outlook_score) ? ` · ${coverage.conservation_outlook_score}/100` : ''}{Number.isFinite(coverage.conservation_outlook_confidence) ? ` · ${coverage.conservation_outlook_confidence}% confidence` : ''}</dd></div></dl></section>
    <section className="research-source-list"><h4>Sources consulted</h4>{content.sources.map((source, index) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}><span>{index + 1}</span><div><strong>{source.title}</strong><small>{source.publisher} · {source.source_type} · {source.why_relevant}</small></div><ExternalLink /></a>)}</section>
    <p className="research-cost-note">Estimated model-token cost ${Number(pack.estimated_cost_usd ?? 0).toFixed(4)}, plus {pack.web_search_actions} web search {pack.web_search_actions === 1 ? 'action' : 'actions'}.</p>
  </section>;
}

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const { supabase } = await requireContentAdmin();
  const params = searchParams ? await searchParams : undefined;
  const requestedSort = params?.sort;
  const sort: CandidateSort = requestedSort && requestedSort in candidateSorts
    ? requestedSort as CandidateSort
    : 'score';
  const [candidatesResult, rejectedResult, settingsResult] = await Promise.all([
    supabase
      .from('story_clusters')
      .select('id, working_title, relevance_score, evidence_score, practitioner_value_score, novelty_score, overall_score, selection_rank, assessment, created_at, last_source_at')
      .eq('status', 'selected')
      .order('created_at', { ascending: false }),
    supabase.from('story_clusters').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('editorial_run_settings').select('candidate_freshness_days, candidate_freshness_decay_per_day, candidate_wildlife_bonus').eq('id', true).single(),
  ]);

  if (candidatesResult.error) throw new Error('Unable to load assessed candidates.');
  if (settingsResult.error) throw new Error('Unable to load candidate ranking settings.');

  const rankingSettings = candidateRankingSettings(settingsResult.data);
  const rankedCandidates: RankedCandidate[] = ((candidatesResult.data ?? []) as Candidate[]).map((candidate) => ({ ...candidate, ranking: rankCandidate(candidate, rankingSettings) }));
  const staleCandidates = rankedCandidates.filter((candidate) => !candidate.ranking.isFresh);
  const candidates = rankedCandidates.filter((candidate) => candidate.ranking.isFresh).sort((a, b) => {
    if (sort === 'score') return compareRankedCandidates(a, b);
    if (sort === 'newest') return b.ranking.latestSourceAt - a.ranking.latestSourceAt;
    if (sort === 'oldest') return a.ranking.latestSourceAt - b.ranking.latestSourceAt;

    const scoreKey: keyof Candidate = sort === 'assessment'
      ? 'overall_score'
      : sort === 'relevance'
      ? 'relevance_score'
      : sort === 'evidence'
        ? 'evidence_score'
        : sort === 'practitioner'
          ? 'practitioner_value_score'
          : sort === 'novelty'
            ? 'novelty_score'
            : 'overall_score';
    const scoreDifference = Number(b[scoreKey] ?? 0) - Number(a[scoreKey] ?? 0);
    return scoreDifference || b.ranking.latestSourceAt - a.ranking.latestSourceAt;
  });
  const candidateIds = candidates.map((candidate) => candidate.id);
  const sourceMap = new Map<string, CandidateSource[]>();
  const researchMap = new Map<string, ResearchPack>();
  const draftMap = new Map<string, string>();

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
        .select('id, title, url, published_at, discovered_at, sources(name)')
        .in('id', sourceItemIds);
      if (sourceError) throw new Error('Unable to load candidate sources.');

      const itemsById = new Map(((sourceItems ?? []) as CandidateSource[]).map((item) => [item.id, item]));
      for (const link of links ?? []) {
        const item = itemsById.get(link.source_item_id);
        if (item) sourceMap.set(link.cluster_id, [...(sourceMap.get(link.cluster_id) ?? []), item]);
      }
    }

    const { data: researchPacks, error: researchError } = await supabase
      .from('research_packs')
      .select('cluster_id, status, content, estimated_cost_usd, web_search_actions, error_message')
      .in('cluster_id', candidateIds);
    if (researchError) throw new Error('Unable to load candidate research.');
    for (const pack of (researchPacks ?? []) as ResearchPack[]) researchMap.set(pack.cluster_id, pack);

    const { data: drafts, error: draftsError } = await supabase.from('stories').select('id, cluster_id').in('cluster_id', candidateIds);
    if (draftsError) throw new Error('Unable to load candidate drafts.');
    for (const draft of drafts ?? []) if (draft.cluster_id) draftMap.set(draft.cluster_id, draft.id);
  }


  return (
    <main className="admin-page">
      <AdminHeader />
      <AdminNav active="pipeline" subview="candidates" />

      <div className="admin-shell admin-candidates-shell">
        <section className="admin-welcome candidates-heading" aria-labelledby="candidates-heading">
          <div><p className="eyebrow">AI story assessment</p><h1 id="candidates-heading">Candidates</h1><p>The strongest stories from the collected inbox, ranked for editorial review. Nothing on this page is published.</p></div>
          <div className="candidate-summary"><BrainCircuit /><strong>{candidates.length}</strong><span>active candidates</span></div>
        </section>

        {candidates.length ? <form className="candidate-toolbar" method="get">
          <label htmlFor="candidate-sort">Sort candidates</label>
          <select id="candidate-sort" name="sort" defaultValue={sort}>
            {Object.entries(candidateSorts).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <button type="submit">Apply</button>
        </form> : null}

        {candidates.length === 0 ? (
          <section className="source-empty candidate-empty"><BrainCircuit /><h2>No recommendations yet</h2><p>Go to Collected and assess the new items to create today&apos;s shortlist.</p></section>
        ) : (
          <section className="candidate-list" aria-label="Recommended story candidates">
            {candidates.map((candidate, index) => {
              const assessment = candidate.assessment ?? {};
              const sources = sourceMap.get(candidate.id) ?? [];
              const research = researchMap.get(candidate.id);
              const draftId = draftMap.get(candidate.id);
              return (
                <article className="candidate-card" id={`candidate-${candidate.id}`} key={candidate.id}>
                  <div className="candidate-rank"><span>Position</span><strong>{index + 1}</strong></div>
                  <div className="candidate-main">
                    <div className="candidate-labels"><span>{assessment.primary_topic ?? 'Conservation'}</span><span><ShieldCheck /> AI recommendation</span><span className="candidate-freshness-label"><ClockAlert /> Latest source {londonMediumDateFormatter.format(new Date(candidate.ranking.latestSourceAt))} · {candidate.ranking.completeAgeDays ? `${candidate.ranking.completeAgeDays} complete ${candidate.ranking.completeAgeDays === 1 ? 'day' : 'days'} old` : 'less than a day old'}</span></div>
                    <h2>{candidate.working_title}</h2>
                    {assessment.rationale ? <p>{assessment.rationale}</p> : null}
                    <div className="candidate-sources">
                      <h3><Newspaper /> Source {sources.length === 1 ? 'story' : 'stories'}</h3>
                      {sources.map((source) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.id}><span>{sourceRelationName(source.sources)}</span>{source.title}<ExternalLink /></a>)}
                    </div>
                    {research?.status === 'completed' ? <><p className="research-complete-label"><ShieldCheck /> Research complete</p>{draftId ? <a className="candidate-edit-draft" href={`/admin/drafts/${draftId}`}>Edit draft</a> : <GenerateDraftButton clusterId={candidate.id} />}</> : research?.status === 'researching' ? <p className="research-progress-label">Research is in progress. Refresh shortly.</p> : <ResearchCandidateButton clusterId={candidate.id} retry={research?.status === 'failed'} />}
                    {research?.status === 'failed' && research.error_message ? <p className="research-error-detail">The previous attempt failed and can be retried.</p> : null}
                  </div>
                  <dl className="candidate-scores">
                    <div className="candidate-overall"><dt>Current priority</dt><dd>{candidate.ranking.effectiveScore}</dd></div>
                    <div><dt>Assessment</dt><dd>{candidate.overall_score ?? 0}</dd></div>
                    <div><dt>Relevance</dt><dd>{candidate.relevance_score ?? 0}</dd></div>
                    <div><dt>Evidence</dt><dd>{candidate.evidence_score ?? 0}</dd></div>
                    <div><dt>Practitioner value</dt><dd>{candidate.practitioner_value_score ?? 0}</dd></div>
                    <div><dt>Novelty</dt><dd>{candidate.novelty_score ?? 0}</dd></div>
                  </dl>
                  {research ? <ResearchPackView pack={research} /> : null}
                </article>
              );
            })}
          </section>
        )}

        <p className="candidate-rejected-note">Scores lose {rankingSettings.freshnessDecayPerDay} points per complete day. Wildlife candidates receive a {rankingSettings.wildlifeBonus}-point relevance bonus. {staleCandidates.length} {staleCandidates.length === 1 ? 'candidate is' : 'candidates are'} older than {rankingSettings.freshnessDays} days and hidden from this active workspace. {rejectedResult.count ?? 0} assessed {rejectedResult.count === 1 ? 'story was' : 'stories were'} not selected. All remain recorded for audit.</p>
      </div>
    </main>
  );
}
