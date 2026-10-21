'use client';

import { useEffect, useRef, useState } from 'react';
import { TopicTag } from '@/components/topic-tag';

export function TopicNav({ topics }: { topics: string[] }) {
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, position: 0 });
  const [groupCount, setGroupCount] = useState(2);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const animate = (time: number) => {
      const groupWidth = groupRef.current?.offsetWidth ?? 0;
      const nav = navRef.current;
      const shouldPause =
        reducedMotion.matches ||
        draggingRef.current ||
        nav?.matches(':hover, :focus-within');

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

  useEffect(() => {
    const nav = navRef.current;
    const group = groupRef.current;
    if (!nav || !group) return;

    const ensureContinuousTrack = () => {
      const groupWidth = group.offsetWidth;
      if (!groupWidth) return;
      setGroupCount(Math.max(2, Math.ceil(nav.clientWidth / groupWidth) + 2));
    };
    const observer = new ResizeObserver(ensureContinuousTrack);
    observer.observe(nav);
    observer.observe(group);
    ensureContinuousTrack();
    return () => observer.disconnect();
  }, [topics]);

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
    }}
    onPointerMove={(event) => {
      if (!draggingRef.current) return;
      const distance = event.clientX - pointerStartRef.current.x;
      if (Math.abs(distance) > 4 && !movedRef.current) {
        movedRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.classList.add('is-dragging');
      }
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
      {Array.from({ length: groupCount - 1 }, (_, groupIndex) => <div className="topic-ticker-group" aria-hidden="true" key={groupIndex}>
        {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" tabIndex={-1} />)}
      </div>)}
    </div>
  </nav>;
}
