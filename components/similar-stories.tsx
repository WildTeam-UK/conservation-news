/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic story routes */
import { TopicTag } from '@/components/topic-tag';
import { cleanCopy, storyImage, type Story } from '@/lib/stories';

export function SimilarStories({ stories, description = 'Keep exploring related coverage.' }: { stories: Story[]; description?: string }) {
  if (!stories.length) return null;

  return <section className="related shell">
    <div className="section-heading"><h2>Similar stories</h2><p>{description}</p></div>
    <div className="related-grid">{stories.map((story) => <article key={story.slug}>
      <a href={`/stories/${story.slug}`} className="related-image" aria-label={cleanCopy(story.title)}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(story)} alt="" /></a>
      <TopicTag topic={story.topic} />
      <h3><a href={`/stories/${story.slug}`}>{cleanCopy(story.title)}</a></h3>
    </article>)}</div>
  </section>;
}
