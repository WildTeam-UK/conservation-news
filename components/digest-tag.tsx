/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on digest archive links */
import { Newspaper } from 'lucide-react';

export function DigestTag({ type, className = '' }: { type: 'daily' | 'weekly'; className?: string }) {
  return <a className={`topic-tag digest-tag ${className}`.trim()} href="/digests"><Newspaper aria-hidden="true" /><span>WildNews {type === 'weekly' ? 'Weekly' : 'Daily'}</span></a>;
}
