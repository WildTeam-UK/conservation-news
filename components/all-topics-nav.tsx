import { TopicNav } from '@/components/topic-nav';
import { allTopics } from '@/lib/stories';

const primaryTopics = ['Wildlife', 'Oceans', 'Forests', 'Freshwater', 'Land & climate'];
export const navigationTopics = [
  ...primaryTopics,
  ...allTopics.filter((topic) => !primaryTopics.includes(topic)).sort((a, b) => a.localeCompare(b)),
];

export function AllTopicsNav() {
  return <div className="topic-nav-shell shell"><TopicNav topics={navigationTopics} /></div>;
}
