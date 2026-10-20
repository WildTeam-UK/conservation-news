import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';

export default function NotFound() {
  return <main>
    <InteriorHeader />
    <section className="missing shell">
      <p className="eyebrow">404</p>
      <h1>We could not find that page.</h1>
      <p>The story, digest or archive may have moved, or it may no longer be available.</p>
      <Link className="action-button" href="/">Explore the latest stories <ArrowRight /></Link>
    </section>
    <SiteFooter />
  </main>;
}
