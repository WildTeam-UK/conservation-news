'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="admin-login-page">
    <header className="admin-login-header"><Brand /></header>
    <section className="admin-login-card" role="alert">
      <p className="eyebrow">Editorial workspace</p>
      <h1>WildNews could not load this view.</h1>
      <p className="admin-login-intro">The request failed before the editorial page was ready. Retry it now. If the problem continues, check the latest deployment and server logs before changing any content.</p>
      <div className="admin-error-actions">
        <button className="admin-primary-button" type="button" onClick={reset}><RotateCcw aria-hidden="true" /> Retry this view</button>
        <Link href="/admin" prefetch={false}>Return to overview</Link>
      </div>
    </section>
  </main>;
}
