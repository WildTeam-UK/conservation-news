'use client';

import { type SyntheticEvent, useMemo, useState } from 'react';
import { Check, LoaderCircle, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { ArticleTemplate, type ArticleTemplateData } from '@/components/article-template';
import type { DraftCoverageAnalysis, SourcedDraftText, StoryDraftContent } from '@/lib/openai/draft-story';

export type DraftSource = { id: string; title: string; publisher: string; url: string; source_type: string };

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

function SingleSourcedField({ label, item, sources, onChange }: { label: string; item: SourcedDraftText; sources: Map<string, DraftSource>; onChange: (item: SourcedDraftText) => void }) {
  return <SourcedFields label={label} items={[item]} sources={sources} onChange={(items) => items[0] && onChange(items[0])} />;
}

export function DraftEditor({ storyId, initialContent, sourceList, updatedAt }: { storyId: string; initialContent: StoryDraftContent; sourceList: DraftSource[]; updatedAt: string }) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const sources = useMemo(() => new Map(sourceList.map((source) => [source.id, source])), [sourceList]);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/drafts/${storyId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
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

  const setCoverage = (key: keyof DraftCoverageAnalysis, value: string) => {
    setContent((current) => ({ ...current, coverage_analysis: { ...current.coverage_analysis, [key]: Math.max(0, Math.min(100, Number(value) || 0)) } }));
  };

  async function recalculateCoverage() {
    setRecalculating(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/drafts/${storyId}/coverage`, { method: 'POST' });
      const result = await response.json() as { coverage?: DraftCoverageAnalysis; estimatedCostUsd?: number; error?: string };
      if (!response.ok || !result.coverage) {
        setFailed(true);
        setMessage(result.error ?? 'Coverage analysis could not be recalculated.');
      } else {
        setContent((current) => ({ ...current, coverage_analysis: result.coverage! }));
        setMessage(`Coverage recalculated from the research pack. Estimated model cost $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`);
      }
    } catch {
      setFailed(true);
      setMessage('Coverage analysis could not be recalculated.');
    } finally {
      setRecalculating(false);
    }
  }

  const article: ArticleTemplateData = {
    topics: content.topics,
    headline: content.headline,
    storyAtAGlance: content.story_at_a_glance.map((item) => item.text),
    imageUrl: content.image_url,
    imageAlt: content.image_alt,
    byline: content.byline,
    updatedAt,
    keyTakeaways: content.key_takeaways.map((item) => item.text),
    whyItMatters: content.why_it_matters.text,
    whatHappensNext: content.what_happens_next.text,
    whatWeKnow: content.what_we_know.map((item) => item.text),
    whatWeDontKnow: content.what_we_dont_know.map((item) => item.text),
    sources: sourceList.map((source, index) => ({ name: source.publisher, title: source.title, url: source.url, primary: index === 0 || source.source_type === 'primary' })),
    coverage: {
      ecological: content.coverage_analysis.ecological,
      evidence: content.coverage_analysis.evidence,
      consensus: content.coverage_analysis.consensus,
    },
  };
  const coverageLooksUncalibrated = [content.coverage_analysis.ecological, content.coverage_analysis.evidence, content.coverage_analysis.consensus].every((score) => score <= 1);

  return <>
    <form className="draft-editor" onSubmit={save}>
      <div className="draft-editor-heading"><div><p className="eyebrow">The shared article template</p><h2>Review the generated copy</h2><p>These fields now map directly to the public article design. Source numbers remain attached in the editor while you check each factual claim.</p></div><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="admin-spinner" /> Saving</> : <><Save /> Save draft</>}</button></div>
      {message ? <output className={failed ? 'draft-save-message failed' : 'draft-save-message'}>{failed ? null : <Check />}{message}</output> : null}

      <section className="draft-edit-section"><h3>Article identity</h3>
        <label><span>Topics, separated by commas</span><input value={content.topics.join(', ')} onChange={(event) => setContent({ ...content, topics: event.target.value.split(',').map((topic) => topic.trim()).filter(Boolean).slice(0, 4) })} required /></label>
        <label><span>Headline</span><input value={content.headline} onChange={(event) => setContent({ ...content, headline: event.target.value })} maxLength={180} required /></label>
        <label><span>Standfirst for listings and search</span><textarea value={content.standfirst} onChange={(event) => setContent({ ...content, standfirst: event.target.value })} rows={3} maxLength={400} required /></label>
        <label><span>Curator byline</span><input value={content.byline} onChange={(event) => setContent({ ...content, byline: event.target.value })} maxLength={120} /></label>
        <label><span>Lead image URL</span><input type="url" value={content.image_url} onChange={(event) => setContent({ ...content, image_url: event.target.value })} placeholder="Add once the image has been selected" /></label>
        <label><span>Lead image alternative text</span><input value={content.image_alt} onChange={(event) => setContent({ ...content, image_alt: event.target.value })} maxLength={300} /></label>
      </section>

      <section className="draft-edit-section"><h3>Article copy</h3>
        <SourcedFields label="The story at a glance — two paragraphs" items={content.story_at_a_glance} sources={sources} onChange={(story_at_a_glance) => setContent({ ...content, story_at_a_glance })} />
        <SourcedFields label="What you need to know — five points" items={content.key_takeaways} sources={sources} onChange={(key_takeaways) => setContent({ ...content, key_takeaways })} />
        <SingleSourcedField label="Why this matters" item={content.why_it_matters} sources={sources} onChange={(why_it_matters) => setContent({ ...content, why_it_matters })} />
        <SingleSourcedField label="What happens next" item={content.what_happens_next} sources={sources} onChange={(what_happens_next) => setContent({ ...content, what_happens_next })} />
        <SourcedFields label="What we know" items={content.what_we_know} sources={sources} onChange={(what_we_know) => setContent({ ...content, what_we_know })} />
        <SourcedFields label="What we don't know" items={content.what_we_dont_know} sources={sources} onChange={(what_we_dont_know) => setContent({ ...content, what_we_dont_know })} />
      </section>

      <section className="draft-edit-section"><div className="draft-section-heading"><div><h3>Coverage analysis</h3><p className="draft-section-note">These calibrated scores power both coverage panels in the article.</p></div><button className="admin-secondary-button" type="button" onClick={recalculateCoverage} disabled={recalculating}>{recalculating ? <><LoaderCircle className="admin-spinner" /> Recalculating</> : <><RotateCcw /> Recalculate coverage</>}</button></div><div className="draft-score-fields">
        {coverageLooksUncalibrated ? <p className="draft-coverage-warning">These scores came from the earlier decimal-conversion bug. Use “Recalculate coverage” before publishing.</p> : null}
        <label><span>Ecological</span><input type="number" min="0" max="100" value={content.coverage_analysis.ecological} onChange={(event) => setCoverage('ecological', event.target.value)} /></label>
        <label><span>Evidence-led</span><input type="number" min="0" max="100" value={content.coverage_analysis.evidence} onChange={(event) => setCoverage('evidence', event.target.value)} /></label>
        <label><span>Consensus</span><input type="number" min="0" max="100" value={content.coverage_analysis.consensus} onChange={(event) => setCoverage('consensus', event.target.value)} /></label>
      </div></section>

      <section className="draft-edit-section"><h3>Search preview</h3><label><span>SEO title</span><input value={content.seo_title} onChange={(event) => setContent({ ...content, seo_title: event.target.value })} maxLength={180} /></label><label><span>SEO description</span><textarea value={content.seo_description} onChange={(event) => setContent({ ...content, seo_description: event.target.value })} rows={3} maxLength={320} /></label></section>
    </form>

    <section className="draft-template-preview" aria-label="Private article preview">
      <div className="draft-preview-banner"><ShieldCheck /><span>Private preview using the live article template</span><strong>Not published</strong></div>
      <ArticleTemplate article={article} />
    </section>
  </>;
}
