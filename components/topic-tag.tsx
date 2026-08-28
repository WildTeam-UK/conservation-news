import { Bird, Bug, Building2, CloudSun, Compass, Cpu, Droplets, Fish, Flame, HandHeart, Landmark, Layers3, Leaf, Lightbulb, Map, Mountain, PawPrint, RotateCcw, ShieldAlert, Sprout, Trees, Users, Waves, Wheat } from 'lucide-react';
import { topicSlug } from '@/lib/stories';

export const iconForTopic = (topic: string) => {
  if (['Oceans', 'Coasts', 'Kelp', 'Coral reefs', 'Fisheries'].includes(topic)) return Waves;
  if (['Freshwater', 'Wetlands'].includes(topic)) return Droplets;
  if (['Fish', 'Fisheries'].includes(topic)) return Fish;
  if (topic === 'Birds') return Bird;
  if (['Wildlife', 'Rewilding'].includes(topic)) return PawPrint;
  if (topic === 'Forests') return Trees;
  if (topic === 'Plants') return Sprout;
  if (topic === 'Soil') return Layers3;
  if (topic === 'Grasslands' || topic === 'Agriculture') return Wheat;
  if (topic === 'Pollinators') return Bug;
  if (['Land & climate', 'Mountains'].includes(topic)) return Mountain;
  if (topic === 'Land use' || topic === 'Islands') return Map;
  if (topic === 'Climate' || topic === 'Adaptation') return CloudSun;
  if (topic === 'Restoration') return RotateCcw;
  if (topic === 'Wildfire') return Flame;
  if (topic === 'Communities') return Users;
  if (topic === 'Indigenous affairs') return HandHeart;
  if (topic === 'Tourism') return Compass;
  if (topic === 'Cities') return Building2;
  if (topic === 'Technology') return Cpu;
  if (topic === 'Crime') return ShieldAlert;
  if (topic === 'Policy') return Landmark;
  if (topic === 'Solutions') return Lightbulb;
  return Leaf;
};

export function TopicTag({ topic, className = '' }: { topic: string; className?: string }) {
  const Icon = iconForTopic(topic);
  return <a className={`topic-tag ${className}`.trim()} href={`/topics/${topicSlug(topic)}`} draggable={false}><Icon aria-hidden="true" /><span>{topic}</span></a>;
}
