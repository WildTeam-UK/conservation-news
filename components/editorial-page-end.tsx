import { NewsletterCta } from '@/components/newsletter-cta';
import { SimilarStories } from '@/components/similar-stories';
import { SiteFooter } from '@/components/site-footer';
import type { Story } from '@/lib/stories';

type EditorialPageEndProps = {
  newsletterId: string;
  stories: Story[];
  description?: string;
  newsletterAnchorId?: string;
};

export function EditorialPageEnd({ newsletterId, stories, description, newsletterAnchorId }: EditorialPageEndProps) {
  const newsletter = <NewsletterCta id={newsletterId} className="editorial-newsletter-cta shell" />;

  return <>
    {newsletterAnchorId ? <div id={newsletterAnchorId} className="archive-newsletter-anchor">{newsletter}</div> : newsletter}
    <SimilarStories stories={stories} description={description} />
    <SiteFooter />
  </>;
}
