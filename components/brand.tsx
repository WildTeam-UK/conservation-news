/* oxlint-disable next/no-html-link-for-pages -- a full page load keeps home navigation reliable in Vinext */

export function Brand() {
  return <a href="/" className="brand" aria-label="WILDNEWS home">
    <span className="brand-wordmark" aria-hidden="true"><span className="brand-wild">WILD</span><span className="brand-news">NEWS</span></span>
  </a>;
}
