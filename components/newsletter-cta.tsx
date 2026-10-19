'use client';

import { ArrowRight } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';

type SignupStatus = 'idle' | 'submitting' | 'success' | 'error';

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
    <p className="digest-signup-privacy">By signing up, you agree to receive the WildNews Weekly Digest. You can unsubscribe at any time. <a href="https://training.wildteam.org.uk/privacy">Privacy policy</a>.</p>
  </form>;
}

export function WeeklyDigestNewsletterCta({ id, className = '' }: { id: string; className?: string }) {
  return <section className={`digest-newsletter-cta ${className}`.trim()}>
    <div><p className="eyebrow">WILDNEWS WEEKLY DIGEST</p><h2>Stay across the week in conservation.</h2><p>Get the essential stories, context and developments in one clear briefing every Friday.</p></div>
    <NewsletterSignupForm id={id} />
  </section>;
}
