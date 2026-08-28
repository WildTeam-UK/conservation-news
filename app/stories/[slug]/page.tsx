import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, ExternalLink, Leaf } from 'lucide-react';
import { getStory, stories, topicSlug } from '@/lib/stories';

export function generateStaticParams() { return stories.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const story = getStory((await params).slug);
  if (!story) return { title: 'Story not found — WildNews' };
  return { title: `${story.title} — WildNews`, description: story.summary, openGraph:{ title:story.title, description:story.summary, images:[{url:story.image}] }, twitter:{card:'summary_large_image',title:story.title,description:story.summary,images:[story.image]} };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story) return <main className="missing shell"><h1>Story not found</h1><a href="/">Back to WildNews</a></main>;
  const related = stories.filter((item) => item.slug !== story.slug && item.topics.some((topic) => story.topics.includes(topic))).slice(0,3);
  if (related.length < 3) related.push(...stories.filter((item) => item.slug !== story.slug && !related.includes(item)).slice(0,3-related.length));
  const [left, centre, right] = story.balance;
  return <main>
    <header className="article-header shell">
      <a href="/" className="brand"><span className="brand-mark"><Leaf /></span><span>WildNews</span></a>
      <a href="/" className="back-link"><ArrowLeft /> All stories</a>
      <a href="#sources" className="donate-button">View sources <ArrowRight /></a>
    </header>
    <article>
      <header className="article-hero shell">
        <div className="article-topics">{story.topics.map((topic) => <a href={`/topics/${topicSlug(topic)}`} key={topic}>{topic}</a>)}</div>
        <h1>{story.title}</h1>
        <p className="article-deck">{story.summary}</p>
        <div className="article-leaning-summary" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}>
          <div className="lean-bar"><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
          <div className="lean-labels"><span>Left</span><span>Centre</span><span>Right</span></div>
        </div>
        <p className="byline">Curated by {story.byline} <span>·</span> Updated today</p>
      </header>
      <div className="article-lead-image"><img src={story.image} alt="" /></div>
      <div className="article-layout shell">
        <div className="article-main">
          <section className="story-section"><p className="eyebrow">The story in brief</p><h2>What you need to know</h2><ul className="key-points">{story.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></section>
          <section className="story-section" id="sources"><p className="eyebrow">Source coverage</p><h2>Read the reporting</h2><div className="source-list">{story.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.name}><span>{source.primary ? 'Primary story' : 'Also covering'}</span><strong>{source.name}</strong><ExternalLink /></a>)}</div></section>
        </div>
        <aside className="coverage-card">
          <p className="eyebrow">Coverage analysis</p><h2>{story.leaning} leaning</h2><p>Based on the mix of outlets currently covering this story.</p>
          <div className="lean-bar" aria-label={`Coverage: ${left}% left, ${centre}% centre, ${right}% right`}><span style={{width:`${left}%`}}/><span style={{width:`${centre}%`}}/><span style={{width:`${right}%`}}/></div>
          <div className="lean-labels"><span>Left {left}%</span><span>Centre {centre}%</span><span>Right {right}%</span></div>
          <small>This is an editorial signal, not a judgement of factual accuracy. It reflects outlet orientation and framing, and may change as coverage develops.</small>
          <a className="analysis-link" href="/how-leaning-works">How our leaning analysis works <ArrowRight /></a>
        </aside>
      </div>
    </article>
    <section className="related shell"><div className="section-heading"><h2>Similar stories</h2><p>Keep exploring this topic.</p></div><div className="related-grid">{related.map((item)=><article key={item.slug}><a href={`/stories/${item.slug}`} className="related-image"><img src={item.image} alt="" /></a><p className="eyebrow">{item.topic}</p><h3><a href={`/stories/${item.slug}`}>{item.title}</a></h3></article>)}</div></section>
    <footer><div className="shell footer-inner"><a href="/" className="brand"><span className="brand-mark"><Leaf /></span><span>WildNews</span></a><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
