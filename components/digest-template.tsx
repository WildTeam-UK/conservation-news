import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { DigestContent, DigestSourceStory } from '@/lib/digests';

function longDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(new Date(value));
}

export function DigestTemplate({ content, stories, periodEnd, imageUrl, imageAlt }: { content: DigestContent; stories: DigestSourceStory[]; periodEnd: string; imageUrl?: string | null; imageAlt?: string | null }) {
  const storyByReference = new Map(stories.map((story, index) => [`story-${index + 1}`, story]));
  const imageCredit = stories[0]?.image_credit;
  return <article className={`digest-article digest-${content.digest_type}`}>
    <header className="digest-public-hero shell">
      <div className="digest-edition-label"><CalendarDays /> {content.edition_label}</div>
      <h1>{content.headline}</h1>
      <p>{content.standfirst}</p>
      <time dateTime={periodEnd}>{longDate(periodEnd)}</time>
    </header>
    {imageUrl ? <figure className="digest-lead-image">{/* oxlint-disable-next-line next/no-img-element */}<img src={imageUrl} alt={imageAlt ?? ''} />{imageCredit ? <figcaption><span>Illustrative image</span> by {imageCredit.creator_url ? <a href={imageCredit.creator_url} target="_blank" rel="noreferrer">{imageCredit.creator_name}</a> : imageCredit.creator_name}{imageCredit.licence_name ? <> | {imageCredit.licence_url ? <a href={imageCredit.licence_url} target="_blank" rel="noreferrer">{imageCredit.licence_name}</a> : imageCredit.licence_name}</> : null}</figcaption> : null}</figure> : null}
    <div className="digest-reading-layout shell">
      <div className="digest-reading-column">
        <section className="digest-introduction">{content.introduction.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>
        {content.sections.map((section, index) => {
          const referenced = section.story_ids.flatMap((id) => storyByReference.get(id) ?? []);
          return <section className="digest-editorial-section" key={`${section.heading}-${index}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
            {referenced.length ? <div className="digest-section-links"><small>Stories in this section</small>{referenced.map((story) => <Link href={`/stories/${story.slug}`} key={story.id}>{story.headline} <ArrowRight /></Link>)}</div> : null}
          </section>;
        })}
        <section className="digest-watch-list"><p className="eyebrow">What to watch</p><h2>The next developments</h2><ol>{content.what_to_watch.map((item, index) => <li key={index}>{item}</li>)}</ol></section>
        <p className="digest-closing-note">{content.closing_note}</p>
      </div>
      <aside className="digest-story-index"><p className="eyebrow">This edition</p><h2>{stories.length} stories, connected</h2><p>The reporting behind this digest remains available in full.</p><div>{stories.map((story, index) => <Link href={`/stories/${story.slug}`} key={story.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{story.headline}</strong></Link>)}</div></aside>
    </div>
  </article>;
}

