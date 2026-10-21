'use client';

import { ArrowRight } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { InlineBrand } from '@/components/inline-brand';

type SignupStatus = 'idle' | 'submitting' | 'success' | 'error';
type NewsletterCtaVariant = 'full' | 'streamlined';

const NEWSLETTER_HEADLINE = 'One clear conservation briefing, every Friday.';

export function NewsletterSignupForm({ id }: { id: string }) {
  const [status, setStatus] = useState<SignupStatus>('idle');
  const [message, setMessage] = useState('');

  async function subscribe(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.get('email'), website: formData.get('website') }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'We could not add you to the list.');
      form.reset();
      setStatus('success');
      setMessage(result.message ?? 'You are subscribed to the WildNews Weekly Digest.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'We could not add you to the list. Please try again.');
    }
  }

  return <form className="digest-signup-form" onSubmit={subscribe}>
    <label htmlFor={id}>Your email address</label>
    <input className="digest-signup-honeypot" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <div className="digest-signup-control"><input id={id} name="email" type="email" inputMode="email" autoComplete="email" placeholder="Email address" maxLength={254} required disabled={status === 'submitting'} /><button type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Signing up…' : 'Sign me up'} <ArrowRight /></button></div>
    {message ? <output className={`digest-signup-message ${status}`} aria-live="polite">{message}</output> : null}
    <p className="digest-signup-privacy">By signing up, you agree to receive the <InlineBrand text="WILDNEWS" /> Weekly Digest. You can unsubscribe at any time. <a href="https://training.wildteam.org.uk/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>.</p>
  </form>;
}

export function NewsletterCta({ id, className = '', variant = 'full' }: { id: string; className?: string; variant?: NewsletterCtaVariant }) {
  const Container = variant === 'streamlined' ? 'aside' : 'section';
  const Heading = variant === 'streamlined' ? 'h3' : 'h2';
  const componentClass = variant === 'streamlined' ? 'digest-inline-newsletter' : 'digest-newsletter-cta';

  return <Container className={`${componentClass} ${className}`.trim()}>
    <div><p className="eyebrow"><InlineBrand text="WILDNEWS" /> WEEKLY DIGEST</p><Heading>{NEWSLETTER_HEADLINE}</Heading>{variant === 'full' ? <p>Get the essential stories, context and developments in one clear briefing every Friday.</p> : null}</div>
    <NewsletterSignupForm id={id} />
  </Container>;
}
