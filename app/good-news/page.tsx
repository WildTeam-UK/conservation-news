/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic archive routes */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { InteriorHeader } from '@/components/interior-header';
import { WeeklyDigestNewsletterCta } from '@/components/newsletter-cta';
import { SiteFooter } from '@/components/site-footer';
import { TopicTag } from '@/components/topic-tag';
import { getGoodNewsSettings, getPublishedStories, publishedConservationOutlook, publishedStoryToListing } from '@/lib/published-stories';
import { cleanCopy, storyHref, storyImage } from '@/lib/stories';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Good conservation news | WILDNEWS', description: 'Evidence-led conservation stories showing clear, credible progress for nature and conservation practice.' };

export default async function GoodNewsPage() {
  const [published, settings] = await Promise.all([getPublishedStories(300), getGoodNewsSettings()]);
  const stories = published
    .filter((story) => story.content_type === 'news')
    .filter((story) => {
      const outlook = publishedConservationOutlook(story);
      return outlook?.classification === 'positive' && outlook.score >= settings.minimum_score && outlook.confidence >= settings.minimum_confidence;
    })
    .map(publishedStoryToListing);

  return <main className="archive-page good-news-page">
    <InteriorHeader />
    <section className="topic-page-hero shell">
      <span className="good-news-pill">Good News</span>
      <h1>Progress worth following.</h1>
      <p>Evidence-led conservation stories showing clear progress for nature and conservation practice. <Link href="/how-we-classify-good-news">See how WILDNEWS classifies good news.</Link></p>
      <span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
    </section>
    {stories.length ? <section className="topic-page-grid shell">
      {stories.map((story, index) => <article className={index === 0 ? 'topic-story topic-story-featured' : 'topic-story'} key={story.slug}>
        <a className="topic-story-image" href={storyHref(story)} aria-label={`Read: ${cleanCopy(story.title)}`}>{/* oxlint-disable-next-line next/no-img-element */}<img src={storyImage(story)} alt="" /></a>
        <div><TopicTag topic={story.topic} /><h2><a href={storyHref(story)}>{cleanCopy(story.title)}</a></h2><p>{cleanCopy(story.summary)}</p><a className="text-link" href={storyHref(story)}>Read story <ArrowRight /></a></div>
      </article>)}
    </section> : <section className="good-news-empty shell"><h2>The threshold is doing its job.</h2><p>No published story currently has enough evidence to qualify. New stories will appear here automatically when they meet the standard.</p></section>}
    <WeeklyDigestNewsletterCta id="good-news-digest-email" className="editorial-newsletter-cta shell" />
    <SiteFooter />
  </main>;
}
