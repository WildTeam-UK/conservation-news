import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, PenLine } from 'lucide-react';
import { AllTopicsNav } from '@/components/all-topics-nav';
import { Brand } from '@/components/brand';
import { TopicTag } from '@/components/topic-tag';
import { allAuthors, authorSlug, cleanCopy, getAuthor, stories, storyImage } from '@/lib/stories';

export function generateStaticParams() {
  return allAuthors.map((author) => ({ author: authorSlug(author) }));
}

export async function generateMetadata({ params }: { params: Promise<{ author: string }> }): Promise<Metadata> {
  const author = getAuthor((await params).author);
  if (!author) return { title: 'Curator not found | WILDNEWS' };
  return { title: `${author} | WILDNEWS`, description: `Conservation stories curated by ${author} for WILDNEWS.` };
}

export default async function AuthorPage({ params }: { params: Promise<{ author: string }> }) {
  const author = getAuthor((await params).author);
  if (!author) return <main className="missing shell"><h1>Curator not found</h1><a href="/">Back to WildNews</a></main>;

  const authorStories = stories.filter((story) => story.byline === author);

  return <main>
    <header className="article-header shell">
      <Brand />
      <a href="/" className="back-link"><ArrowLeft /> All stories</a>
      <a href="/#donate" className="donate-button">Donate <ArrowRight /></a>
    </header>
    <AllTopicsNav />
    <section className="topic-page-hero author-page-hero shell">
      <span className="curator-pill"><PenLine /> Curator</span>
      <h1>{author}</h1>
      <p>Conservation stories selected and summarised by {author} for WILDNEWS.</p>
      <span>{authorStories.length} {authorStories.length === 1 ? 'story' : 'stories'}</span>
    </section>
    <section className="topic-page-grid shell">
      {authorStories.map((story, index) => <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={story.slug}>
        <a className="topic-story-image" href={`/stories/${story.slug}`}><img src={storyImage(story)} alt="" /></a>
        <div><TopicTag topic={story.topic} /><h2><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h2><p>{cleanCopy(story.summary)}</p><a className="text-link" href={`/stories/${story.slug}`}>Read story <ArrowRight /></a></div>
      </article>)}
    </section>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
