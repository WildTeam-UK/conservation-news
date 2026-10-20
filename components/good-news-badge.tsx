export function GoodNewsBadge({ overlay = false }: { overlay?: boolean }) {
  return <span className={`good-news-fancy${overlay ? ' good-news-fancy-overlay' : ''}`}><span>Good News</span></span>;
}
