import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { AllTopicsNav } from '@/components/all-topics-nav';
import { Brand } from '@/components/brand';

export const metadata: Metadata = {
  title: 'How WILDNEWS uses AI',
  description: 'A transparent explanation of how AI helps WILDNEWS aggregate and summarise conservation coverage.',
};

export default function AiTransparencyPage() {
  return <main>
    <header className="article-header shell">
      <Brand />
      <a href="/" className="back-link"><ArrowLeft /> All stories</a>
      <a href="/#donate" className="donate-button">Donate</a>
    </header>
    <AllTopicsNav />

    <article className="ai-page shell">
      <header className="ai-page-hero">
        <p className="eyebrow">Transparency at WILDNEWS</p>
        <h1>How we use AI</h1>
        <p>WILDNEWS uses artificial intelligence to help find, organise and summarise conservation coverage. It makes a large and fragmented field easier to follow, but it does not turn a summary into original reporting.</p>
      </header>

      <section className="ai-caution">
        <strong>The important bit</strong>
        <p>AI can misunderstand context, flatten disagreement and make mistakes. Treat every WILDNEWS briefing as a starting point, then use the linked sources to read the original reporting and evidence.</p>
      </section>

      <section className="ai-process" aria-labelledby="ai-process-heading">
        <div className="section-heading"><h2 id="ai-process-heading">What AI helps us do</h2><p>A practical tool for organising coverage, never a substitute for the source.</p></div>
        <div className="ai-process-grid">
          <article><Search /><span>01</span><h3>Find and group</h3><p>AI helps identify conservation stories across different outlets and group reports that appear to describe the same underlying event.</p></article>
          <article><Sparkles /><span>02</span><h3>Summarise and tag</h3><p>AI helps draft concise overviews, key points and topic labels so readers can understand the shape of a story quickly.</p></article>
          <article><CheckCircle2 /><span>03</span><h3>Compare coverage</h3><p>AI helps surface differences in source selection and framing. The political leaning signal describes the coverage mix, not factual accuracy.</p></article>
        </div>
      </section>

      <div className="ai-editorial-grid">
        <section><p className="eyebrow">What this prototype is</p><h2>Aggregation, not original reporting</h2><p>The current WILDNEWS site is an editorial prototype built with AI assistance. Article briefings are generated from publicly available reporting and linked source material. They should not be quoted as eyewitness reporting or treated as a replacement for the organisations and journalists who gathered the facts.</p><p>Names, presentation and sample editorial analysis are used to demonstrate how the finished service could work.</p></section>
        <section><p className="eyebrow">Our publishing standard</p><h2>Source links stay visible</h2><p>Every article page keeps the original source links close to the summary. Readers can compare the briefing with the primary material, check other coverage and form their own view.</p><p>Where a briefing is wrong or misleading, it should be corrected clearly. AI assistance is never a reason to hide responsibility for what appears on the site.</p></section>
      </div>

      <section className="ai-next-step"><div><p className="eyebrow">Keep reading critically</p><h2>Go to the evidence.</h2></div><p>Use WILDNEWS to discover what is happening, then follow the source links for the detail, uncertainty and reporting behind each story.</p><a className="action-button" href="/">Explore the stories <ArrowRight /></a></section>
    </article>

    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/how-leaning-works">Leaning analysis</a></div></div></footer>
  </main>;
}
