import { Bird, Bug, Building2, CloudSun, Compass, Cpu, Droplets, Fish, Flame, HandHeart, Landmark, Layers3, Leaf, Lightbulb, Map, Mountain, PawPrint, RotateCcw, ShieldAlert, Sprout, Trees, Users, Waves, Wheat } from 'lucide-react';
import { createElement } from 'react';
import { topicSlug } from '@/lib/stories';

export const iconForTopic = (topic: string) => {
  if (['Oceans', 'Oceans & Coasts', 'Coasts', 'Kelp', 'Coral reefs', 'Fisheries'].includes(topic)) return Waves;
  if (['Freshwater', 'Wetlands'].includes(topic)) return Droplets;
  if (['Fish', 'Fisheries'].includes(topic)) return Fish;
  if (topic === 'Birds') return Bird;
  if (['Wildlife', 'Rewilding'].includes(topic)) return PawPrint;
  if (topic === 'Forests') return Trees;
  if (topic === 'Plants') return Sprout;
  if (topic === 'Soil') return Layers3;
  if (topic === 'Grasslands' || topic === 'Agriculture') return Wheat;
  if (topic === 'Pollinators') return Bug;
  if (['Land & climate', 'Land & Food', 'Mountains'].includes(topic)) return Mountain;
  if (topic === 'Land use' || topic === 'Islands') return Map;
  if (topic === 'Climate' || topic === 'Adaptation') return CloudSun;
  if (topic === 'Restoration') return RotateCcw;
  if (topic === 'Wildfire') return Flame;
  if (topic === 'Communities' || topic === 'People & Communities') return Users;
  if (topic === 'Indigenous affairs') return HandHeart;
  if (topic === 'Tourism') return Compass;
  if (topic === 'Cities') return Building2;
  if (topic === 'Technology') return Cpu;
  if (topic === 'Crime') return ShieldAlert;
  if (topic === 'Policy' || topic === 'Policy & Governance') return Landmark;
  if (topic === 'Solutions' || topic === 'Conservation Practice') return Lightbulb;
  return Leaf;
};

export function TopicTag({ topic, className = '', tabIndex }: { topic: string; className?: string; tabIndex?: number }) {
  const Icon = iconForTopic(topic);
  return <a className={`topic-tag editorial-pill ${className}`.trim()} href={`/topics/${topicSlug(topic)}`} draggable={false} tabIndex={tabIndex}><span className="editorial-pill-icon" aria-hidden="true">{createElement(Icon)}</span><span className="editorial-pill-label">{topic}</span></a>;
}
