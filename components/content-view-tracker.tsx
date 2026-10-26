'use client';

import { useEffect } from 'react';
import { recordContentInteraction } from '@/lib/content-interactions';

export function ContentViewTracker({ storyId }: { storyId: string }) {
  useEffect(() => {
    void recordContentInteraction({ storyId, eventType: 'view' });
  }, [storyId]);
  return null;
}
