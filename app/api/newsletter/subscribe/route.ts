import { positiveIntegerEnvironmentValue, requireEnvironmentValue } from '@/lib/environment';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuration() {
  const apiKey = requireEnvironmentValue('BREVO_API_KEY', process.env.BREVO_API_KEY);
  const listId = positiveIntegerEnvironmentValue('BREVO_LIST_ID', process.env.BREVO_LIST_ID);
  return { apiKey, listId };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; website?: unknown } | null;
  if (!body) return Response.json({ error: 'Enter your email address.' }, { status: 400 });

  try {
    if (typeof body.website === 'string' && body.website.trim()) {
      return Response.json({ ok: true, message: 'You are subscribed to the WildNews Weekly Digest.' });
    }

    if (typeof body.email !== 'string') return Response.json({ error: 'Enter your email address.' }, { status: 400 });
    const email = body.email.trim().toLowerCase();
    if (email.length > 254 || !emailPattern.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });

    const { apiKey, listId } = configuration();
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error('Brevo newsletter subscription failed', response.status, await response.text());
      return Response.json({ error: 'We could not add you to the list. Please try again.' }, { status: 502 });
    }

    return Response.json({ ok: true, message: 'You are subscribed to the WildNews Weekly Digest.' });
  } catch (error) {
    console.error('Newsletter subscription failed', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'We could not add you to the list. Please try again.' }, { status: 500 });
  }
}
