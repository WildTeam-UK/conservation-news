import type { Metadata } from 'next';
import { ArrowRight, CircleHelp, ExternalLink } from 'lucide-react';
import { Brand } from '@/components/brand';
import { CuratorByline } from '@/components/curator-byline';
import { InteriorHeader } from '@/components/interior-header';
import { TopicTag } from '@/components/topic-tag';
import { cleanCopy, expandedBullet, getStory, stories, storyImage, storyOverview } from '@/lib/stories';

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
  const related = stories.filter((item) => item.slug !== story.slug && item.topics.some((topic) => story.topics.includes(topic))).slice(0,3);
  if (related.length < 3) related.push(...stories.filter((item) => item.slug !== story.slug && !related.includes(item)).slice(0,3-related.length));
  const [left, centre, right] = story.balance;
  return <main>
    <InteriorHeader actionHref="#sources" actionLabel="View sources" />
    <article>
      <header className="article-hero shell">
        <div className="article-topics">{story.topics.map((topic) => <TopicTag topic={topic} key={topic} />)}</div>
        <h1>{cleanCopy(story.title)}</h1>
        <div className="article-leaning-summary" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}>
          <div className="leaning-summary-heading"><span>{story.leaning} coverage mix</span><a className="analysis-help" href="/how-leaning-works" aria-label="Learn how our leaning analysis works"><CircleHelp /><span className="analysis-tooltip" role="tooltip">This shows the political mix of outlets covering the story, not whether the reporting is accurate. Click to learn how it works.</span></a></div>
          <div className="lean-bar"><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
          <div className="lean-labels"><span>Left</span><span>Centre</span><span>Right</span></div>
        </div>
      </header>
      <div className="article-lead-image"><img src={storyImage(story)} alt="" /></div>
      <section className="article-overview shell"><CuratorByline name={story.byline} /><h2>The story at a glance</h2>{storyOverview(story).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      <div className="article-layout shell">
        <div className="article-main">
          <section className="story-section"><p className="eyebrow">The story in brief</p><h2>What you need to know</h2><ul className="key-points">{story.bullets.map((bullet, index) => <li key={bullet}>{expandedBullet(story, bullet, index)}</li>)}</ul></section>
          <section className="story-section" id="sources"><p className="eyebrow">Source coverage</p><h2>Read the reporting</h2><div className="source-list">{story.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>{source.primary ? 'Primary story' : 'Also covering'}</span><strong>{cleanCopy(source.name)}</strong><ExternalLink /></a>)}</div></section>
        </div>
        <aside className="coverage-card">
          <p className="eyebrow">Coverage analysis</p><div className="coverage-title-row"><h2>{story.leaning} leaning</h2></div><p>Based on the mix of outlets currently covering this story.</p>
          <div className="lean-bar" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
          <div className="lean-labels"><span>Left {left}%</span><span>Centre {centre}%</span><span>Right {right}%</span></div>
          <small>This is an editorial signal, not a judgement of factual accuracy. It reflects outlet orientation and framing, and may change as coverage develops.</small>
          <a className="analysis-link" href="/how-leaning-works">How our leaning analysis works <ArrowRight /></a>
        </aside>
      </div>
    </article>
    <section className="related shell"><div className="section-heading"><h2>Similar stories</h2><p>Keep exploring this topic.</p></div><div className="related-grid">{related.map((item)=><article key={item.slug}><a href={`/stories/${item.slug}`} className="related-image"><img src={storyImage(item)} alt="" /></a><TopicTag topic={item.topic} /><h3><a href={`/stories/${item.slug}`}>{cleanCopy(item.title)}</a></h3></article>)}</div></section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
