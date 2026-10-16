'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type AdminLoginFormProps = {
  initialMessage?: string;
};

export function AdminLoginForm({ initialMessage }: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState(initialMessage ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const rememberedEmail = window.localStorage.getItem('wildnews-admin-email');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage('That email address or password was not recognised.');
      setSubmitting(false);
      return;
    }

    if (rememberMe) window.localStorage.setItem('wildnews-admin-email', email);
    else window.localStorage.removeItem('wildnews-admin-email');

    window.location.assign('/admin');
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <div className="admin-field">
        <label htmlFor="admin-email">Email address</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="admin-field">
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <label className="admin-remember">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
        />
        <span>Remember me on this site</span>
      </label>
      {message ? <p className="admin-form-message" role="alert">{message}</p> : null}
      <button className="admin-primary-button" type="submit" disabled={submitting}>
        {submitting ? <><LoaderCircle className="admin-spinner" /> Signing in</> : <>Sign in <ArrowRight /></>}
      </button>
    </form>
  );
}
