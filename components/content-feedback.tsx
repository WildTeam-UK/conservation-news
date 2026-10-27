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

  // Hydration is the first point at which this browser-only preference is available.
  // oxlint-disable-next-line react/react-compiler
  useEffect(() => setChoice(readStoredFeedback(storyId)?.choice ?? null), [storyId]);

  async function submit(nextChoice: FeedbackChoice) {
    const stored = readStoredFeedback(storyId);
    const eventId = stored?.eventId ?? crypto.randomUUID();
    setChoice(nextChoice);
    window.localStorage.setItem(feedbackStorageKey(storyId), JSON.stringify({ choice: nextChoice, eventId }));
    await recordContentInteraction({ eventId, storyId, eventType: nextChoice === 'positive' ? 'usefulness_positive' : 'usefulness_negative' }, true);
  }

  return <section className="content-feedback" aria-labelledby={`content-feedback-${storyId}`}>
    <div><h2 id={`content-feedback-${storyId}`}>Was this {contentLabel} useful?</h2><p>Your anonymous feedback helps us make future WildNews briefings more useful.</p></div>
    <div className="content-feedback-actions">
      <button type="button" className={choice === 'positive' ? 'selected' : ''} aria-label={`Yes, this ${contentLabel} was useful`} title="Useful" aria-pressed={choice === 'positive'} onClick={() => submit('positive')}><ThumbsUp aria-hidden="true" /></button>
      <button type="button" className={choice === 'negative' ? 'selected' : ''} aria-label={`No, this ${contentLabel} was not useful`} title="Not useful" aria-pressed={choice === 'negative'} onClick={() => submit('negative')}><ThumbsDown aria-hidden="true" /></button>
    </div>
  </section>;
}
