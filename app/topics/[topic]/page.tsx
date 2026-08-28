import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AllTopicsNav } from '@/components/all-topics-nav';
import { Brand } from '@/components/brand';
import { TopicTag } from '@/components/topic-tag';
import { allTopics, authorSlug, cleanCopy, getTopic, stories, storyImage, topicSlug } from '@/lib/stories';

export function generateStaticParams() {
  return allTopics.map((topic) => ({ topic: topicSlug(topic) }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const topic = getTopic((await params).topic);
  if (!topic) return { title: 'Topic not found | WILDNEWS' };
  return { title: `${topic} news | WILDNEWS`, description: `The latest ${topic.toLowerCase()} reporting, analysis and ideas from WILDNEWS.` };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const slug = (await params).topic;
  const topic = getTopic(slug);
  if (!topic) return <main className="missing shell"><h1>Topic not found</h1><a href="/">Back to WildNews</a></main>;

  const topicStories = stories.filter((story) => story.topic === topic || story.topics.includes(topic));

  return <main>
    <header className="article-header shell">
      <Brand />
      <a href="/" className="back-link"><ArrowLeft /> All stories</a>
      <a href="/#donate" className="donate-button">Donate <ArrowRight /></a>
    </header>
    <AllTopicsNav />
    <section className="topic-page-hero shell">
      <TopicTag topic={topic} className="topic-pill" />
      <h1>{topic}</h1>
      <p>The latest reporting, analysis and practical ideas shaping {topic.toLowerCase()} conservation.</p>
      <span>{topicStories.length} {topicStories.length === 1 ? 'story' : 'stories'}</span>
    </section>
    <section className="topic-page-grid shell">
      {topicStories.map((story, index) => <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={story.slug}>
        <a className="topic-story-image" href={`/stories/${story.slug}`}><img src={storyImage(story)} alt="" /></a>
        <div><TopicTag topic={story.topic} /><h2><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h2><p>{cleanCopy(story.summary)}</p><p className="byline">By <a href={`/authors/${authorSlug(story.byline)}`}>{story.byline}</a></p><a className="text-link" href={`/stories/${story.slug}`}>Read story <ArrowRight /></a></div>
      </article>)}
    </section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
