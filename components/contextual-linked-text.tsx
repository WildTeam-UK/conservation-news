import type { ReactNode } from 'react';
import { cleanArticleLinks, contextualLinkOccurrence, type ArticleContextualLink } from '@/lib/article-linking';

export function ContextualLinkedText({ text, links }: { text: string; links?: ArticleContextualLink[] }) {
  const positioned = cleanArticleLinks(text, links).map((link) => {
    const start = contextualLinkOccurrence(text, link.anchor_text);
    return { link, start, end: start + link.anchor_text.length };
  }).filter(({ start }) => start >= 0).sort((a, b) => a.start - b.start);
  if (!positioned.length) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  positioned.forEach(({ link, start, end }, index) => {
    if (start < cursor) return;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<a className="article-contextual-link" href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} key={`${link.type}-${link.target_id}-${index}`}>{text.slice(start, end)}</a>);
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
