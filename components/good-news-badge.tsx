/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on archive links */
export function GoodNewsBadge({ overlay = false, href }: { overlay?: boolean; href?: string }) {
  const content = <>
    <span className="good-news-icon-wrap" aria-hidden="true"><span className="good-news-icon" /></span>
    {overlay ? null : <span className="good-news-label">Good News</span>}
  </>;
  const className = `good-news-fancy${overlay ? ' good-news-fancy-overlay' : ''}`;
  return href ? <a className={className} href={href}>{content}</a> : <span className={className} aria-label={overlay ? 'Good news' : undefined} title={overlay ? 'Good news' : undefined}>{content}</span>;
}
