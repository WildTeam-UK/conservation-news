import type { Metadata } from 'next';
import { Brand } from '@/components/brand';
import { InteriorHeader } from '@/components/interior-header';

export const metadata: Metadata = {
  title: 'How our leaning analysis works | WILDNEWS',
  description: 'How WildNews describes the political leaning and balance of conservation news coverage.',
};

export default function LeaningMethodologyPage() {
  return <main>
    <InteriorHeader />
    <article className="methodology-page shell">
      <header className="methodology-hero">
        <p className="eyebrow">WildNews methodology</p>
        <h1>How our leaning analysis works</h1>
        <p>Our analysis shows the political orientation of the outlets covering a story. It helps readers see where reporting is coming from, not whether it is true.</p>
      </header>

      <div className="methodology-scale" aria-label="Political leaning from left to centre to right"><span>Left</span><span>Centre</span><span>Right</span></div>

      <div className="methodology-content">
        <section><p className="eyebrow">What the bar means</p><h2>A view of the coverage mix</h2><p>For each story, we identify a range of relevant reporting and primary sources. News outlets are grouped as left, centre or right using their public editorial record, ownership, language, story selection and assessments from established media-bias researchers.</p><p>The percentages show how much of the coverage we found sits in each group. A centre result does not mean the story itself is neutral; it means the current source mix is weighted towards outlets we classify as centre.</p></section>
        <section><p className="eyebrow">Our process</p><h2>How we reach a result</h2><ol><li>We gather substantial reporting and original source material about the same underlying event.</li><li>We remove duplicates, commentary with no new reporting and sources that do not meaningfully cover the story.</li><li>We classify each news outlet’s broad orientation and review uncertain cases editorially.</li><li>We calculate the share of qualifying coverage across left, centre and right.</li><li>We update the mix when important new reporting changes the picture.</li></ol></section>
        <aside><p className="eyebrow">Important context</p><h2>What it does not measure</h2><p>The leaning bar is not a factual-accuracy score, a judgement of an author’s personal beliefs or a recommendation to trust one outlet over another.</p><p>Political categories are imperfect and vary between countries. We use them as a practical signal, publish the source links, and keep the result open to editorial review.</p></aside>
      </div>
    </article>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
