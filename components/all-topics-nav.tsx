import { TopicNav } from '@/components/topic-nav';
import { getPublishedStories, publishedTopics } from '@/lib/published-stories';

const primaryTopics = ['Wildlife', 'Oceans', 'Forests', 'Freshwater', 'Land & climate'];

export async function AllTopicsNav() {
  const published = await getPublishedStories(200);
  const populatedTopics = [...new Set(published.flatMap(publishedTopics))];
  const navigationTopics = [
    ...primaryTopics.filter((topic) => populatedTopics.includes(topic)),
    ...populatedTopics.filter((topic) => !primaryTopics.includes(topic)).sort((a, b) => a.localeCompare(b)),
  ];

  if (!navigationTopics.length) return null;
  return <div className="topic-nav-shell shell"><TopicNav topics={navigationTopics} /></div>;
}
