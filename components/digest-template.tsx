/* oxlint-disable next/no-html-link-for-pages -- full page loads avoid unreliable Vinext client navigation on dynamic public routes */
import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { DigestHeroImage } from '@/components/digest-hero-image';
import { EditorialImageCredit } from '@/components/editorial-image-credit';
import { cleanDigestText, type DigestContent, type DigestSourceStory, type DigestStoryRecord } from '@/lib/digests';
import { FALLBACK_HERO_COLOUR } from '@/lib/images/colour';
import { NewsletterSignupForm, WeeklyDigestNewsletterCta } from '@/components/newsletter-cta';
import { SocialShare } from '@/components/social-share';
import { TopicTag } from '@/components/topic-tag';

function longDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(new Date(value));
}

const linkStopWords = new Set(['about', 'after', 'again', 'against', 'could', 'finds', 'first', 'further', 'into', 'over', 'report', 'reports', 'study', 'their', 'these', 'this', 'with']);

function legacyLinkRanges(text: string, referenced: DigestSourceStory[]) {
  const lowerText = text.toLocaleLowerCase('en-GB');
  const ranges: Array<{ start: number; end: number; story: DigestSourceStory }> = [];
  for (const story of referenced) {
    const words = story.headline.match(/[\p{L}\p{N}’'-]+/gu) ?? [];
    let match: { start: number; end: number } | null = null;
    for (let size = Math.min(5, words.length); size >= 1 && !match; size -= 1) {
      for (let index = 0; index <= words.length - size && !match; index += 1) {
        const phrase = words.slice(index, index + size).join(' ');
        if (size === 1 && (phrase.length < 7 || linkStopWords.has(phrase.toLocaleLowerCase('en-GB')))) continue;
        const start = lowerText.indexOf(phrase.toLocaleLowerCase('en-GB'));
        if (start >= 0 && !ranges.some((range) => start < range.end && start + phrase.length > range.start)) match = { start, end: start + phrase.length };
      }
    }
    if (match) ranges.push({ ...match, story });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function LinkedParagraph({ text, stories, referenced = [] }: { text: string; stories: Map<string, DigestSourceStory>; referenced?: DigestSourceStory[] }) {
  const cleanText = cleanDigestText(text);
  const marker = /\[\[(story-[1-9][0-9]*)\|([^\]]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(cleanText)) !== null) {
    parts.push(cleanText.slice(cursor, match.index));
    const story = stories.get(match[1]);
    parts.push(story ? <a href={`/stories/${story.slug}`} key={`${match.index}-${match[1]}`}>{match[2]}</a> : match[2]);
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) {
    const ranges = legacyLinkRanges(cleanText, referenced);
    for (const range of ranges) {
      parts.push(cleanText.slice(cursor, range.start));
      parts.push(<a href={`/stories/${range.story.slug}`} key={`${range.start}-${range.story.id}`}>{cleanText.slice(range.start, range.end)}</a>);
      cursor = range.end;
    }
  }
  parts.push(cleanText.slice(cursor));
  return <p>{parts}</p>;
}

function MoreDailyDigests({ digests }: { digests: DigestStoryRecord[] }) {
  if (!digests.length) return null;
  return <section className="digest-more shell">
    <div className="section-heading"><h2>More daily digests</h2><p>Catch up on recent editions of the day in conservation.</p></div>
    <div className="digest-more-grid">{digests.map((digest) => {
      const date = digest.slug.replace('daily-digest-', '');
      return <article key={digest.id}>
        <a className="digest-more-image" href={`/daily-digest/${date}`}>{digest.image_url ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></> : null}</a>
        <time dateTime={digest.digest_period_end}>{longDate(digest.digest_period_end)}</time>
        <h3><a href={`/daily-digest/${date}`}>{cleanDigestText(digest.headline)}</a></h3>
      </article>;
    })}</div>
  </section>;
}

function DigestSources({ stories }: { stories: DigestSourceStory[] }) {
  const uniqueStories = [...new Map(stories.map((story) => [story.id, story])).values()];
  if (!uniqueStories.length) return null;
  return <section className="digest-source-list">
    <p className="eyebrow">Source articles</p>
    <h2>Stories used in this digest</h2>
    <ul>{uniqueStories.map((story, index) => <li key={story.id}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <a href={`/stories/${story.slug}`}>{cleanDigestText(story.headline)} <ArrowRight /></a>
    </li>)}</ul>
  </section>;
}

function InlineDigestNewsletter() {
  return <aside className="digest-inline-newsletter">
    <div><p className="eyebrow">WILDNEWS WEEKLY DIGEST</p><h3>One clear conservation briefing, every Friday.</h3></div>
    <NewsletterSignupForm id="digest-email-inline" />
  </aside>;
}

function WildTeamTrainingBanner() {
  return <aside className="digest-training-cta">
    <div>
      <p className="eyebrow">Turn knowledge into action</p>
      <h2>Build the skills to make conservation happen.</h2>
      <p>Practical, accessible training for people protecting nature around the world.</p>
    </div>
    <a href="https://training.wildteam.org.uk/">Explore WildTeam training <ArrowRight /></a>
  </aside>;
}

export function DigestTemplate({ content, stories, periodEnd, imageUrl, imageAlt, moreDigests = [], sharePath }: { content: DigestContent; stories: DigestSourceStory[]; periodEnd: string; imageUrl?: string | null; imageAlt?: string | null; moreDigests?: DigestStoryRecord[]; sharePath?: string }) {
  const storyByReference = new Map(stories.map((story, index) => [`story-${index + 1}`, story]));
  const heroStory = stories.find((story) => story.image_url === imageUrl) ?? stories.find((story) => story.image_url) ?? stories[0];
  const resolvedImageUrl = imageUrl ?? heroStory?.image_url ?? null;
  const resolvedImageAlt = imageAlt ?? heroStory?.image_alt ?? '';
  const sourceTopics = stories.flatMap((story) => story.topics ?? []);
  const displayTopics = (content.topics?.length ? content.topics : [...new Set(sourceTopics)]).slice(0, 3);
  const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(periodEnd));
  const recentDailyDigests = content.digest_type === 'daily' ? moreDigests.filter((digest) => digest.slug !== `daily-digest-${currentDate}`).slice(0, 3) : [];
  const referencedStories = [...new Set(content.sections.flatMap((section) => section.story_ids ?? []))].flatMap((id) => storyByReference.get(id) ?? []);
  const usedImages = new Set(resolvedImageUrl ? [resolvedImageUrl] : []);
  const heroColourTargetId = `digest-hero-colour-${content.digest_type}-${currentDate}`;

  return <article className={`digest-article digest-${content.digest_type}`}>
    <header className="digest-public-hero">
      <div className="digest-hero-copy" id={heroColourTargetId} style={{ backgroundColor: FALLBACK_HERO_COLOUR }}>
        <div className="digest-hero-meta"><time dateTime={periodEnd}>{longDate(periodEnd)}</time><span aria-hidden="true">·</span><span>WILDNEWS {content.digest_type === 'weekly' ? 'WEEKLY' : 'DAILY'}</span></div>
        <h1>{cleanDigestText(content.headline)}</h1>
        <p>{cleanDigestText(content.standfirst)}</p>
        <a className="digest-ai-link" href="/how-we-use-ai">Learn more about how we use AI <ArrowRight /></a>
      </div>
      {resolvedImageUrl ? <figure className="digest-lead-image"><DigestHeroImage src={resolvedImageUrl} alt={resolvedImageAlt} colourTargetId={heroColourTargetId} /><EditorialImageCredit credit={heroStory?.image_credit} className="digest-image-credit" /></figure> : null}
    </header>

    <div className="digest-article-body shell">
      <div className="digest-reading-column">
        {displayTopics.length ? <div className="digest-body-topics">{displayTopics.map((topic) => <TopicTag topic={topic} key={topic} />)}</div> : null}
        <div className="digest-introduction-layout">
          {sharePath ? <SocialShare path={sharePath} title={cleanDigestText(content.headline)} label="Share this digest" /> : null}
          <section className="digest-introduction">{content.introduction.map((paragraph, index) => <LinkedParagraph text={paragraph} stories={storyByReference} key={index} />)}</section>
        </div>
        {content.sections.map((section, index) => {
          const referenced = section.story_ids.flatMap((id) => storyByReference.get(id) ?? []);
          const sectionImage = referenced.find((story) => story.image_url && !usedImages.has(story.image_url));
          if (sectionImage?.image_url) usedImages.add(sectionImage.image_url);
          return <section className="digest-editorial-section" key={`${section.heading}-${index}`}>
            <h2>{cleanDigestText(section.heading)}</h2>
            {sectionImage ? <figure className="digest-section-image">{/* oxlint-disable-next-line next/no-img-element */}<img src={sectionImage.image_url!} alt={sectionImage.image_alt ?? ''} /><EditorialImageCredit credit={sectionImage.image_credit} className="digest-image-credit" /></figure> : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => <Fragment key={paragraphIndex}><LinkedParagraph text={paragraph} stories={storyByReference} referenced={referenced} />{index === 1 && paragraphIndex === 0 ? <InlineDigestNewsletter /> : null}</Fragment>)}
          </section>;
        })}
        <DigestSources stories={referencedStories.length ? referencedStories : stories} />
      </div>

      <WildTeamTrainingBanner />
      <WeeklyDigestNewsletterCta id="digest-email" />
    </div>

    <MoreDailyDigests digests={recentDailyDigests} />
  </article>;
}
