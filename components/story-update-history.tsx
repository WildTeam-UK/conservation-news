'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function StoryUpdateHistory({ children, publishedDate, updatedDate }: { children: ReactNode; publishedDate: string; updatedDate: string }) {
  const [open, setOpen] = useState(false);
  const timelineId = useId();

  return <div className="story-update-history">
    <p className="story-update-dates">First published {publishedDate}. Updated {updatedDate}.</p>
    <button className="story-update-action" type="button" aria-expanded={open} aria-controls={timelineId} onClick={() => setOpen((current) => !current)}>
      See what&apos;s changed <ChevronDown aria-hidden="true" />
    </button>
    <div className="story-update-timeline" id={timelineId} hidden={!open}>{children}</div>
  </div>;
}
