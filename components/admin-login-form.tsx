'use client';

import { type SyntheticEvent, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type AdminLoginFormProps = {
  initialMessage?: string;
};

export function AdminLoginForm({ initialMessage }: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(initialMessage ?? '');
  const [submitting, setSubmitting] = useState(false);

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
      {message ? <p className="admin-form-message" role="alert">{message}</p> : null}
      <button className="admin-primary-button" type="submit" disabled={submitting}>
        {submitting ? <><LoaderCircle className="admin-spinner" /> Signing in</> : <>Sign in <ArrowRight /></>}
      </button>
    </form>
  );
}
