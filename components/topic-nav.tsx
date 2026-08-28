import { TopicTag } from '@/components/topic-tag';

export function TopicNav({ topics }: { topics: string[] }) {
  return <nav className="topic-nav" aria-label="Conservation topics">
    <div className="topic-ticker-track">
      <div className="topic-ticker-group">
        {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" />)}
      </div>
      <div className="topic-ticker-group" aria-hidden="true">
        {topics.map((topic) => <TopicTag topic={topic} key={topic} className="topic-nav-tag" tabIndex={-1} />)}
      </div>
    </div>
  </nav>;
}
