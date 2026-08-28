import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/brand';
import { TopicNav } from '@/components/topic-nav';
import { allTopics, cleanCopy, stories, storyImage, topicSlug } from '@/lib/stories';

const shelfTopics = ['Wildlife', 'Oceans', 'Forests', 'Freshwater', 'Land & climate'];
const primaryTopics = ['Wildlife', 'Oceans', 'Forests', 'Freshwater', 'Land & climate'];
const navigationTopics = [...primaryTopics, ...allTopics.filter((topic) => !primaryTopics.includes(topic)).sort((a, b) => a.localeCompare(b))];

export default function Home() {
  const [lead, ...moreStories] = stories;
  const latestStories = moreStories.slice(0, 7);

  return <main>
    <header className="site-header">
      <div className="masthead"><Brand /><nav className="primary-nav"><a href="/about">About</a><a href="https://training.wildteam.org.uk/courses" target="_blank" rel="noreferrer">Training</a><a href="https://training.wildteam.org.uk/job-board" target="_blank" rel="noreferrer">Careers</a><a href="#newsletter">Newsletter</a></nav><a href="#donate" className="donate-button">Donate <ArrowRight /></a></div>
      <TopicNav topics={navigationTopics} />
      <div className="ai-disclosure shell"><p><strong>How we use AI:</strong> WildNews uses AI to find, group and summarise conservation coverage. These briefings are not original reporting and can miss context, so we always link to the source material. <a href="/how-we-use-ai">Read our full approach <ArrowRight /></a></p></div>
    </header>

    <section className="hero shell" aria-labelledby="lead-story">
      <div className="hero-kicker">The week in conservation</div>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{lead.topic} · Field report</p>
          <h1 id="lead-story"><a href={`/stories/${lead.slug}`}>{cleanCopy(lead.title)}</a></h1>
          <p className="standfirst">{cleanCopy(lead.summary)}</p>
          <a className="read-more-button" href={`/stories/${lead.slug}`}>Read more <ArrowRight /></a>
          <p className="byline">By {lead.byline} <span>·</span> 8 min read</p>
        </div>
        <a href={`/stories/${lead.slug}`} className="hero-image" aria-label={`Read: ${cleanCopy(lead.title)}`}><img src={storyImage(lead)} alt="Sunlit seagrass below clear ocean water" /><span className="image-caption">Read the full story</span></a>
      </div>
    </section>

    <section className="latest shell" id="latest" aria-labelledby="latest-heading">
      <div className="section-heading"><h2 id="latest-heading">Latest stories</h2><p>Reporting, analysis and ideas from the people protecting nature.</p></div>
      <div className="story-grid">{latestStories.map((story) => <article className="story-card" key={story.slug}><a href={`/stories/${story.slug}`} className="story-image" aria-label={`Read: ${cleanCopy(story.title)}`}><img src={storyImage(story)} alt="" /></a><div className="story-copy"><p className="eyebrow">{story.topic}</p><h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3><p>{cleanCopy(story.summary)}</p><span className="byline">By {story.byline}</span></div></article>)}</div>
    </section>

    <section className="topic-shelves" aria-label="Stories by topic">
      {shelfTopics.map((topic) => {
        const topicStories = stories.filter((story) => story.topic === topic || story.topics.includes(topic));
        return <section className="topic-shelf shell" key={topic}>
          <div className="shelf-heading"><div><p className="eyebrow">Explore WildNews</p><h2>{topic}</h2></div><a href={`/topics/${topicSlug(topic)}`}>See all {topic.toLowerCase()} <ArrowRight /></a></div>
          <div className="topic-track">{topicStories.map((story) => <article className="carousel-card" key={story.slug}>
            <a className="carousel-image" href={`/stories/${story.slug}`}><img src={storyImage(story)} alt="" /></a>
            <p className="eyebrow">{story.topic}</p>
            <h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3>
            <a className="text-link" href={`/stories/${story.slug}`}>Read story <ArrowRight /></a>
          </article>)}</div>
        </section>;
      })}
    </section>

    <section className="newsletter" id="newsletter"><div className="newsletter-inner shell"><div><p className="eyebrow">The weekly WildNews</p><h2>Conservation news,<br />clearly told.</h2></div><form className="signup-form"><label htmlFor="email">Get our essential conservation briefing every Friday.</label><div><input id="email" type="email" placeholder="you@example.com" required /><button type="submit">Sign me up <ArrowRight /></button></div></form></div></section>
    <section className="donate-panel shell" id="donate"><div><p className="eyebrow">Reader supported</p><h2>Nature needs a newsroom.</h2></div><p>WildNews is independent and nonprofit. Your support helps us follow the evidence, amplify local voices, and keep every story free to read.</p><a className="action-button" href="https://www.wildteam.org.uk/donate" target="_blank" rel="noreferrer">Support our reporting <ArrowRight /></a></section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="#newsletter">Newsletter</a><a href="#donate">Donate</a></div></div></footer>
  </main>;
}
