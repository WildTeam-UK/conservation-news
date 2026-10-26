'use client';

import { useEffect, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { recordContentInteraction } from '@/lib/content-interactions';

type FeedbackChoice = 'positive' | 'negative';

function feedbackStorageKey(storyId: string) {
  return `wildnews_feedback_${storyId}`;
}

function readStoredFeedback(storyId: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(feedbackStorageKey(storyId)) ?? 'null') as { choice?: FeedbackChoice; eventId?: string } | null;
    return value?.eventId && (value.choice === 'positive' || value.choice === 'negative') ? value : null;
  } catch {
    return null;
  }
}

export function ContentFeedback({ storyId, contentLabel }: { storyId: string; contentLabel: 'story' | 'digest' }) {
  const [choice, setChoice] = useState<FeedbackChoice | null>(null);
  const [message, setMessage] = useState('');

  // Hydration is the first point at which this browser-only preference is available.
  // oxlint-disable-next-line react/react-compiler
  useEffect(() => setChoice(readStoredFeedback(storyId)?.choice ?? null), [storyId]);

  async function submit(nextChoice: FeedbackChoice) {
    const stored = readStoredFeedback(storyId);
    const eventId = stored?.eventId ?? crypto.randomUUID();
    setChoice(nextChoice);
    setMessage('Saving…');
    window.localStorage.setItem(feedbackStorageKey(storyId), JSON.stringify({ choice: nextChoice, eventId }));
    const saved = await recordContentInteraction({ eventId, storyId, eventType: nextChoice === 'positive' ? 'usefulness_positive' : 'usefulness_negative' }, true);
    setMessage(saved ? 'Thanks, your feedback helps us improve WildNews.' : 'Your choice is saved on this device. We could not send it just now.');
  }

  return <aside className="content-feedback" aria-labelledby={`content-feedback-${storyId}`}>
    <div><p className="eyebrow">Help us improve</p><h2 id={`content-feedback-${storyId}`}>Was this {contentLabel} useful?</h2><p>Your anonymous feedback helps us make future WildNews briefings more useful.</p></div>
    <div className="content-feedback-actions">
      <button type="button" className={choice === 'positive' ? 'selected' : ''} aria-pressed={choice === 'positive'} onClick={() => submit('positive')}><ThumbsUp /> Yes</button>
      <button type="button" className={choice === 'negative' ? 'selected' : ''} aria-pressed={choice === 'negative'} onClick={() => submit('negative')}><ThumbsDown /> Not quite</button>
    </div>
    <output aria-live="polite">{message}</output>
  </aside>;
}
