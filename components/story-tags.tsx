import { DigestTag } from '@/components/digest-tag';
import { TopicTag } from '@/components/topic-tag';
import type { Story } from '@/lib/stories';

export function StoryTags({ story }: { story: Story }) {
  return <>{story.digestType ? <DigestTag type={story.digestType} /> : null}<TopicTag topic={story.topic} /></>;
}
