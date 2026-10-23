/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { EditorialArchiveCard } from '@/components/editorial-archive-card';
import { EditorialPageEnd } from '@/components/editorial-page-end';
import { ArchiveHero } from '@/components/archive-hero';
import { InteriorHeader } from '@/components/interior-header';
import { TopicTag } from '@/components/topic-tag';
import { getGoodNewsSettings, getPublishedStories, publishedConservationOutlook, publishedStoryToListing, relatedPublishedStories } from '@/lib/published-stories';
import { cleanCopy, storyHref, storyImage } from '@/lib/stories';
import { GoodNewsBadge } from '@/components/good-news-badge';
import { InlineBrand } from '@/components/inline-brand';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = pageMetadata({ title: 'Good conservation news | WILDNEWS', description: 'Evidence-led conservation stories showing clear, credible progress for nature and conservation practice.', path: '/good-news-in-conservation' });

export default async function GoodNewsPage() {
  const [published, settings] = await Promise.all([getPublishedStories(300), getGoodNewsSettings()]);
  const goodNewsRecords = published
    .filter((story) => story.content_type === 'news')
    .filter((story) => {
      const outlook = publishedConservationOutlook(story);
      return outlook?.classification === 'positive' && outlook.score >= settings.minimum_score && outlook.confidence >= settings.minimum_confidence;
    });
  const stories = goodNewsRecords.map((story) => publishedStoryToListing(story, settings));
  const related = relatedPublishedStories(goodNewsRecords, published.filter((story) => story.content_type === 'news'))
    .map((story) => publishedStoryToListing(story, settings));

  return <main className="archive-page good-news-page">
    <InteriorHeader />
    <ArchiveHero
      label={<GoodNewsBadge />}
      title="Progress worth following."
      description="Conservation can be difficult work, so there is always room for some good news. Here you will find evidence-led stories showing clear progress for nature and conservation practice."
      descriptionLink={<a className="good-news-method-link" href="/how-we-classify-good-news">See how <InlineBrand text="WILDNEWS" /> classifies good news <ArrowRight /></a>}
      meta={`${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
    />
    {stories.length ? <section className="topic-page-grid shell">
      {stories.map((story, index) => <EditorialArchiveCard
        featured={index === 0}
        href={storyHref(story)}
        image={storyImage(story)}
        goodNews={story.goodNews}
        labels={<TopicTag topic={story.topic} />}
        title={cleanCopy(story.title)}
        summary={cleanCopy(story.summary)}
        linkLabel="Read story"
        key={story.slug}
      />)}
    </section> : <section className="good-news-empty shell"><h2>The threshold is doing its job.</h2><p>No published story currently has enough evidence to qualify. New stories will appear here automatically when they meet the standard.</p></section>}
    <EditorialPageEnd newsletterId="good-news-digest-email" stories={related} description="Keep exploring the latest conservation coverage." />
  </main>;
}
