'use client';

import { useState } from 'react';
import { LoaderCircle, MailCheck } from 'lucide-react';

export function DigestEmailTest({ storyId, configured }: { storyId: string; configured: boolean }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  async function sendTest() {
    setSending(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/digests/${storyId}/distribution/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { sent?: boolean; cleanupWarning?: boolean; error?: string };
      if (!response.ok || !result.sent) throw new Error(result.error ?? 'The test email could not be sent.');
      setMessage(result.cleanupWarning ? 'Test email sent. Brevo retained a recipient-free test draft because automatic cleanup failed.' : 'Test email sent. Check the recipient inbox and spam folder.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The test email could not be sent.');
    } finally {
      setSending(false);
    }
  }

  return <section className="digest-email-test-panel" aria-labelledby="digest-email-test-heading">
    <div><p className="eyebrow">Email quality check</p><h2 id="digest-email-test-heading">Send a Brevo test</h2><p>Preview this exact weekly email without contacting the subscriber list or changing its delivery status.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); void sendTest(); }}>
      <label htmlFor="digest-test-email"><span>Test recipient</span><input id="digest-test-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="you@example.org" required disabled={sending || !configured} /><small>The address is passed to Brevo for this test and is not stored by WildNews. Brevo allows up to 50 test sends per day.</small></label>
      <button type="submit" disabled={sending || !configured || !email.trim()}>{sending ? <LoaderCircle className="admin-spinner" /> : <MailCheck />} {sending ? 'Sending…' : 'Send test email'}</button>
    </form>
    {!configured ? <p className="digest-email-test-message">Configure the Brevo API key, list and sender before sending a test.</p> : null}
    {message ? <output className="digest-email-test-message" aria-live="polite">{message}</output> : null}
  </section>;
}
