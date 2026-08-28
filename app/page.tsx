import { ArrowRight, Bird, Fish, Leaf, Mountain, Sprout, Waves } from 'lucide-react';
import { stories } from '@/lib/stories';

const topics = [
  { label: 'Wildlife', icon: Bird }, { label: 'Oceans', icon: Waves },
  { label: 'Forests', icon: Sprout }, { label: 'Freshwater', icon: Fish },
  { label: 'Land & climate', icon: Mountain },
];

export function Brand() {
  return <a href="/" className="brand" aria-label="WildNews home"><span className="brand-mark"><Leaf /></span><span>WildNews</span></a>;
}

export default function Home() {
  const [lead, ...moreStories] = stories;
  return <main>
    <header className="site-header">
      <div className="utility-bar"><p>Independent conservation journalism for a living planet.</p><span>Friday, 28 August</span></div>
      <div className="masthead"><Brand /><nav className="primary-nav"><a href="/about">About</a><a href="#newsletter">Newsletter</a></nav><a href="#donate" className="donate-button">Donate <ArrowRight /></a></div>
      <nav className="topic-nav" aria-label="Conservation topics">{topics.map(({ label, icon: Icon }) => <a href="#latest" key={label}><Icon /><span>{label}</span></a>)}</nav>
    </header>

    <section className="hero shell" aria-labelledby="lead-story">
      <div className="hero-kicker">The week in conservation</div>
      <div className="hero-grid">
        <div className="hero-copy"><p className="eyebrow">{lead.topic} · Field report</p><h1 id="lead-story">{lead.title}</h1><p className="standfirst">{lead.summary}</p><p className="byline">By {lead.byline} <span>·</span> 8 min read</p></div>
        <a href={`/stories/${lead.slug}`} className="hero-image" aria-label={`Read: ${lead.title}`}><img src={lead.image} alt="Sunlit seagrass below clear ocean water" /><span className="image-caption">Read the full story</span></a>
      </div>
    </section>

    <section className="latest shell" id="latest" aria-labelledby="latest-heading">
      <div className="section-heading"><h2 id="latest-heading">Latest stories</h2><p>Reporting, analysis and hopeful ideas from the people protecting nature.</p></div>
      <div className="story-grid">{moreStories.map((story) => <article className="story-card" key={story.title}><a href={`/stories/${story.slug}`} className="story-image" aria-label={`Read: ${story.title}`}><img src={story.image} alt="" /></a><div className="story-copy"><p className="eyebrow">{story.topic}</p><h3><a href={`/stories/${story.slug}`}>{story.title}</a></h3><p>{story.summary}</p><span className="byline">By {story.byline}</span></div></article>)}</div>
    </section>

    <section className="newsletter" id="newsletter"><div className="newsletter-inner shell"><div><p className="eyebrow">The weekly WildNews</p><h2>Good news for the planet,<br />without the greenwash.</h2></div><form className="signup-form"><label htmlFor="email">Get our essential conservation briefing every Friday.</label><div><input id="email" type="email" placeholder="you@example.com" required /><button type="submit">Sign me up <ArrowRight /></button></div></form></div></section>
    <section className="donate-panel shell" id="donate"><div><p className="eyebrow">Reader supported</p><h2>Nature needs a newsroom.</h2></div><p>WildNews is independent and nonprofit. Your support helps us follow the evidence, amplify local voices, and keep every story free to read.</p><button>Support our reporting <ArrowRight /></button></section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="#newsletter">Newsletter</a><a href="#donate">Donate</a></div></div></footer>
  </main>;
}
