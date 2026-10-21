'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main>
    <InteriorHeader />
    <section className="missing shell" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1>We could not load this page.</h1>
      <p>This may be a temporary problem. Try loading the page again, or return to the latest conservation stories.</p>
      <div className="missing-actions">
        <button className="action-button" type="button" onClick={reset}>Try again <RotateCcw aria-hidden="true" /></button>
        <Link className="action-button secondary-action-button" href="/" prefetch={false}>Go to the homepage</Link>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
