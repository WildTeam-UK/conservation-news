import Link from 'next/link';

export function Brand() {
  return <Link href="/" className="brand" aria-label="WILDNEWS home">
    <span className="brand-wordmark" aria-hidden="true"><span className="brand-wild">WILD</span><span className="brand-news">NEWS</span></span>
  </Link>;
}
