'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, LoaderCircle, PauseCircle, PlayCircle, Save, ShieldCheck } from 'lucide-react';

type Props = {
  enabled: boolean;
  windowStart: string;
  windowEnd: string;
  dailyMaximum: number;
  minimumOverall: number;
  minimumEvidence: number;
};

export function PublicationSettings({ enabled, windowStart, windowEnd, dailyMaximum, minimumOverall, minimumEvidence }: Props) {
  const router = useRouter();
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(enabled);
  const [start, setStart] = useState(windowStart.slice(0, 5));
  const [end, setEnd] = useState(windowEnd.slice(0, 5));
  const [maximum, setMaximum] = useState(dailyMaximum);
  const [overall, setOverall] = useState(minimumOverall);
  const [evidence, setEvidence] = useState(minimumEvidence);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/publication-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoPublishEnabled,
          publishWindowStart: start,
          publishWindowEnd: end,
          maxAutoPublishesPerDay: maximum,
          minOverallScore: overall,
          minEvidenceScore: evidence,
        }),
      });
      const result = await response.json() as { saved?: boolean; warning?: string; error?: string; queue?: { queued?: number; held?: number; scheduled?: number } };
      if (!response.ok) throw new Error(result.error ?? 'Publishing settings could not be saved.');
      const queueNote = result.queue ? ` ${result.queue.scheduled ?? 0} articles are now scheduled and ${result.queue.held ?? 0} are held for review.` : '';
      setMessage(result.warning ?? (autoPublishEnabled ? `Automatic publishing is active from ${start} to ${end} UK time.${queueNote}` : 'Automatic publishing is paused. Existing queue times are preserved.'));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publishing settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const valid = start && end && end > start && maximum >= 1 && maximum <= 200 && overall >= 0 && overall <= 100 && evidence >= 0 && evidence <= 100;

  return (
    <details className="publication-settings-disclosure">
      <summary><span>{autoPublishEnabled ? <PlayCircle /> : <PauseCircle />}<span><strong>Publishing settings</strong><small>{autoPublishEnabled ? 'Automatic publishing active' : 'Automatic publishing paused'} · {start}–{end} · up to {maximum} per day</small></span></span><span>Edit settings</span></summary>
      <section className="publication-settings-panel" aria-labelledby="publication-settings-heading">
        <div className="publication-settings-intro">
          <p className="eyebrow">Automatic publishing</p>
          <h2 id="publication-settings-heading">Publishing schedule</h2>
          <p>Complete, sourced drafts above both quality thresholds are distributed across your publishing window. Overflow moves into later days.</p>
          <div className={`publication-mode ${autoPublishEnabled ? 'enabled' : ''}`}>
            {autoPublishEnabled ? <PlayCircle /> : <PauseCircle />}
            <div><strong>{autoPublishEnabled ? 'Automatic publishing active' : 'Automatic publishing paused'}</strong><small>The publication checklist is rechecked immediately before an article goes live.</small></div>
          </div>
          <div className="publication-safeguards"><span><Clock3 /> UK publishing hours</span><span><ShieldCheck /> Final checklist</span></div>
        </div>
        <div className="publication-settings-controls">
          <label><span>Publishing starts</span><input type="time" value={start} disabled={saving} onChange={(event) => setStart(event.target.value)} /></label>
          <label><span>Publishing ends</span><input type="time" value={end} disabled={saving} onChange={(event) => setEnd(event.target.value)} /></label>
          <label><span>Maximum per day</span><input type="number" min="1" max="200" step="1" value={maximum} disabled={saving} onChange={(event) => setMaximum(Number(event.target.value))} /><small>Changing this reschedules unpublished articles.</small></label>
          <label><span>Minimum overall score</span><input type="number" min="0" max="100" step="1" value={overall} disabled={saving} onChange={(event) => setOverall(Number(event.target.value))} /><small>Lower-scoring articles are held for human review.</small></label>
          <label><span>Minimum evidence score</span><input type="number" min="0" max="100" step="1" value={evidence} disabled={saving} onChange={(event) => setEvidence(Number(event.target.value))} /><small>Articles below this evidence threshold are held for review.</small></label>
          <label className="automation-toggle"><span>Automatic publishing</span><span className="automation-toggle-control"><input type="checkbox" checked={autoPublishEnabled} disabled={saving} onChange={(event) => setAutoPublishEnabled(event.target.checked)} /> <strong>{autoPublishEnabled ? 'Enabled' : 'Paused'}</strong></span></label>
          <button className="admin-primary-button publication-save-button" type="button" disabled={saving || !valid} onClick={save}>{saving ? <><LoaderCircle className="admin-spinner" /> Updating queue</> : <><Save /> Save publishing settings</>}</button>
          {message ? <output className="schedule-message">{message}</output> : null}
        </div>
      </section>
    </details>
  );
}
