export function GoodNewsBadge({ overlay = false }: { overlay?: boolean }) {
  return <span className={`good-news-fancy${overlay ? ' good-news-fancy-overlay' : ''}`}>
    <span className="good-news-icon-wrap" aria-hidden="true"><span className="good-news-icon" /></span>
    <span className="good-news-label">Good News</span>
  </span>;
}
