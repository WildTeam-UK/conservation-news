import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cleanDigestText, type DigestContent, type DigestSourceStory, type DigestStoryRecord } from '@/lib/digests';
import type { EditorialImageCredit } from '@/lib/images/types';
import { TopicTag } from '@/components/topic-tag';

function longDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(new Date(value));
}

function ImageCreditText({ credit }: { credit: EditorialImageCredit }) {
  return <>
    Illustrative image by {credit.creator_url ? <a href={credit.creator_url} target="_blank" rel="noreferrer">{credit.creator_name}</a> : credit.creator_name}
    {credit.source_name ? <> on {credit.source_url ? <a href={credit.source_url} target="_blank" rel="noreferrer">{credit.source_name}</a> : credit.source_name}</> : null}
    {credit.licence_name ? <> | {credit.licence_url ? <a href={credit.licence_url} target="_blank" rel="noreferrer">{credit.licence_name}</a> : credit.licence_name}</> : null}
  </>;
}

function ImageCredit({ credit }: { credit?: EditorialImageCredit | null }) {
  if (!credit) return null;
  return <figcaption className="digest-image-credit"><ImageCreditText credit={credit} /></figcaption>;
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
    parts.push(story ? <Link href={`/stories/${story.slug}`} key={`${match.index}-${match[1]}`}>{match[2]}</Link> : match[2]);
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) {
    const ranges = legacyLinkRanges(cleanText, referenced);
    for (const range of ranges) {
      parts.push(cleanText.slice(cursor, range.start));
      parts.push(<Link href={`/stories/${range.story.slug}`} key={`${range.start}-${range.story.id}`}>{cleanText.slice(range.start, range.end)}</Link>);
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
        <Link className="digest-more-image" href={`/daily-digest/${date}`}>{digest.image_url ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={digest.image_url} alt={digest.image_alt ?? ''} /></> : null}</Link>
        <time dateTime={digest.digest_period_end}>{longDate(digest.digest_period_end)}</time>
        <h3><Link href={`/daily-digest/${date}`}>{cleanDigestText(digest.headline)}</Link></h3>
      </article>;
    })}</div>
  </section>;
}

export function DigestTemplate({ content, stories, periodEnd, imageUrl, imageAlt, moreDigests = [] }: { content: DigestContent; stories: DigestSourceStory[]; periodEnd: string; imageUrl?: string | null; imageAlt?: string | null; moreDigests?: DigestStoryRecord[] }) {
  const storyByReference = new Map(stories.map((story, index) => [`story-${index + 1}`, story]));
  const heroStory = stories.find((story) => story.image_url === imageUrl) ?? stories.find((story) => story.image_url) ?? stories[0];
  const resolvedImageUrl = imageUrl ?? heroStory?.image_url ?? null;
  const resolvedImageAlt = imageAlt ?? heroStory?.image_alt ?? '';
  const sourceTopics = stories.flatMap((story) => story.topics ?? []);
  const displayTopics = (content.topics?.length ? content.topics : [...new Set(sourceTopics)]).slice(0, 3);
  const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(periodEnd));
  const recentDailyDigests = content.digest_type === 'daily' ? moreDigests.filter((digest) => digest.slug !== `daily-digest-${currentDate}`).slice(0, 3) : [];
  const usedImages = new Set(resolvedImageUrl ? [resolvedImageUrl] : []);

  return <article className={`digest-article digest-${content.digest_type}`}>
    <header className="digest-public-hero">
      <div className="digest-hero-copy">
        <time dateTime={periodEnd}>{longDate(periodEnd)}</time>
        <h1>{cleanDigestText(content.headline)}</h1>
        <p>{cleanDigestText(content.standfirst)}</p>
        <Link className="digest-ai-link" href="/how-we-use-ai">Learn more about how we use AI <ArrowRight /></Link>
      </div>
      {resolvedImageUrl ? <figure className="digest-lead-image">{/* oxlint-disable-next-line next/no-img-element */}<img src={resolvedImageUrl} alt={resolvedImageAlt} /><ImageCredit credit={heroStory?.image_credit} /></figure> : null}
    </header>

    <div className="digest-article-body shell">
      <div className="digest-reading-column">
        {displayTopics.length ? <div className="digest-body-topics">{displayTopics.map((topic) => <TopicTag topic={topic} key={topic} />)}</div> : null}
        <section className="digest-introduction">{content.introduction.map((paragraph, index) => <LinkedParagraph text={paragraph} stories={storyByReference} key={index} />)}</section>
        {content.sections.map((section, index) => {
          const referenced = section.story_ids.flatMap((id) => storyByReference.get(id) ?? []);
          const sectionImage = referenced.find((story) => story.image_url && !usedImages.has(story.image_url));
          if (sectionImage?.image_url) usedImages.add(sectionImage.image_url);
          return <section className="digest-editorial-section" key={`${section.heading}-${index}`}>
            <h2>{cleanDigestText(section.heading)}</h2>
            {sectionImage ? <figure className="digest-section-image">{/* oxlint-disable-next-line next/no-img-element */}<img src={sectionImage.image_url!} alt={sectionImage.image_alt ?? ''} /><ImageCredit credit={sectionImage.image_credit} /></figure> : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => <LinkedParagraph text={paragraph} stories={storyByReference} referenced={referenced} key={paragraphIndex} />)}
          </section>;
        })}
      </div>

      <section className="digest-watch-list"><p className="eyebrow">What to watch</p><h2>The next developments</h2><ol>{content.what_to_watch.map((item, index) => <li key={index}>{cleanDigestText(item)}</li>)}</ol></section>
      <section className="digest-newsletter-cta">
        <div><p className="eyebrow">WILDNEWS WEEKLY DIGEST</p><h2>Stay across the week in conservation.</h2><p>Get the essential stories, context and developments in one clear briefing every Friday.</p></div>
        <form><label htmlFor="digest-email">Your email address</label><div><input id="digest-email" type="email" placeholder="you@example.com" required /><button type="submit">Sign me up <ArrowRight /></button></div></form>
      </section>
    </div>

    <MoreDailyDigests digests={recentDailyDigests} />
  </article>;
}
