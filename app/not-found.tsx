/* oxlint-disable next/no-html-link-for-pages, next/no-img-element -- full page loads avoid unreliable Vinext client navigation; local static imagery does not need framework processing */
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';

export default function NotFound() {
  return <main>
    <InteriorHeader />
    <section className="missing not-found-page shell">
      <img className="not-found-image" src="/404-sloth.png" alt="A sad sloth holding a 404 sign." />
      <h1>Oops, we can&apos;t find that page!</h1>
      <p>Looks like you&apos;ve gone off the trail. Let&apos;s get you back on track before the sloth falls asleep again!</p>
      <a className="action-button" href="/">Take me back <ArrowRight aria-hidden="true" /></a>
    </section>
    <SiteFooter />
  </main>;
}
