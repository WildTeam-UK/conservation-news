/* oxlint-disable next/no-html-link-for-pages -- full page links keep Vinext navigation reliable */
import { ArrowRight } from 'lucide-react';
import { EditorialImage } from '@/components/editorial-image';
import { GoodNewsBadge } from '@/components/good-news-badge';
import { StoryTags } from '@/components/story-tags';
import { cleanCopy, storyHref, storyImage, topicSlug, type Story } from '@/lib/stories';

export function TopicStoryShelf({ topic, stories }: { topic: string; stories: Story[] }) {
  if (!stories.length) return null;

  const archiveHref = `/topics/${topicSlug(topic)}`;
  return <section className="topic-shelf shell">
    <div className="shelf-heading"><div><h2><a href={archiveHref}>{topic}</a></h2></div><a href={archiveHref}>See all {topic.toLowerCase()} <ArrowRight /></a></div>
    <div className="topic-track">{stories.map((story) => <article className="carousel-card" key={story.slug}>
      <a className="carousel-image" href={storyHref(story)} aria-label={`Read: ${cleanCopy(story.title)}`}><EditorialImage src={storyImage(story)} alt="" loading="lazy" decoding="async" />{story.goodNews ? <GoodNewsBadge overlay /> : null}</a>
      <StoryTags story={story} />
      <h3><a href={storyHref(story)}>{cleanCopy(story.title)}</a></h3>
      <a className="text-link" href={storyHref(story)}>Read story <ArrowRight /></a>
    </article>)}</div>
  </section>;
}
