/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic editorial routes */
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { GoodNewsBadge } from '@/components/good-news-badge';
import { storyReadLabel, type Story } from '@/lib/stories';

type EditorialArchiveCardProps = {
  featured?: boolean;
  href: string;
  image?: string | null;
  imageAlt?: string;
  goodNews?: boolean;
  digestType?: Story['digestType'];
  labels?: ReactNode;
  title: string;
  summary?: string | null;
};

export function EditorialArchiveCard({
  featured = false,
  href,
  image,
  imageAlt = '',
  goodNews = false,
  digestType,
  labels,
  title,
  summary,
}: EditorialArchiveCardProps) {
  return <article className={featured ? 'topic-story topic-story-featured' : 'topic-story'}>
    <a className="topic-story-image" href={href} aria-label={`Read: ${title}`}>
      {image ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={image} alt={imageAlt} loading={featured ? 'eager' : 'lazy'} fetchPriority={featured ? 'high' : undefined} decoding="async" /></> : null}
      {goodNews ? <GoodNewsBadge overlay /> : null}
    </a>
    <div className="topic-story-content">
      {labels}
      <h2><a href={href}>{title}</a></h2>
      {summary ? <p>{summary}</p> : null}
      <a className="text-link" href={href}>{storyReadLabel(digestType)} <ArrowRight /></a>
    </div>
  </article>;
}
