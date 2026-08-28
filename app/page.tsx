import Link from 'next/link';
import { ArrowRight, Bird, Fish, Leaf, Mountain, Sprout, Waves } from 'lucide-react';

const topics = [
  { label: 'Wildlife', icon: Bird }, { label: 'Oceans', icon: Waves },
  { label: 'Forests', icon: Sprout }, { label: 'Freshwater', icon: Fish },
  { label: 'Land & climate', icon: Mountain },
];

const stories = [
  { topic: 'Oceans', title: 'The quiet return of Europe’s great blue carbon stores', summary: 'From Scotland to the Adriatic, conservationists are restoring seagrass meadows — and discovering how much life can return when the seabed is given room to recover.', byline: 'Mara Velasquez', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85' },
  { topic: 'Wildlife', title: 'A new corridor gives elephants room to roam', summary: 'A community-led agreement is reconnecting fragmented habitat while keeping farms and families at the center of the plan.', byline: 'Nia Okafor', image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=900&q=85' },
  { topic: 'Forests', title: 'The forest guardians mapping what satellites miss', summary: 'Indigenous monitors are pairing generations of knowledge with new tools to protect one of the Amazon’s most threatened frontiers.', byline: 'Jon Bell', image: 'https://images.unsplash.com/photo-1653149875988-4fc5dff7a2cf?auto=format&fit=crop&w=900&q=85' },
  { topic: 'Freshwater', title: 'When a river runs free again', summary: 'Two years after a century-old dam came down, salmon are returning to tributaries that had been out of reach for generations.', byline: 'Avery Chen', image: 'https://images.unsplash.com/photo-1510682406919-5e9caf2cf3d7?auto=format&fit=crop&w=900&q=85' },
  { topic: 'Land & climate', title: 'Can peatlands become the next climate success story?', summary: 'The overlooked landscapes hold twice as much carbon as the world’s forests. A wave of restoration projects is finally matching their scale.', byline: 'Leila Hart', image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd4297?auto=format&fit=crop&w=900&q=85' },
  { topic: 'Solutions', title: 'The seed banks preparing cities for a hotter future', summary: 'Botanists are collecting resilient native plants today so tomorrow’s urban forests can survive longer, drier summers.', byline: 'Noah Reyes', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85' },
];

export function Brand() {
  return <Link href="/" className="brand" aria-label="Fieldnote home"><span className="brand-mark"><Leaf /></span><span>FIELDNOTE</span></Link>;
}

export default function Home() {
  const [lead, ...moreStories] = stories;
  return <main>
    <header className="site-header">
      <div className="utility-bar"><p>Independent conservation journalism for a living planet.</p><span>Friday, 28 August</span></div>
      <div className="masthead"><Brand /><nav className="primary-nav"><Link href="/about">About</Link><a href="#newsletter">Newsletter</a></nav><a href="#donate" className="donate-button">Donate <ArrowRight /></a></div>
      <nav className="topic-nav" aria-label="Conservation topics">{topics.map(({ label, icon: Icon }) => <a href={`#${label.toLowerCase().replaceAll(' ', '-')}`} key={label}><Icon /><span>{label}</span></a>)}</nav>
    </header>

    <section className="hero shell" aria-labelledby="lead-story">
      <div className="hero-kicker">The week in conservation</div>
      <div className="hero-grid">
        <div className="hero-copy"><p className="eyebrow">{lead.topic} · Field report</p><h1 id="lead-story">{lead.title}</h1><p className="standfirst">{lead.summary}</p><p className="byline">By {lead.byline} <span>·</span> 8 min read</p></div>
        <a href="#latest" className="hero-image" aria-label={`Read: ${lead.title}`}><img src={lead.image} alt="Sunlit seagrass below clear ocean water" /><span className="image-caption">A meadow beneath the waves</span></a>
      </div>
    </section>

    <section className="latest shell" id="latest" aria-labelledby="latest-heading">
      <div className="section-heading"><h2 id="latest-heading">Latest stories</h2><p>Reporting, analysis and hopeful ideas from the people protecting nature.</p></div>
      <div className="story-grid">{moreStories.map((story) => <article className="story-card" key={story.title}><a href="#" className="story-image" aria-label={`Read: ${story.title}`}><img src={story.image} alt="" /></a><div className="story-copy"><p className="eyebrow">{story.topic}</p><h3><a href="#">{story.title}</a></h3><p>{story.summary}</p><span className="byline">By {story.byline}</span></div></article>)}</div>
    </section>

    <section className="newsletter" id="newsletter"><div className="newsletter-inner shell"><div><p className="eyebrow">The weekly field note</p><h2>Good news for the planet,<br />without the greenwash.</h2></div><form className="signup-form"><label htmlFor="email">Get our essential conservation briefing every Friday.</label><div><input id="email" type="email" placeholder="you@example.com" required /><button type="submit">Sign me up <ArrowRight /></button></div></form></div></section>
    <section className="donate-panel shell" id="donate"><div><p className="eyebrow">Reader supported</p><h2>Nature needs a newsroom.</h2></div><p>Fieldnote is independent and nonprofit. Your support helps us follow the evidence, amplify local voices, and keep every story free to read.</p><button>Support our reporting <ArrowRight /></button></section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><Link href="/about">About</Link><a href="#newsletter">Newsletter</a><a href="#donate">Donate</a></div></div></footer>
  </main>;
}
