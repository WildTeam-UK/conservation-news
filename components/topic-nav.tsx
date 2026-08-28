'use client';

import { useEffect, useRef } from 'react';
import { TopicTag } from '@/components/topic-tag';

export function TopicNav({ topics }: { topics: string[] }) {
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, position: 0 });

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

    const animate = (time: number) => {
      const groupWidth = groupRef.current?.offsetWidth ?? 0;
      const nav = navRef.current;
      const shouldPause = draggingRef.current || nav?.matches(':hover, :focus-within');

      if (!shouldPause && groupWidth) {
        positionRef.current = (positionRef.current + ((time - previousTime) * 0.018)) % groupWidth;
      }
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-positionRef.current}px, 0, 0)`;
      previousTime = time;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const wrapPosition = (position: number) => {
    const groupWidth = groupRef.current?.offsetWidth ?? 0;
    if (!groupWidth) return position;
    return ((position % groupWidth) + groupWidth) % groupWidth;
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.classList.remove('is-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <nav
    ref={navRef}
    className="topic-nav"
    aria-label="Conservation topics"
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      draggingRef.current = true;
      movedRef.current = false;
      pointerStartRef.current = { x: event.clientX, position: positionRef.current };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('is-dragging');
    }}
    onPointerMove={(event) => {
      if (!draggingRef.current) return;
      const distance = event.clientX - pointerStartRef.current.x;
      if (Math.abs(distance) > 4) movedRef.current = true;
      positionRef.current = wrapPosition(pointerStartRef.current.position - distance);
    }}
    onPointerUp={endDrag}
    onPointerCancel={endDrag}
    onClickCapture={(event) => {
      if (movedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        movedRef.current = false;
      }
    }}
    onWheel={(event) => {
      const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
      if (!movement) return;
      event.preventDefault();
      positionRef.current = wrapPosition(positionRef.current + movement * 1.35);
    }}
  >
    <div className="topic-ticker-track" ref={trackRef}>
      <div className="topic-ticker-group" ref={groupRef}>
        {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" />)}
      </div>
      <div className="topic-ticker-group" aria-hidden="true">
        {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" tabIndex={-1} />)}
      </div>
    </div>
  </nav>;
}
