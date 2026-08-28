import type { Metadata } from 'next';
import { Brand } from '@/components/brand';
import { InteriorHeader } from '@/components/interior-header';

export const metadata: Metadata = {
  title: 'How our coverage analysis works | WILDNEWS',
  description: 'How WildNews analyses conservation framing, evidence, agreement and political leaning across current coverage.',
};

export default function LeaningMethodologyPage() {
  return <main>
    <InteriorHeader />
    <article className="methodology-page shell">
      <header className="methodology-hero">
        <p className="eyebrow">WildNews methodology</p>
        <h1>How our coverage analysis works</h1>
        <p>Our analysis compares the framing, evidence, agreement and political mix found across the sources covering a story. It helps readers understand the shape of current coverage, not decide whether a story is true.</p>
      </header>

      <div className="methodology-dimensions">
        <section>
          <p className="eyebrow">01 · Framing</p><h2>Ecological / Economic</h2>
          <div className="methodology-binary-scale ecology-signal"><span>Ecological</span><span>Economic</span></div>
          <p><strong>Ecological</strong> coverage focuses on biodiversity, ecosystems, species, habitats, climate or conservation outcomes. <strong>Economic</strong> coverage focuses on cost, jobs, business, industry, development, land use or economic consequences.</p>
        </section>
        <section>
          <p className="eyebrow">02 · Support</p><h2>Evidence-led / Opinion-led</h2>
          <div className="methodology-binary-scale evidence-signal"><span>Evidence-led</span><span>Opinion-led</span></div>
          <p><strong>Evidence-led</strong> coverage draws on peer-reviewed research, scientific studies, official data, government or published reports, named experts and clearly attributable factual sources. <strong>Opinion-led</strong> coverage relies more heavily on commentary, interpretation, advocacy, political argument, unsupported assertions or editorial opinion.</p>
        </section>
        <section>
          <p className="eyebrow">03 · Agreement</p><h2>Consensus / Contested</h2>
          <div className="methodology-binary-scale consensus-signal"><span>Consensus</span><span>Contested</span></div>
          <p><strong>Consensus</strong> means the sources broadly agree on the central facts and interpretation. <strong>Contested</strong> means sources, experts or stakeholders meaningfully disagree about what happened, why it happened, its significance or what should happen next.</p>
          <p className="methodology-note">This is agreement across the coverage being analysed. It is not a measure of scientific consensus.</p>
        </section>
        <section>
          <p className="eyebrow">04 · Outlet mix</p><h2>Political leaning</h2>
          <div className="methodology-scale" aria-label="Political leaning from left to centre to right"><span>Left</span><span>Centre</span><span>Right</span></div>
          <p>We group news outlets as left, centre or right using their public editorial record, ownership, language, story selection and assessments from established media-bias researchers. The result describes the current source mix, not an author’s personal beliefs.</p>
        </section>
      </div>

      <div className="methodology-content">
        <section><p className="eyebrow">Our process</p><h2>How we reach a result</h2><ol><li>We gather substantial reporting and original source material about the same underlying event.</li><li>We remove duplicates and sources that do not meaningfully cover the story.</li><li>We assess each source for its dominant framing, attributable evidence and relationship to the other coverage.</li><li>We classify the broad political orientation of qualifying news outlets and review uncertain cases editorially.</li><li>We calculate the percentage split for all four dimensions and update it when important new reporting changes the picture.</li></ol></section>
        <section><p className="eyebrow">Reading the signals</p><h2>A snapshot, not a score</h2><p>Each percentage reflects the sources currently represented in a WildNews story. A high evidence-led result means the available coverage relies strongly on attributable research, data or expertise. It does not guarantee that every claim is correct.</p><p>Likewise, a consensus result shows agreement between the sources we analysed. It does not establish scientific certainty, and a contested result does not mean both sides of a dispute are equally well supported.</p></section>
        <aside><p className="eyebrow">Important context</p><h2>What coverage analysis does not measure</h2><p>Coverage analysis reflects the sources, framing and viewpoints currently represented in a story. These signals are not judgements of factual accuracy, a recommendation to trust one outlet, or a measure of an individual author’s beliefs.</p><p>Categories require editorial judgement and can simplify complex reporting. We keep source links visible and update the analysis as new reporting and evidence are added.</p></aside>
      </div>
    </article>
    <footer><div className="shell footer-inner"><Brand /><p>Conservation, clearly told.</p><div><a href="/about">About</a><a href="/">Latest</a></div></div></footer>
  </main>;
}
