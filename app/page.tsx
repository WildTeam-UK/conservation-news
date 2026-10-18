import { ArrowRight } from 'lucide-react';
import { AllTopicsNav } from '@/components/all-topics-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteNavigation } from '@/components/site-navigation';
import { TopicTag } from '@/components/topic-tag';
import { getPublishedStories, publishedStoryToListing } from '@/lib/published-stories';
import { cleanCopy, storyImage, topicSlug } from '@/lib/stories';
import { EDITORIAL_TOPICS } from '@/lib/taxonomy';

const shelfTopics = [...EDITORIAL_TOPICS];

export const dynamic = 'force-dynamic';

export default async function Home() {
  const published = (await getPublishedStories(30)).map(publishedStoryToListing);
  const liveStories = published;
  const [lead, ...moreStories] = liveStories;
  const primaryLatest = moreStories.slice(0, 6);
  const compactLatest = moreStories.slice(6, 16);

  return <main>
    <header className="site-header">
      <SiteNavigation />
    </header>
    <AllTopicsNav />
    <div className="ai-disclosure shell"><p><strong>How we use AI:</strong> WildNews uses AI to find, group and summarise conservation coverage. These briefings are not original reporting and can miss context, so we always link to the source material. <a href="/how-we-use-ai">Read our full approach <ArrowRight /></a></p></div>

    <section className="hero shell" aria-labelledby="lead-story">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="hero-meta"><TopicTag topic={lead.topic} /></div>
          <h1 id="lead-story"><a href={`/stories/${lead.slug}`}>{cleanCopy(lead.title)}</a></h1>
          <p className="standfirst">{cleanCopy(lead.summary)}</p>
          <a className="read-more-button" href={`/stories/${lead.slug}`}>Read more <ArrowRight /></a>
        </div>
        <a href={`/stories/${lead.slug}`} className="hero-image" aria-label={`Read: ${cleanCopy(lead.title)}`}><img src={storyImage(lead)} alt="Sunlit seagrass below clear ocean water" /></a>
      </div>
    </section>

    <section className="latest shell" id="latest" aria-labelledby="latest-heading">
      <div className="section-heading"><h2 id="latest-heading">Latest stories</h2><p>Reporting, analysis and ideas from the people protecting nature.</p></div>
      <div className="latest-columns">
        <div className="latest-primary">{primaryLatest.map((story) => <article className="story-card" key={story.slug}><a href={`/stories/${story.slug}`} className="story-image" aria-label={`Read: ${cleanCopy(story.title)}`}><img src={storyImage(story)} alt="" /></a><div className="story-copy"><TopicTag topic={story.topic} /><h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3><p>{cleanCopy(story.summary)}</p></div></article>)}</div>
        <aside className="latest-compact" aria-label="More latest stories">{compactLatest.map((story) => <article className="compact-story" key={story.slug}>
          <a className="compact-story-image" href={`/stories/${story.slug}`}><img src={storyImage(story)} alt="" /></a>
          <div><TopicTag topic={story.topic} /><h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3></div>
        </article>)}</aside>
      </div>
    </section>

    <section className="topic-shelves" aria-label="Stories by topic">
      {shelfTopics.map((topic) => {
        const topicStories = liveStories.filter((story) => story.topic === topic || story.topics.includes(topic));
        if (!topicStories.length) return null;
        return <section className="topic-shelf shell" key={topic}>
          <div className="shelf-heading"><div><h2><a href={`/topics/${topicSlug(topic)}`}>{topic}</a></h2></div><a href={`/topics/${topicSlug(topic)}`}>See all {topic.toLowerCase()} <ArrowRight /></a></div>
          <div className="topic-track">{topicStories.map((story) => <article className="carousel-card" key={story.slug}>
            <a className="carousel-image" href={`/stories/${story.slug}`}><img src={storyImage(story)} alt="" /></a>
            <TopicTag topic={story.topic} />
            <h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3>
            <a className="text-link" href={`/stories/${story.slug}`}>Read story <ArrowRight /></a>
          </article>)}</div>
        </section>;
      })}
    </section>

    <section className="newsletter" id="newsletter"><div className="newsletter-inner shell"><div><p className="eyebrow">The weekly WildNews</p><h2>Conservation news,<br />clearly told.</h2></div><form className="signup-form"><label htmlFor="email">Get our essential conservation briefing every Friday.</label><div><input id="email" type="email" placeholder="you@example.com" required /><button type="submit">Sign me up <ArrowRight /></button></div></form></div></section>
    <section className="donate-panel shell" id="donate"><div><p className="eyebrow">Reader supported</p><h2>Nature needs a newsroom.</h2></div><p>WildNews is independent and nonprofit. Your support helps us follow the evidence, amplify local voices, and keep every story free to read.</p><a className="action-button" href="https://www.wildteam.org.uk/donate" target="_blank" rel="noreferrer">Support our reporting <ArrowRight /></a></section>
    <SiteFooter />
  </main>;
}
