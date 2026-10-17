import { TopicNav } from '@/components/topic-nav';
import { getPublishedStories, publishedTopics } from '@/lib/published-stories';
import { EDITORIAL_TOPICS } from '@/lib/taxonomy';

export async function AllTopicsNav() {
  const published = await getPublishedStories(200);
  const populatedTopics = [...new Set(published.flatMap(publishedTopics))];
  const navigationTopics = EDITORIAL_TOPICS.filter((topic) => populatedTopics.includes(topic));

  if (!navigationTopics.length) return null;
  return <div className="topic-nav-shell shell"><TopicNav topics={navigationTopics} /></div>;
}
