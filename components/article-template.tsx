import { ArrowRight, CircleHelp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CuratorByline } from '@/components/curator-byline';
import { TopicTag } from '@/components/topic-tag';
import type { EditorialImageCredit } from '@/lib/images/types';

export type ArticleCoverage = {
  ecological: number;
  evidence: number;
  consensus: number;
};

export type ArticleText = string | { text: string; sourceIds?: string[] };

type ArticleSource = { id?: string; name: string; title?: string; url: string; primary?: boolean };

export type ArticleTemplateData = {
  topics: string[];
  headline: string;
  storyAtAGlance: ArticleText[];
  imageUrl?: string;
  imageAlt?: string;
  imageCredit?: EditorialImageCredit | null;
  byline: string;
  updatedAt: string;
  keyTakeaways: ArticleText[];
  whyItMatters: ArticleText;
  whatHappensNext: ArticleText;
  whatWeKnow: ArticleText[];
  whatWeDontKnow: ArticleText[];
  sources: ArticleSource[];
  coverage: ArticleCoverage;
};

function CoverageHelp({ label, text }: { label: string; text: string }) {
  return <button className="analysis-help coverage-help" type="button" aria-label={`${label}: ${text}`}><CircleHelp aria-hidden="true" /><span className="analysis-tooltip" role="tooltip">{text}</span></button>;
}

function BinaryAnalysis({ title, firstLabel, firstValue, secondLabel, tooltip, tone }: { title: string; firstLabel: string; firstValue: number; secondLabel: string; tooltip: string; tone: string }) {
  const secondValue = 100 - firstValue;
  return <section className="coverage-dimension">
    <div className="coverage-dimension-heading"><h2>{title}</h2><CoverageHelp label={title} text={tooltip} /></div>
    <div className={`lean-bar coverage-signal-bar ${tone}`} aria-label={`${firstLabel} ${firstValue}%, ${secondLabel} ${secondValue}%`}><span style={{ width: `${firstValue}%` }} /><span style={{ width: `${secondValue}%` }} /></div>
    <div className="coverage-signal-labels"><span>{firstLabel} <strong>{firstValue}%</strong></span><span>{secondLabel} <strong>{secondValue}%</strong></span></div>
  </section>;
}

function CoverageSummaryBinary({ title, firstLabel, firstValue, secondLabel, tone }: { title: string; firstLabel: string; firstValue: number; secondLabel: string; tone: string }) {
  const secondValue = 100 - firstValue;
  return <section className="article-coverage-item">
    <div className="article-coverage-item-heading"><span>{title}</span><strong>{firstValue} / {secondValue}</strong></div>
    <div className={`lean-bar coverage-summary-bar ${tone}`} aria-label={`${firstLabel} ${firstValue}%, ${secondLabel} ${secondValue}%`}><span style={{ width: `${firstValue}%` }} /><span style={{ width: `${secondValue}%` }} /></div>
    <div className="coverage-summary-mini-labels"><span>{firstLabel}</span><span>{secondLabel}</span></div>
  </section>;
}

function formattedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(date);
}

function articleTextValue(value: ArticleText) {
  const text = typeof value === 'string' ? value : value.text;
  return text.replace(/\s*\[(?:\s*source-[1-9][0-9]*\s*,?)+\]/gi, '').trim();
}

function ArticleTextContent({ value, sources }: { value: ArticleText; sources: Map<string, ArticleSource> }) {
  const sourceIds = typeof value === 'string' ? [] : [...new Set(value.sourceIds ?? [])];
  return <>{articleTextValue(value)}{sourceIds.length ? <span className="article-source-refs" aria-label="Supporting sources">{sourceIds.map((id) => {
    const source = sources.get(id);
    return source ? <a href={source.url} target="_blank" rel="noreferrer" title={`${source.name}${source.title ? `: ${source.title}` : ''}`} aria-label={`Source ${id.replace('source-', '')}: ${source.name}`} key={id}>{id.replace('source-', '')}</a> : null;
  })}</span> : null}</>;
}

export function ArticleTemplate({ article }: { article: ArticleTemplateData }) {
  const { coverage } = article;
  const sourcesById = new Map(article.sources.flatMap((source) => source.id ? [[source.id, source] as const] : []));
  return <article className="article-template">
    <header className="article-hero shell">
      <div className="article-topics">{article.topics.map((topic) => <TopicTag topic={topic} key={topic} />)}</div>
      <h1>{article.headline}</h1>
      <div className="article-coverage-summary" aria-label="Coverage analysis summary">
        <div className="leaning-summary-heading"><span>Coverage mix</span><Link className="analysis-help" href="/how-leaning-works" aria-label="Learn how our coverage analysis works"><CircleHelp /><span className="analysis-tooltip" role="tooltip">A quick view of the ecological, evidence and consensus signals found across current coverage. Click to learn how it works.</span></Link></div>
        <div className="article-coverage-track">
          <CoverageSummaryBinary title="Ecological / Economic" firstLabel="Ecological" firstValue={coverage.ecological} secondLabel="Economic" tone="ecology-signal" />
          <CoverageSummaryBinary title="Evidence / Opinion" firstLabel="Evidence" firstValue={coverage.evidence} secondLabel="Opinion" tone="evidence-signal" />
          <CoverageSummaryBinary title="Consensus / Contested" firstLabel="Consensus" firstValue={coverage.consensus} secondLabel="Contested" tone="consensus-signal" />
        </div>
      </div>
    </header>
    <figure className={`article-lead-image${article.imageUrl ? '' : ' article-lead-placeholder'}`}>{article.imageUrl ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={article.imageUrl} alt={article.imageAlt ?? ''} />{article.imageCredit ? <figcaption>{article.imageCredit.illustrative ? <span>Illustrative image</span> : null}<span>Photo by {article.imageCredit.creator_url ? <a href={article.imageCredit.creator_url} target="_blank" rel="noreferrer">{article.imageCredit.creator_name}</a> : article.imageCredit.creator_name}{article.imageCredit.source_name ? <> on {article.imageCredit.source_url ? <a href={article.imageCredit.source_url} target="_blank" rel="noreferrer">{article.imageCredit.source_name}</a> : article.imageCredit.source_name}</> : null}</span>{article.imageCredit.licence_name ? article.imageCredit.licence_url ? <a href={article.imageCredit.licence_url} target="_blank" rel="noreferrer">{article.imageCredit.licence_name}</a> : <span>{article.imageCredit.licence_name}</span> : null}</figcaption> : null}</> : <span>Lead image to be selected</span>}</figure>
    <section className="article-overview shell">
      <div className="article-curator-meta"><CuratorByline name={article.byline} /><p className="story-update-note">Last updated {formattedDate(article.updatedAt)}. This story may be updated as it develops.</p></div>
      <h2>The story at a glance</h2>
      {article.storyAtAGlance.map((paragraph, index) => <p key={`overview-${index}`}><ArticleTextContent value={paragraph} sources={sourcesById} /></p>)}
    </section>
    <div className="article-layout shell">
      <div className="article-main">
        <section className="story-section"><p className="eyebrow">The story in brief</p><h2>What you need to know</h2><ul className="key-points">{article.keyTakeaways.map((point, index) => <li key={`takeaway-${index}`}><ArticleTextContent value={point} sources={sourcesById} /></li>)}</ul></section>
        <section className="story-section"><p className="eyebrow">Conservation context</p><h2>Why this matters</h2><p className="story-explainer"><ArticleTextContent value={article.whyItMatters} sources={sourcesById} /></p></section>
        {articleTextValue(article.whatHappensNext) ? <section className="story-section"><p className="eyebrow">The developing story</p><h2>What happens next</h2><p className="story-explainer"><ArticleTextContent value={article.whatHappensNext} sources={sourcesById} /></p></section> : null}
        <section className="story-section"><p className="eyebrow">Established evidence</p><h2>What we know</h2><ul className="evidence-points">{article.whatWeKnow.map((point, index) => <li key={`known-${index}`}><ArticleTextContent value={point} sources={sourcesById} /></li>)}</ul></section>
        <section className="story-section"><p className="eyebrow">Open questions</p><h2>What we don&apos;t know</h2><ul className="evidence-points">{article.whatWeDontKnow.map((point, index) => <li key={`unknown-${index}`}><ArticleTextContent value={point} sources={sourcesById} /></li>)}</ul></section>
        <section className="story-section" id="sources"><p className="eyebrow">Source coverage</p><h2>Read the reporting</h2><div className="source-list">{article.sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`} title={source.title}><span>{source.primary ? 'Primary story' : 'Also covering'}</span><strong>{source.name}</strong><ExternalLink /></a>)}</div></section>
      </div>
      <aside className="coverage-card">
        <p className="eyebrow">Coverage analysis</p>
        <BinaryAnalysis title="Ecological / Economic" firstLabel="Ecological" firstValue={coverage.ecological} secondLabel="Economic" tone="ecology-signal" tooltip="Shows whether coverage primarily frames the story around environmental outcomes or economic impacts such as costs, jobs, industry and development." />
        <BinaryAnalysis title="Evidence-led / Opinion-led" firstLabel="Evidence-led" firstValue={coverage.evidence} secondLabel="Opinion-led" tone="evidence-signal" tooltip="Shows how strongly the coverage relies on research, data and attributable evidence versus commentary, interpretation or argument." />
        <BinaryAnalysis title="Consensus / Contested" firstLabel="Consensus" firstValue={coverage.consensus} secondLabel="Contested" tone="consensus-signal" tooltip="Shows how much agreement exists across the sources and viewpoints represented in current coverage. This refers to coverage consensus, not scientific consensus." />
        <small>Coverage analysis reflects the sources, framing and viewpoints currently represented in this story. These signals are not judgements of factual accuracy and may change as new reporting and sources are added.</small>
        <Link className="analysis-link" href="/how-leaning-works">How our coverage analysis works <ArrowRight /></Link>
      </aside>
    </div>
  </article>;
}
