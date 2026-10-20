export function GoodNewsBadge({ overlay = false }: { overlay?: boolean }) {
  return <span className={`good-news-fancy${overlay ? ' good-news-fancy-overlay' : ''}`} aria-label={overlay ? 'Good news' : undefined} title={overlay ? 'Good news' : undefined}>
    <span className="good-news-icon-wrap" aria-hidden="true"><span className="good-news-icon" /></span>
    {overlay ? null : <span className="good-news-label">Good News</span>}
  </span>;
}
