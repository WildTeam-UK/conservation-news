'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/brand';
import { TopicNav } from '@/components/topic-nav';

type InteriorHeaderClientProps = {
  topics: string[];
  actionHref: string;
  actionLabel: string;
};

export function InteriorHeaderClient({ topics, actionHref, actionLabel }: InteriorHeaderClientProps) {
  const [showTopics, setShowTopics] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY < 24) setShowTopics(false);
        else if (currentScrollY < lastScrollY.current - 2) setShowTopics(true);
        else if (currentScrollY > lastScrollY.current + 2) setShowTopics(false);
        lastScrollY.current = currentScrollY;
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <header className={`interior-header${showTopics ? ' show-topics' : ''}`}>
    <div className="interior-header-row shell">
      <Brand />
      <nav className="primary-nav" aria-label="Main navigation">
        <a href="/about">About</a>
        <a href="https://training.wildteam.org.uk/courses" target="_blank" rel="noreferrer">Training</a>
        <a href="https://training.wildteam.org.uk/job-board" target="_blank" rel="noreferrer">Careers</a>
        <a href="/#newsletter">Newsletter</a>
      </nav>
      <a href={actionHref} className="donate-button">{actionLabel} <ArrowRight /></a>
    </div>
    <div className="interior-topic-drawer" aria-hidden={!showTopics} inert={!showTopics ? true : undefined}>
      <div className="topic-nav-shell shell"><TopicNav topics={topics} /></div>
    </div>
  </header>;
}
