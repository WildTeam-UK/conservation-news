/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on digest archive links */
import { Newspaper } from 'lucide-react';

export function DigestTag({ type, className = '' }: { type: 'daily' | 'weekly'; className?: string }) {
  return <a className={`topic-tag digest-tag editorial-pill ${className}`.trim()} href="/digests"><span className="editorial-pill-icon" aria-hidden="true"><Newspaper /></span><span className="editorial-pill-label">WildNews {type === 'weekly' ? 'Weekly' : 'Daily'}</span></a>;
}
