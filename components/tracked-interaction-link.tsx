'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { recordContentInteraction, type ContentInteractionType } from '@/lib/content-interactions';

type TrackedInteractionLinkProps = ComponentProps<'a'> & {
  storyId: string;
  eventType: Extract<ContentInteractionType, 'outbound_source' | 'digest_story'>;
  relatedStoryId?: string;
  storySourceId?: string;
};

export function TrackedInteractionLink({ storyId, eventType, relatedStoryId, storySourceId, onClick, children, href, ...props }: TrackedInteractionLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) void recordContentInteraction({ storyId, eventType, relatedStoryId, storySourceId });
  }

  return <a {...props} href={href} onClick={handleClick}>{children}</a>;
}
