import { ArrowRight } from 'lucide-react';

export function NewsletterSignupForm({ id }: { id: string }) {
  return <form className="digest-signup-form">
    <label htmlFor={id}>Your email address</label>
    <div className="digest-signup-control"><input id={id} type="email" placeholder="Email address" required /><button type="submit">Sign me up <ArrowRight /></button></div>
  </form>;
}

export function WeeklyDigestNewsletterCta({ id, className = '' }: { id: string; className?: string }) {
  return <section className={`digest-newsletter-cta ${className}`.trim()}>
    <div><p className="eyebrow">WILDNEWS WEEKLY DIGEST</p><h2>Stay across the week in conservation.</h2><p>Get the essential stories, context and developments in one clear briefing every Friday.</p></div>
    <NewsletterSignupForm id={id} />
  </section>;
}
