'use client';

import { useRef } from 'react';
import { Bird, Bug, Building2, CloudSun, Cpu, Droplets, Fish, Flame, Leaf, Map, Mountain, RotateCcw, Shell, Sprout, Trees, Users, Waves } from 'lucide-react';
import { topicSlug } from '@/lib/stories';

const iconForTopic = (topic: string) => {
  if (['Oceans', 'Coasts', 'Kelp', 'Coral reefs', 'Fisheries'].includes(topic)) return Waves;
  if (['Freshwater', 'Wetlands'].includes(topic)) return Droplets;
  if (topic === 'Fish') return Fish;
  if (['Wildlife', 'Birds', 'Rewilding'].includes(topic)) return Bird;
  if (['Forests', 'Plants', 'Soil'].includes(topic)) return Trees;
  if (['Grasslands', 'Pollinators'].includes(topic)) return topic === 'Pollinators' ? Bug : Sprout;
  if (['Land & climate', 'Mountains', 'Land use'].includes(topic)) return Mountain;
  if (topic === 'Climate' || topic === 'Adaptation') return CloudSun;
  if (topic === 'Restoration') return RotateCcw;
  if (topic === 'Wildfire') return Flame;
  if (['Communities', 'Indigenous affairs', 'Tourism'].includes(topic)) return Users;
  if (topic === 'Cities') return Building2;
  if (topic === 'Technology') return Cpu;
  if (topic === 'Islands') return Map;
  if (topic === 'Crime' || topic === 'Policy') return Shell;
  return Leaf;
};

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
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) > 4) drag.current.moved = true;
      event.currentTarget.scrollLeft = drag.current.startScroll - distance;
    }}
    onPointerUp={(event) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current.active = false; }}
    onClickCapture={(event) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }}
  >
    {topics.map((topic) => {
      const Icon = iconForTopic(topic);
      return <a href={`/topics/${topicSlug(topic)}`} key={topic} draggable={false}><Icon /><span>{topic}</span></a>;
    })}
  </nav>;
}
