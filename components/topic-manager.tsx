'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, Pencil, Sparkles } from 'lucide-react';

export type EditorialTopic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  meta_description: string | null;
  seo_generated_at: string | null;
  storyCount: number;
};

function TopicCard({ topic }: { topic: EditorialTopic }) {
  const router = useRouter();
  const [description, setDescription] = useState(topic.description ?? '');
  const [seoTitle, setSeoTitle] = useState(topic.seo_title ?? '');
  const [metaDescription, setMetaDescription] = useState(topic.meta_description ?? '');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, seoTitle, metaDescription }) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'The topic could not be saved.');
      setMessage('Topic saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The topic could not be saved.'); }
    finally { setWorking(false); }
  }

  const complete = Boolean(topic.description && topic.seo_title && topic.meta_description);
  return <article className="topic-editor-card">
    <div className="topic-editor-heading"><span>{complete ? <Check /> : <Sparkles />}</span><div><p className="eyebrow">/{topic.slug}</p><h2>{topic.name}</h2><p>{topic.storyCount} published {topic.storyCount === 1 ? 'article' : 'articles'} · {complete ? 'SEO ready' : 'Waiting for generated copy'}</p></div></div>
    <form onSubmit={save}>
      <label><span>Archive introduction</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Useful on-page description" required /></label>
      <label><span>SEO title</span><input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={120} required /><small>{seoTitle.length}/60 recommended</small></label>
      <label><span>Meta description</span><textarea rows={2} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} maxLength={200} required /><small>{metaDescription.length}/160 recommended</small></label>
      <button type="submit" disabled={working}>{working ? <LoaderCircle className="admin-spinner" /> : <Pencil />} Save topic</button>
      {message ? <output>{message}</output> : null}
    </form>
  </article>;
}

export function TopicManager({ topics }: { topics: EditorialTopic[] }) {
  return <section className="topic-manager" aria-label="Topic archive settings"><div className="topic-review-list">{topics.map((topic) => <TopicCard topic={topic} key={topic.id} />)}</div></section>;
}
