import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CircleCheckBig, CircleDotDashed, CircleMinus, TriangleAlert } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { SiteFooter } from '@/components/site-footer';
import { InlineBrand } from '@/components/inline-brand';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'How WILDNEWS classifies good conservation news',
  description: 'The evidence-led method WILDNEWS uses to identify conservation stories that demonstrate clear progress.',
  path: '/how-we-classify-good-news',
});

export default function GoodNewsMethodPage() {
  return <main>
    <InteriorHeader />
    <article className="ai-page shell good-news-method">
      <header className="ai-page-hero">
        <p className="eyebrow">A transparent classification</p>
        <h1>What counts as good news?</h1>
        <p><InlineBrand text="WILDNEWS" /> looks for demonstrated conservation progress, not simply positive language. A story only enters the Good News archive when the reported evidence supports both a strong positive outlook and a confident classification.</p>
      </header>

      <section className="ai-caution"><strong>The short version</strong><p>Announcements, pledges and planned projects are not automatically good news. We look for delivery, credible evidence or outcomes that benefit nature or conservation practice.</p></section>

      <section className="ai-process" aria-labelledby="outlook-classes">
        <div className="section-heading"><h2 id="outlook-classes">Four possible outlooks</h2><p>The archive includes only strongly supported positive stories.</p></div>
        <div className="good-news-class-grid">
          <article><div className="good-news-class-heading"><CircleCheckBig /><span>Positive</span></div><p>Clear, evidenced or highly credible achieved progress.</p></article>
          <article><div className="good-news-class-heading"><CircleDotDashed /><span>Mixed</span></div><p>Meaningful progress and meaningful limitations, risks or harm coexist.</p></article>
          <article><div className="good-news-class-heading"><CircleMinus /><span>Neutral</span></div><p>The reporting is informational or the conservation outcome is not yet clear.</p></article>
          <article><div className="good-news-class-heading"><TriangleAlert /><span>Negative</span></div><p>The evidence describes harm, loss, deterioration or weakened protection.</p></article>
        </div>
      </section>

      <div className="ai-editorial-grid">
        <section><p className="eyebrow">Two safeguards</p><h2>Outcome and confidence</h2><p>Each article receives an outlook score from wholly negative to clearly positive, plus a separate confidence score measuring how strongly the supplied evidence supports that judgement.</p><p>The public threshold can change as the source network and classification system improve. Changing it updates the archive without changing the underlying article.</p></section>
        <section><p className="eyebrow">AI-assisted, openly stated</p><h2>A useful signal, not a verdict</h2><p>AI applies the same editorial rubric to each source-backed article. It can still miss context or make mistakes, so the label should help discovery rather than replace the original evidence.</p><p>Every briefing retains its source links so readers can check the reporting behind the classification.</p></section>
      </div>

      <section className="ai-next-step"><div><p className="eyebrow">See the results</p><h2>Find progress worth following.</h2></div><p>Explore the conservation stories that currently meet the <InlineBrand text="WILDNEWS" /> evidence and confidence thresholds.</p><Link className="action-button" href="/good-news-in-conservation">Read Good News <ArrowRight /></Link></section>
    </article>
    <SiteFooter />
  </main>;
}
