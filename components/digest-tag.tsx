import { Newspaper } from 'lucide-react';
import Link from 'next/link';

export function DigestTag({ type, className = '' }: { type: 'daily' | 'weekly'; className?: string }) {
  return <Link className={`topic-tag digest-tag ${className}`.trim()} href="/digests"><Newspaper aria-hidden="true" /><span>WildNews {type === 'weekly' ? 'Weekly' : 'Daily'}</span></Link>;
}
