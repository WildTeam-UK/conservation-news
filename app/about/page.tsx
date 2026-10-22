/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { InlineBrand } from '@/components/inline-brand';
import { PageHero } from '@/components/page-hero';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'About WILDNEWS | Conservation coverage from WildTeam',
  description: 'Learn why WILDNEWS brings together source-led conservation reporting, evidence and practical ideas from around the world.',
  path: '/about',
});

export default function About() {
  return <main>
    <InteriorHeader />
    <PageHero eyebrow={<>About <InlineBrand text="WILDNEWS" /></>} title="We tell the whole story of a changing natural world." description={<><InlineBrand text="WILDNEWS" /> is an independent, nonprofit newsroom covering the people, places and ideas shaping conservation, with curiosity, rigour and a stubborn belief that progress deserves attention.</>} />
    <section className="about-values shell">
      <div><p className="eyebrow">Why we exist</p><h2>Nature is not a niche.</h2></div>
      <div className="about-body"><p>Conservation connects to almost everything: food, health, livelihoods, culture, climate and justice. Yet the stories behind it are often fragmented, buried in specialist journals, or reduced to crisis.</p><p>We bring those threads together by following the science, listening to communities on the front line, and looking closely at what is working, as well as what is not.</p></div>
    </section>
    <section className="principles shell">
      <article><span>01</span><h3>Evidence first</h3><p>We synthesise source reporting with precision and a healthy respect for complexity.</p></article>
      <article><span>02</span><h3>People belong in the story</h3><p>Conservation works best when local and Indigenous leadership is heard and valued.</p></article>
      <article><span>03</span><h3>Possibility matters</h3><p>We examine reported solutions without hype, and make space for grounded hope.</p></article>
    </section>
    <section className="about-guides shell" id="how-wildnews-works">
      <div className="section-heading"><h2>How <InlineBrand text="WILDNEWS" /> works</h2><p>Understand the tools and editorial signals behind every source-linked briefing.</p></div>
      <div className="about-guide-grid">
        <article><p className="eyebrow">AI and transparency</p><h3>How we use AI</h3><p>See how AI helps us find, group and summarise conservation coverage, where human responsibility remains essential, and why every briefing links back to its source material.</p><a className="text-link" href="/how-we-use-ai">Explore our approach <ArrowRight /></a></article>
        <article><p className="eyebrow">Reading the reporting</p><h3>How coverage analysis works</h3><p>Learn how we compare ecological framing, attributable evidence and agreement across the sources currently covering a conservation story.</p><a className="text-link" href="/how-coverage-analysis-works">Understand the analysis <ArrowRight /></a></article>
        <article><p className="eyebrow">Evidence of progress</p><h3>How we classify good news</h3><p>Find out how demonstrated conservation outcomes and confidence in the available evidence determine whether a story appears in our Good News archive.</p><a className="text-link" href="/how-we-classify-good-news">See the classification <ArrowRight /></a></article>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
