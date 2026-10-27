'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { SOCIAL_EDITORIAL_DESTINATION } from '@/lib/distribution/constants';
import { useAdminConfirmation } from '@/components/admin-confirmation';

type Delivery = {
  id: string;
  provider: 'buffer' | 'brevo';
  destination: string;
  status: string;
  provider_reference: string | null;
  attempt_count: number;
  last_error: string | null;
};

export function DigestDeliveryStatus({ storyId, deliveries, socialCopy }: { storyId: string; deliveries: Delivery[]; socialCopy: string | null }) {
  const router = useRouter();
  const { confirmAdminAction } = useAdminConfirmation();
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  if (!deliveries.length) return null;

  async function retry(delivery: Delivery) {
    const uncertain = delivery.status === 'uncertain' && delivery.destination !== SOCIAL_EDITORIAL_DESTINATION;
    if (uncertain) {
      const confirmed = await confirmAdminAction({
        title: 'Retry this uncertain delivery?',
        description: 'The provider may already have received the request. Retrying could create a duplicate post or email campaign.',
        confirmLabel: 'Retry delivery',
        tone: 'warning',
      });
      if (!confirmed) return;
    }
    setWorking(delivery.id);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/digests/${storyId}/distribution/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: delivery.id, confirmUncertain: uncertain }) });
      const result = await response.json() as { queued?: boolean; error?: string };
      if (!response.ok || !result.queued) throw new Error(result.error ?? 'The delivery could not be retried.');
      setMessage('Delivery queued. The automation heartbeat will process it shortly.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The delivery could not be retried.');
    } finally {
      setWorking(null);
    }
  }

  return <section className="digest-delivery-panel" aria-labelledby="digest-delivery-heading">
    <div><p className="eyebrow">External distribution</p><h2 id="digest-delivery-heading">Delivery status</h2><p>Each destination is recorded separately so a failure can be handled without repeating successful deliveries.</p></div>
    {socialCopy ? <div className="digest-social-copy"><strong>Validated social post</strong><pre>{socialCopy}</pre></div> : null}
    <div className="digest-delivery-list">{deliveries.map((delivery) => <article key={delivery.id}>
      <div><strong>{delivery.destination === SOCIAL_EDITORIAL_DESTINATION ? 'Social editorial generation' : delivery.provider === 'buffer' ? 'Buffer channel' : 'Brevo Weekly Digest'}</strong><span>{delivery.destination === SOCIAL_EDITORIAL_DESTINATION ? 'Generate, fact-check and validate the post' : delivery.destination}</span></div>
      <span className={`run-status ${delivery.status}`}>{delivery.status}</span>
      <div><small>{delivery.provider_reference ? `Provider reference ${delivery.provider_reference}` : `${delivery.attempt_count} ${delivery.attempt_count === 1 ? 'attempt' : 'attempts'}`}</small>{delivery.last_error ? <p>{delivery.last_error}</p> : null}</div>
      {delivery.destination !== 'configuration' && ['failed', 'uncertain'].includes(delivery.status) ? <button type="button" disabled={Boolean(working)} onClick={() => retry(delivery)}>{working === delivery.id ? <LoaderCircle className="admin-spinner" /> : <RefreshCw />} Retry</button> : null}
    </article>)}</div>
    {message ? <output>{message}</output> : null}
  </section>;
}

