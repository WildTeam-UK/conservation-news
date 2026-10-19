'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function SocialShare({ path, title, label = 'Share this story' }: { path: string; title: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function currentUrl() {
    return new URL(path, window.location.origin).toString();
  }

  function openShare(network: 'linkedin' | 'facebook' | 'x') {
    const encodedUrl = encodeURIComponent(currentUrl());
    const encodedTitle = encodeURIComponent(title);
    const shareUrl = network === 'linkedin'
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      : network === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        : `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=720,height=720');
  }

  async function copyLink() {
    await navigator.clipboard.writeText(currentUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return <aside className="social-share" aria-label={label}>
    <button type="button" onClick={() => openShare('linkedin')} title="Share on LinkedIn" aria-label="Share on LinkedIn"><span className="social-share-mark" aria-hidden="true">in</span></button>
    <button type="button" onClick={() => openShare('facebook')} title="Share on Facebook" aria-label="Share on Facebook"><span className="social-share-mark" aria-hidden="true">f</span></button>
    <button type="button" onClick={() => openShare('x')} title="Share on X" aria-label="Share on X"><span className="social-share-mark" aria-hidden="true">X</span></button>
    <button type="button" onClick={copyLink} title="Copy link" aria-label={copied ? 'Link copied' : 'Copy link'}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button>
    <output className="social-share-status" aria-live="polite">{copied ? 'Link copied to clipboard.' : ''}</output>
  </aside>;
}
