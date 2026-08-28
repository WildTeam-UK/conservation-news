import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';

export default function About() {
  return <main>
    <header className="about-header shell">
      <a href="/" className="brand"><span className="brand-mark"><Leaf /></span><span>WildNews</span></a>
      <a href="/" className="back-link"><ArrowLeft /> Back to stories</a>
      <a href="#support" className="donate-button">Donate <ArrowRight /></a>
    </header>
    <section className="about-hero shell">
      <p className="eyebrow">About WildNews</p>
      <h1>We tell the whole story of a changing natural world.</h1>
      <p className="about-intro">WildNews is an independent, nonprofit newsroom covering the people, places and ideas shaping conservation — with curiosity, rigor and a stubborn belief that progress deserves attention.</p>
    </section>
    <section className="about-image"><img src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1800&q=85" alt="Sunlight filtering through a dense green forest" /></section>
    <section className="about-values shell">
      <div><p className="eyebrow">Why we exist</p><h2>Nature is not a niche.</h2></div>
      <div className="about-body"><p>Conservation connects to almost everything: food, health, livelihoods, culture, climate and justice. Yet the stories behind it are often fragmented, buried in specialist journals, or reduced to crisis.</p><p>We bring those threads together. Our journalists follow the science, listen to communities on the front line, and look closely at what is working — as well as what is not.</p></div>
    </section>
    <section className="principles shell">
      <article><span>01</span><h3>Evidence first</h3><p>We report with independence, precision and a healthy respect for complexity.</p></article>
      <article><span>02</span><h3>People belong in the story</h3><p>Conservation works best when local and Indigenous leadership is heard and valued.</p></article>
      <article><span>03</span><h3>Possibility matters</h3><p>We investigate solutions without hype, and make space for grounded hope.</p></article>
    </section>
    <section className="about-support" id="support"><div className="shell"><p className="eyebrow">Join our community</p><h2>Help keep independent conservation journalism in the field.</h2><a className="action-button action-button-dark" href="https://www.wildteam.org.uk/donate" target="_blank" rel="noreferrer">Make a donation <ArrowRight /></a></div></section>
    <footer><div className="shell footer-inner"><a href="/" className="brand"><span className="brand-mark"><Leaf /></span><span>WildNews</span></a><p>Conservation, clearly told.</p><div><a href="/">Home</a><a href="#support">Donate</a></div></div></footer>
  </main>;
}
