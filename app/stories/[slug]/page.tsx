import type { Metadata } from 'next';
import { ArrowRight, CircleHelp, ExternalLink } from 'lucide-react';
import { CuratorByline } from '@/components/curator-byline';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { cleanCopy, expandedBullet, getCoverageAnalysis, getStory, getStoryInsights, stories, storyImage, storyOverview } from '@/lib/stories';

function CoverageHelp({ label, text }: { label: string; text: string }) {
  return <span className="analysis-help coverage-help" tabIndex={0} aria-label={`${label}: ${text}`}><CircleHelp aria-hidden="true" /><span className="analysis-tooltip" role="tooltip">{text}</span></span>;
}

function BinaryAnalysis({ title, firstLabel, firstValue, secondLabel, tooltip, tone }: { title: string; firstLabel: string; firstValue: number; secondLabel: string; tooltip: string; tone: string }) {
  const secondValue = 100 - firstValue;
  return <section className="coverage-dimension">
    <div className="coverage-dimension-heading"><h2>{title}</h2><CoverageHelp label={title} text={tooltip} /></div>
    <div className={`lean-bar coverage-signal-bar ${tone}`} aria-label={`${firstLabel} ${firstValue}%, ${secondLabel} ${secondValue}%`}><span style={{width:`${firstValue}%`}}/><span style={{width:`${secondValue}%`}}/></div>
    <div className="coverage-signal-labels"><span>{firstLabel} <strong>{firstValue}%</strong></span><span>{secondLabel} <strong>{secondValue}%</strong></span></div>
  </section>;
}

function CoverageSummaryBinary({ title, firstLabel, firstValue, secondLabel, tone }: { title: string; firstLabel: string; firstValue: number; secondLabel: string; tone: string }) {
  const secondValue = 100 - firstValue;
  return <section className="article-coverage-item">
    <div className="article-coverage-item-heading"><span>{title}</span><strong>{firstValue} / {secondValue}</strong></div>
    <div className={`lean-bar coverage-summary-bar ${tone}`} aria-label={`${firstLabel} ${firstValue}%, ${secondLabel} ${secondValue}%`}><span style={{width:`${firstValue}%`}}/><span style={{width:`${secondValue}%`}}/></div>
    <div className="coverage-summary-mini-labels"><span>{firstLabel}</span><span>{secondLabel}</span></div>
  </section>;
}

export function generateStaticParams() { return stories.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const story = getStory((await params).slug);
  if (!story) return { title: 'Story not found | WILDNEWS' };
  const title = cleanCopy(story.title);
  const description = cleanCopy(story.summary);
  const image = storyImage(story);
  return { title: `${title} | WILDNEWS`, description, openGraph:{ title, description, images:[{url:image}] }, twitter:{card:'summary_large_image',title,description,images:[image]} };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story) return <main className="missing shell"><h1>Story not found</h1><a href="/">Back to WildNews</a></main>;
  const related = stories.filter((item) => item.slug !== story.slug && item.topics.some((topic) => story.topics.includes(topic))).slice(0,6);
  if (related.length < 6) related.push(...stories.filter((item) => item.slug !== story.slug && !related.includes(item)).slice(0,6-related.length));
  const [left, centre, right] = story.balance;
  const coverage = getCoverageAnalysis(story);
  const insights = getStoryInsights(story);
  return <main>
    <InteriorHeader actionHref="#sources" actionLabel="View sources" />
    <article>
      <header className="article-hero shell">
        <div className="article-topics">{story.topics.map((topic) => <TopicTag topic={topic} key={topic} />)}</div>
        <h1>{cleanCopy(story.title)}</h1>
        <div className="article-coverage-summary" aria-label="Coverage analysis summary">
          <div className="leaning-summary-heading"><span>Coverage mix</span><a className="analysis-help" href="/how-leaning-works" aria-label="Learn how our coverage analysis works"><CircleHelp /><span className="analysis-tooltip" role="tooltip">A quick view of the ecological, evidence, consensus and political signals found across current coverage. Click to learn how it works.</span></a></div>
          <div className="article-coverage-track">
            <CoverageSummaryBinary title="Ecological / Economic" firstLabel="Ecological" firstValue={coverage.ecological} secondLabel="Economic" tone="ecology-signal" />
            <CoverageSummaryBinary title="Evidence / Opinion" firstLabel="Evidence" firstValue={coverage.evidence} secondLabel="Opinion" tone="evidence-signal" />
            <CoverageSummaryBinary title="Consensus / Contested" firstLabel="Consensus" firstValue={coverage.consensus} secondLabel="Contested" tone="consensus-signal" />
            <section className="article-coverage-item political-summary-item">
              <div className="article-coverage-item-heading"><span>Political leaning</span><strong>{story.leaning}</strong></div>
              <div className="lean-bar coverage-summary-bar" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
              <div className="coverage-summary-mini-labels"><span>L {left}</span><span>C {centre}</span><span>R {right}</span></div>
            </section>
          </div>
        </div>
      </header>
      <div className="article-lead-image"><img src={storyImage(story)} alt="" /></div>
      <section className="article-overview shell"><div className="article-curator-meta"><CuratorByline name={story.byline} /><p className="story-update-note">Last updated 28 August 2026. This story may be updated as it develops.</p></div><h2>The story at a glance</h2>{storyOverview(story).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      <div className="article-layout shell">
        <div className="article-main">
          <section className="story-section"><p className="eyebrow">The story in brief</p><h2>What you need to know</h2><ul className="key-points">{story.bullets.map((bullet, index) => <li key={bullet}>{expandedBullet(story, bullet, index)}</li>)}</ul></section>
          <section className="story-section"><p className="eyebrow">Conservation context</p><h2>Why this matters</h2><p className="story-explainer">{insights.whyItMatters}</p></section>
          {insights.nextSteps.length ? <section className="story-section"><p className="eyebrow">The developing story</p><h2>What happens next</h2><ul className="compact-points">{insights.nextSteps.map((point) => <li key={point}>{point}</li>)}</ul></section> : null}
          <section className="story-section"><p className="eyebrow">Evidence and uncertainty</p><h2>What we know / What we don&apos;t know</h2><div className="knowledge-grid"><div className="knowledge-card"><h3>What we know</h3><ul>{insights.known.map((point) => <li key={point}>{point}</li>)}</ul></div><div className="knowledge-card"><h3>What we don&apos;t know</h3><ul>{insights.unknown.map((point) => <li key={point}>{point}</li>)}</ul></div></div></section>
          <section className="story-section" id="sources"><p className="eyebrow">Source coverage</p><h2>Read the reporting</h2><div className="source-list">{story.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>{source.primary ? 'Primary story' : 'Also covering'}</span><strong>{cleanCopy(source.name)}</strong><ExternalLink /></a>)}</div></section>
        </div>
        <aside className="coverage-card">
          <p className="eyebrow">Coverage analysis</p>
          <BinaryAnalysis title="Ecological / Economic" firstLabel="Ecological" firstValue={coverage.ecological} secondLabel="Economic" tone="ecology-signal" tooltip="Shows whether coverage primarily frames the story around environmental outcomes or economic impacts such as costs, jobs, industry and development." />
          <BinaryAnalysis title="Evidence-led / Opinion-led" firstLabel="Evidence-led" firstValue={coverage.evidence} secondLabel="Opinion-led" tone="evidence-signal" tooltip="Shows how strongly the coverage relies on research, data and attributable evidence versus commentary, interpretation or argument." />
          <BinaryAnalysis title="Consensus / Contested" firstLabel="Consensus" firstValue={coverage.consensus} secondLabel="Contested" tone="consensus-signal" tooltip="Shows how much agreement exists across the sources and viewpoints represented in current coverage. This refers to coverage consensus, not scientific consensus." />
          <section className="coverage-dimension political-dimension">
            <p className="coverage-dimension-kicker">Political leaning</p>
            <div className="coverage-title-row"><h2>{story.leaning} leaning</h2></div><p>Based on the mix of outlets currently covering this story.</p>
            <div className="lean-bar" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
            <div className="lean-labels"><span>Left {left}%</span><span>Centre {centre}%</span><span>Right {right}%</span></div>
          </section>
          <small>Coverage analysis reflects the sources, framing and viewpoints currently represented in this story. These signals are not judgements of factual accuracy and may change as new reporting and sources are added.</small>
          <a className="analysis-link" href="/how-leaning-works">How our coverage analysis works <ArrowRight /></a>
        </aside>
      </div>
    </article>
    <section className="related shell"><div className="section-heading"><h2>Similar stories</h2><p>Keep exploring this topic.</p></div><div className="related-grid">{related.map((item)=><article key={item.slug}><a href={`/stories/${item.slug}`} className="related-image"><img src={storyImage(item)} alt="" /></a><TopicTag topic={item.topic} /><h3><a href={`/stories/${item.slug}`}>{cleanCopy(item.title)}</a></h3></article>)}</div></section>
    <SiteFooter />
  </main>;
}
