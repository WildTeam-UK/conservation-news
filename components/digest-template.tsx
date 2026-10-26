/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic public routes */
import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { ContextualLinkedText } from '@/components/contextual-linked-text';
import { EditorialImage } from '@/components/editorial-image';
import { EditorialImageCredit } from '@/components/editorial-image-credit';
import { cleanDigestText, type DigestContent, type DigestContextualLink, type DigestSourceStory, type DigestStoryRecord } from '@/lib/digests';
import { cleanArticleLinks, contextualLinkOccurrence, type ArticleContextualLink } from '@/lib/article-linking';
import { NewsletterCta } from '@/components/newsletter-cta';
import { SocialShare } from '@/components/social-share';
import { InlineBrand } from '@/components/inline-brand';
import { TopicTag } from '@/components/topic-tag';
import { TrainingBanner } from '@/components/training-banner';
import { DigestTag } from '@/components/digest-tag';
import { londonCalendarDateFormatter, londonLongDateFormatter } from '@/lib/date-format';
import { ContentFeedback } from '@/components/content-feedback';
import { ContentViewTracker } from '@/components/content-view-tracker';
import { TrackedInteractionLink } from '@/components/tracked-interaction-link';

function longDate(value: string) {
  return londonLongDateFormatter.format(new Date(value));
}

const linkStopWords = new Set(['about', 'after', 'again', 'against', 'could', 'finds', 'first', 'further', 'into', 'over', 'report', 'reports', 'study', 'their', 'these', 'this', 'with']);

function legacyLinkRanges(text: string, referenced: DigestSourceStory[]) {
  const ranges: Array<{ start: number; end: number; story: DigestSourceStory }> = [];
  for (const story of referenced) {
    const words = story.headline.match(/[\p{L}\p{N}’'-]+/gu) ?? [];
    let match: { start: number; end: number } | null = null;
    for (let size = Math.min(5, words.length); size >= 1 && !match; size -= 1) {
      for (let index = 0; index <= words.length - size && !match; index += 1) {
        const phrase = words.slice(index, index + size).join(' ');
        if (size === 1 && (phrase.length < 7 || linkStopWords.has(phrase.toLocaleLowerCase('en-GB')))) continue;
        const start = contextualLinkOccurrence(text, phrase);
        if (start >= 0 && !ranges.some((range) => start < range.end && start + phrase.length > range.start)) match = { start, end: start + phrase.length };
      }
    }
    if (match) ranges.push({ ...match, story });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function legacyMarkerLinks(text: string, stories: Map<string, DigestSourceStory>) {
  const marker = /\[\[(story-[1-9][0-9]*)\|([^\]]+)\]\]/g;
  const links: ArticleContextualLink[] = [];
  let plainText = '';
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(text)) !== null) {
    plainText += text.slice(cursor, match.index);
    let anchor = match[2];
    const suffix = text.slice(marker.lastIndex).match(/^[\p{L}\p{M}\p{N}_’'-]+/u)?.[0] ?? '';
    if (suffix) {
      anchor += suffix;
      marker.lastIndex += suffix.length;
    }
    const prefix = plainText.match(/[\p{L}\p{M}\p{N}_’'-]+$/u)?.[0] ?? '';
    const anchorStart = plainText.length - prefix.length;
    plainText += anchor;
    const story = stories.get(match[1]);
    if (story) links.push({
      type: 'article',
      target_id: story.id,
      href: `/stories/${story.slug}`,
      anchor_text: plainText.slice(anchorStart),
      external: false,
      confidence: 100,
      rationale: 'Legacy digest article reference.',
    });
    cursor = marker.lastIndex;
  }
  plainText += text.slice(cursor);
  return { text: plainText, links: cleanArticleLinks(plainText, links) };
}

function legacyInferredLinks(text: string, referenced: DigestSourceStory[]) {
  return cleanArticleLinks(text, legacyLinkRanges(text, referenced).map((range) => ({
    type: 'article' as const,
    target_id: range.story.id,
    href: `/stories/${range.story.slug}`,
    anchor_text: text.slice(range.start, range.end),
    external: false,
    confidence: 100,
    rationale: 'Legacy digest article reference.',
  })));
}

function LinkedParagraph({ text, links, stories, referenced = [], allowLegacy }: { text: string; links?: DigestContextualLink[]; stories: Map<string, DigestSourceStory>; referenced?: DigestSourceStory[]; allowLegacy: boolean }) {
  const cleanText = cleanDigestText(text);
  if (links?.length) return <p><ContextualLinkedText text={cleanText} links={links} /></p>;
  if (!allowLegacy) return <p>{cleanText}</p>;
  const marked = legacyMarkerLinks(cleanText, stories);
  const legacyLinks = marked.links.length ? marked.links : legacyInferredLinks(marked.text, referenced);
  return <p><ContextualLinkedText text={marked.text} links={legacyLinks} /></p>;
}

function MoreDailyDigests({ digests }: { digests: DigestStoryRecord[] }) {
  if (!digests.length) return null;
  return <section className="digest-more shell">
    <div className="section-heading"><h2>More daily digests</h2><p>Catch up on recent editions of the day in conservation.</p></div>
    <div className="digest-more-grid">{digests.map((digest) => {
      const date = digest.slug.replace('daily-digest-', '');
      return <article key={digest.id}>
        <a className="digest-more-image" href={`/daily-digest/${date}`} aria-label={`Read: ${cleanDigestText(digest.headline)}`}>{digest.image_url ? <EditorialImage src={digest.image_url} alt="" loading="lazy" decoding="async" /> : null}</a>
        <time dateTime={digest.digest_period_end}>{longDate(digest.digest_period_end)}</time>
        <h3><a href={`/daily-digest/${date}`}>{cleanDigestText(digest.headline)}</a></h3>
      </article>;
    })}</div>
  </section>;
}

function DigestSources({ stories, digestStoryId }: { stories: DigestSourceStory[]; digestStoryId?: string }) {
  const uniqueStories = [...new Map(stories.map((story) => [story.id, story])).values()];
  if (!uniqueStories.length) return null;
  return <section className="digest-source-list">
    <p className="eyebrow">Source articles</p>
    <h2>Stories used in this digest</h2>
    <ul>{uniqueStories.map((story, index) => <li key={story.id}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      {digestStoryId ? <TrackedInteractionLink href={`/stories/${story.slug}`} storyId={digestStoryId} relatedStoryId={story.id} eventType="digest_story">{cleanDigestText(story.headline)} <ArrowRight /></TrackedInteractionLink> : <a href={`/stories/${story.slug}`}>{cleanDigestText(story.headline)} <ArrowRight /></a>}
    </li>)}</ul>
  </section>;
}

export function DigestTemplate({ content, stories, storyId, periodEnd, imageUrl, imageAlt, moreDigests = [], sharePath }: { content: DigestContent; stories: DigestSourceStory[]; storyId?: string; periodEnd: string; imageUrl?: string | null; imageAlt?: string | null; moreDigests?: DigestStoryRecord[]; sharePath?: string }) {
  const storyByReference = new Map(stories.map((story, index) => [`story-${index + 1}`, story]));
  const matchingHeroStory = stories.find((story) => story.image_url === imageUrl);
  const heroStory = matchingHeroStory ?? stories.find((story) => story.image_url) ?? stories[0];
  const resolvedImageUrl = imageUrl ?? heroStory?.image_url ?? null;
  const resolvedImageAlt = imageAlt?.trim() || heroStory?.image_alt?.trim() || `Illustrative image for ${cleanDigestText(content.headline)}`;
  const heroImageCredit = content.image_credit ?? (heroStory?.image_url === resolvedImageUrl ? heroStory.image_credit : null);
  const sourceTopics = stories.flatMap((story) => story.topics ?? []);
  const displayTopics = (content.topics?.length ? content.topics : [...new Set(sourceTopics)]).slice(0, 3);
  const currentDate = londonCalendarDateFormatter.format(new Date(periodEnd));
  const recentDailyDigests = content.digest_type === 'daily' ? moreDigests.filter((digest) => digest.slug !== `daily-digest-${currentDate}`).slice(0, 6) : [];
  const referencedStories = [...new Set(content.sections.flatMap((section) => section.story_ids ?? []))].flatMap((id) => storyByReference.get(id) ?? []);
  const usedImages = new Set(resolvedImageUrl ? [resolvedImageUrl] : []);
  const allowLegacyLinks = content.template_version === 1;
  const linksFor = (sectionIndex: number, paragraphIndex: number) => content.contextual_links?.filter((link) => link.section_index === sectionIndex && link.paragraph_index === paragraphIndex);

  return <article className={`digest-article digest-${content.digest_type}`}>
    {storyId ? <ContentViewTracker storyId={storyId} /> : null}
    <header className="digest-public-hero">
      <div className="digest-hero-copy">
        <div className="digest-hero-content">
          <div className="digest-hero-meta"><time dateTime={periodEnd}>{longDate(periodEnd)}</time><span aria-hidden="true">·</span><span><InlineBrand text="WILDNEWS" /> {content.digest_type === 'weekly' ? 'WEEKLY' : 'DAILY'}</span></div>
          <h1>{cleanDigestText(content.headline)}</h1>
          <p>{cleanDigestText(content.standfirst)}</p>
          <a className="digest-ai-link" href="/how-we-use-ai">Learn more about how we use AI <ArrowRight /></a>
        </div>
      </div>
      {resolvedImageUrl ? <figure className="digest-lead-image"><EditorialImage src={resolvedImageUrl} alt={resolvedImageAlt} loading="eager" fetchPriority="high" decoding="async" /><EditorialImageCredit credit={heroImageCredit} /></figure> : null}
    </header>

    <div className="digest-article-body shell">
      <div className="digest-reading-column">
        <div className="digest-body-topics">
          <DigestTag type={content.digest_type} />
          {displayTopics.map((topic) => <TopicTag topic={topic} key={topic} />)}
        </div>
        <div className="digest-introduction-layout">
          {sharePath ? <SocialShare path={sharePath} title={cleanDigestText(content.headline)} storyId={storyId} label="Share this digest" /> : null}
          <section className="digest-introduction">{content.introduction.map((paragraph, index) => <LinkedParagraph text={paragraph} stories={storyByReference} allowLegacy={allowLegacyLinks} key={index} />)}</section>
        </div>
        {content.sections.map((section, index) => {
          const referenced = section.story_ids.flatMap((id) => storyByReference.get(id) ?? []);
          const sectionImage = referenced.find((story) => story.image_url && !usedImages.has(story.image_url));
          if (sectionImage?.image_url) usedImages.add(sectionImage.image_url);
          return <section className="digest-editorial-section" key={`${section.heading}-${index}`}>
            <h2>{cleanDigestText(section.heading)}</h2>
            {sectionImage ? <figure className="digest-section-image"><EditorialImage src={sectionImage.image_url!} alt={sectionImage.image_alt?.trim() || `Illustrative image for ${cleanDigestText(section.heading)}`} loading="lazy" decoding="async" /><EditorialImageCredit credit={sectionImage.image_credit} /></figure> : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => <Fragment key={paragraphIndex}><LinkedParagraph text={paragraph} links={linksFor(index, paragraphIndex)} stories={storyByReference} referenced={referenced} allowLegacy={allowLegacyLinks} />{index === 1 && paragraphIndex === 0 ? <NewsletterCta id="digest-email-inline" variant="streamlined" /> : null}</Fragment>)}
          </section>;
        })}
        <DigestSources stories={referencedStories.length ? referencedStories : stories} digestStoryId={storyId} />
        {storyId ? <ContentFeedback storyId={storyId} contentLabel="digest" /> : null}
      </div>

      <TrainingBanner />
      <NewsletterCta id="digest-email" />
    </div>

    <MoreDailyDigests digests={recentDailyDigests} />
  </article>;
}
