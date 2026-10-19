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

  return <section className="social-share shell" aria-label={label}>
    <div className="social-share-copy"><p className="eyebrow">Pass it on</p><h2>{label}</h2></div>
    <div className="social-share-actions">
      <button type="button" onClick={() => openShare('linkedin')}><span className="social-share-mark" aria-hidden="true">in</span><span>LinkedIn</span></button>
      <button type="button" onClick={() => openShare('facebook')}><span className="social-share-mark" aria-hidden="true">f</span><span>Facebook</span></button>
      <button type="button" onClick={() => openShare('x')}><span className="social-share-mark" aria-hidden="true">X</span><span>X</span></button>
      <button type="button" onClick={copyLink}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{copied ? 'Copied' : 'Copy link'}</span></button>
    </div>
    <output className="social-share-status" aria-live="polite">{copied ? 'Link copied to clipboard.' : ''}</output>
  </section>;
}
