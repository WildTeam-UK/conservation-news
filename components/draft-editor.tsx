'use client';

import { type SyntheticEvent, useMemo, useState } from 'react';
import { Check, ExternalLink, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import type { SourcedDraftText, StoryDraftContent } from '@/lib/openai/draft-story';

export type DraftSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  source_type: string;
};

function SourceReferences({ ids, sources }: { ids: string[]; sources: Map<string, DraftSource> }) {
  return <span className="draft-source-refs">{ids.map((id) => {
    const source = sources.get(id);
    return source ? <a href={source.url} target="_blank" rel="noreferrer" title={`${source.publisher}: ${source.title}`} key={id}>{id.replace('source-', '')}</a> : null;
  })}</span>;
}

function SourcedFields({ label, items, sources, onChange }: { label: string; items: SourcedDraftText[]; sources: Map<string, DraftSource>; onChange: (items: SourcedDraftText[]) => void }) {
  return <fieldset className="draft-fieldset"><legend>{label}</legend>{items.map((item, index) => <div className="draft-sourced-field" key={`${label}-${index}`}>
    <textarea value={item.text} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? { ...current, text: event.target.value } : current))} rows={3} />
    <div><span>Supporting sources</span><SourceReferences ids={item.source_ids} sources={sources} /></div>
  </div>)}</fieldset>;
}

export function DraftEditor({ storyId, initialContent, sourceList }: { storyId: string; initialContent: StoryDraftContent; sourceList: DraftSource[] }) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const sources = useMemo(() => new Map(sourceList.map((source) => [source.id, source])), [sourceList]);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/drafts/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) {
        setFailed(true);
        setMessage(result.error ?? 'The draft could not be saved.');
      } else {
        setMessage('Draft saved. It remains private and unpublished.');
      }
    } catch {
      setFailed(true);
      setMessage('The draft could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const setScore = (key: 'conservation_significance' | 'evidence_confidence' | 'practitioner_relevance', value: string) => {
    setContent((current) => ({ ...current, [key]: Math.max(0, Math.min(100, Number(value) || 0)) }));
  };

  return <>
    <form className="draft-editor" onSubmit={save}>
      <div className="draft-editor-heading"><div><p className="eyebrow">Editable article fields</p><h2>Review the generated copy</h2><p>Source numbers stay attached while you edit. If you materially change a factual claim, check that its sources still support it.</p></div><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="admin-spinner" /> Saving</> : <><Save /> Save draft</>}</button></div>
      {message ? <output className={failed ? 'draft-save-message failed' : 'draft-save-message'}>{failed ? null : <Check />}{message}</output> : null}

      <section className="draft-edit-section">
        <label><span>Headline</span><input value={content.headline} onChange={(event) => setContent({ ...content, headline: event.target.value })} maxLength={180} required /></label>
        <label><span>Standfirst</span><textarea value={content.standfirst} onChange={(event) => setContent({ ...content, standfirst: event.target.value })} rows={3} maxLength={400} required /></label>
        <SourcedFields label="Overview" items={content.overview} sources={sources} onChange={(overview) => setContent({ ...content, overview })} />
        <SourcedFields label="Key takeaways" items={content.key_takeaways} sources={sources} onChange={(key_takeaways) => setContent({ ...content, key_takeaways })} />
      </section>

      <section className="draft-edit-section"><h3>Article sections</h3>{content.body_sections.map((section, sectionIndex) => <fieldset className="draft-body-editor" key={`section-${sectionIndex}`}>
        <label><span>Section heading</span><input value={section.heading} onChange={(event) => setContent({ ...content, body_sections: content.body_sections.map((current, currentIndex) => currentIndex === sectionIndex ? { ...current, heading: event.target.value } : current) })} /></label>
        <SourcedFields label="Paragraphs" items={section.paragraphs} sources={sources} onChange={(paragraphs) => setContent({ ...content, body_sections: content.body_sections.map((current, currentIndex) => currentIndex === sectionIndex ? { ...current, paragraphs } : current) })} />
      </fieldset>)}</section>

      <section className="draft-edit-section">
        <SourcedFields label="Why this matters" items={[content.why_it_matters]} sources={sources} onChange={(items) => items[0] && setContent({ ...content, why_it_matters: items[0] })} />
        {content.agreed_points.length ? <SourcedFields label="Areas of agreement" items={content.agreed_points} sources={sources} onChange={(agreed_points) => setContent({ ...content, agreed_points })} /> : null}
        {content.disputed_points.length ? <SourcedFields label="Disputed or uncertain points" items={content.disputed_points} sources={sources} onChange={(disputed_points) => setContent({ ...content, disputed_points })} /> : null}
        <fieldset className="draft-fieldset"><legend>Open questions</legend>{content.open_questions.map((question, index) => <textarea value={question} onChange={(event) => setContent({ ...content, open_questions: content.open_questions.map((current, currentIndex) => currentIndex === index ? event.target.value : current) })} rows={2} key={`question-${index}`} />)}</fieldset>
      </section>

      <section className="draft-edit-section"><h3>Editorial scores</h3><div className="draft-score-fields">
        <label><span>Conservation significance</span><input type="number" min="0" max="100" value={content.conservation_significance} onChange={(event) => setScore('conservation_significance', event.target.value)} /></label>
        <label><span>Evidence confidence</span><input type="number" min="0" max="100" value={content.evidence_confidence} onChange={(event) => setScore('evidence_confidence', event.target.value)} /></label>
        <label><span>Practitioner relevance</span><input type="number" min="0" max="100" value={content.practitioner_relevance} onChange={(event) => setScore('practitioner_relevance', event.target.value)} /></label>
      </div></section>

      <section className="draft-edit-section"><h3>Search preview</h3><label><span>SEO title</span><input value={content.seo_title} onChange={(event) => setContent({ ...content, seo_title: event.target.value })} maxLength={180} /></label><label><span>SEO description</span><textarea value={content.seo_description} onChange={(event) => setContent({ ...content, seo_description: event.target.value })} rows={3} maxLength={320} /></label></section>
    </form>

    <section className="draft-preview" aria-labelledby="draft-preview-heading">
      <div className="draft-preview-banner"><ShieldCheck /><span>Private preview</span><strong>Not published</strong></div>
      <p className="eyebrow">Article preview</p><h2 id="draft-preview-heading">{content.headline}</h2><p className="draft-preview-standfirst">{content.standfirst}</p>
      <div className="draft-preview-copy">{content.overview.map((paragraph, index) => <p key={`preview-overview-${index}`}>{paragraph.text} <SourceReferences ids={paragraph.source_ids} sources={sources} /></p>)}</div>
      <section><h3>Key takeaways</h3><ul>{content.key_takeaways.map((item, index) => <li key={`preview-takeaway-${index}`}>{item.text} <SourceReferences ids={item.source_ids} sources={sources} /></li>)}</ul></section>
      {content.body_sections.map((section, sectionIndex) => <section key={`preview-section-${sectionIndex}`}><h3>{section.heading}</h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={`preview-paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph.text} <SourceReferences ids={paragraph.source_ids} sources={sources} /></p>)}</section>)}
      <section><h3>Why this matters</h3><p>{content.why_it_matters.text} <SourceReferences ids={content.why_it_matters.source_ids} sources={sources} /></p></section>
      {content.agreed_points.length ? <section><h3>What sources agree on</h3><ul>{content.agreed_points.map((item, index) => <li key={`preview-agreed-${index}`}>{item.text} <SourceReferences ids={item.source_ids} sources={sources} /></li>)}</ul></section> : null}
      {content.disputed_points.length ? <section><h3>What remains disputed or uncertain</h3><ul>{content.disputed_points.map((item, index) => <li key={`preview-disputed-${index}`}>{item.text} <SourceReferences ids={item.source_ids} sources={sources} /></li>)}</ul></section> : null}
      {content.open_questions.length ? <section><h3>Open questions</h3><ul>{content.open_questions.map((question, index) => <li key={`preview-question-${index}`}>{question}</li>)}</ul></section> : null}
      <section className="draft-preview-sources"><h3>Sources</h3>{sourceList.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.id.replace('source-', '')}</span><div><strong>{source.title}</strong><small>{source.publisher} · {source.source_type}</small></div><ExternalLink /></a>)}</section>
    </section>
  </>;
}
