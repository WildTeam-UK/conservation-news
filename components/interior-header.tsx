import { navigationTopics } from '@/components/all-topics-nav';
import { InteriorHeaderClient } from '@/components/interior-header-client';

export function InteriorHeader({ actionHref = '/#donate', actionLabel = 'Donate' }: { actionHref?: string; actionLabel?: string }) {
  return <InteriorHeaderClient topics={navigationTopics} actionHref={actionHref} actionLabel={actionLabel} />;
}
