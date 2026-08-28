'use client';

import { useRef } from 'react';
import { TopicTag } from '@/components/topic-tag';

export function TopicNav({ topics }: { topics: string[] }) {
  const navRef = useRef<HTMLElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  return <nav
    ref={navRef}
    className="topic-nav"
    aria-label="Conservation topics"
    onPointerDown={(event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag.current = { active: true, moved: false, startX: event.clientX, startScroll: event.currentTarget.scrollLeft };
    }}
    onPointerMove={(event) => {
      if (!drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) > 4 && !drag.current.moved) {
        drag.current.moved = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.currentTarget.scrollLeft = drag.current.startScroll - distance;
    }}
    onPointerUp={(event) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current.active = false; }}
    onClickCapture={(event) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }}
  >
    {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" />)}
  </nav>;
}
