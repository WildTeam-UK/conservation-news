'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, LoaderCircle, Mail, Save, Send, ShieldCheck } from 'lucide-react';

type Props = {
  runTime: string;
  dailyMinStories: number;
  dailyMaxStories: number;
  weeklyMinStories: number;
  weeklyMaxStories: number;
  maxEstimatedCostUsd: number;
  automationEnabled: boolean;
  publishImmediately: boolean;
};

export function DigestSettings({ runTime, dailyMinStories, dailyMaxStories, weeklyMinStories, weeklyMaxStories, maxEstimatedCostUsd, automationEnabled, publishImmediately }: Props) {
  const router = useRouter();
  const [time, setTime] = useState(runTime.slice(0, 5));
  const [dailyMin, setDailyMin] = useState(dailyMinStories);
  const [dailyMax, setDailyMax] = useState(dailyMaxStories);
  const [weeklyMin, setWeeklyMin] = useState(weeklyMinStories);
  const [weeklyMax, setWeeklyMax] = useState(weeklyMaxStories);
  const [maxCost, setMaxCost] = useState(maxEstimatedCostUsd);
  const [automationOn, setAutomationOn] = useState(automationEnabled);
  const [publishNow, setPublishNow] = useState(publishImmediately);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const valid = Boolean(time) && dailyMin >= 1 && dailyMax >= dailyMin && dailyMax <= 50 && weeklyMin >= 1 && weeklyMax >= weeklyMin && weeklyMax <= 100 && maxCost >= 0.05 && maxCost <= 100;

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/digest-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runTime: time,
          dailyMinStories: dailyMin,
          dailyMaxStories: dailyMax,
          weeklyMinStories: weeklyMin,
          weeklyMaxStories: weeklyMax,
          maxEstimatedCostUsd: maxCost,
          automationEnabled: automationOn,
          publishImmediately: publishNow,
        }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Digest settings could not be saved.');
      setMessage(automationOn ? `Digest settings saved. The schedule is active and completed editions will ${publishNow ? 'publish immediately' : 'remain private'}.` : 'Digest settings saved. Automatic generation remains paused.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Digest settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="digest-settings-panel" aria-labelledby="digest-settings-heading">
    <div className="digest-settings-intro">
      <p className="eyebrow">Digest automation</p>
      <h2 id="digest-settings-heading">Daily and weekly editions</h2>
      <p>Daily editions will cover the previous 24 hours. Every Friday, a seven-day weekly edition will replace the daily edition.</p>
      <div className="digest-testing-mode"><ShieldCheck /><div><strong>{automationOn ? 'Digest automation enabled' : 'Setup mode'}</strong><small>{automationOn ? 'The existing heartbeat will create the due edition at the configured UK time.' : 'Nothing will generate automatically until digest automation is enabled.'} Buffer and Brevo remain off.</small></div></div>
      <div className="digest-channel-status"><span><Send /> Social disabled</span><span><Mail /> Email disabled</span><span><Clock3 /> UK time</span></div>
    </div>
    <div className="digest-settings-controls">
      <label><span>Run time</span><input type="time" value={time} disabled={saving} onChange={(event) => setTime(event.target.value)} /><small>Daily at this time; Friday creates the weekly edition.</small></label>
      <label><span>Maximum AI cost</span><input type="number" min="0.05" max="100" step="0.05" value={maxCost} disabled={saving} onChange={(event) => setMaxCost(Number(event.target.value))} /><small>Estimated limit for one digest run.</small></label>
      <fieldset><legend>Daily edition</legend><label><span>Minimum stories</span><input type="number" min="1" max="25" value={dailyMin} disabled={saving} onChange={(event) => setDailyMin(Number(event.target.value))} /></label><label><span>Maximum stories</span><input type="number" min="1" max="50" value={dailyMax} disabled={saving} onChange={(event) => setDailyMax(Number(event.target.value))} /></label></fieldset>
      <fieldset><legend>Weekly edition</legend><label><span>Minimum stories</span><input type="number" min="1" max="50" value={weeklyMin} disabled={saving} onChange={(event) => setWeeklyMin(Number(event.target.value))} /></label><label><span>Maximum stories</span><input type="number" min="1" max="100" value={weeklyMax} disabled={saving} onChange={(event) => setWeeklyMax(Number(event.target.value))} /></label></fieldset>
      <label className="automation-toggle digest-publish-toggle"><span>Digest schedule</span><span className="automation-toggle-control"><input type="checkbox" checked={automationOn} disabled={saving} onChange={(event) => setAutomationOn(event.target.checked)} /> <strong>{automationOn ? 'Automation enabled' : 'Automation paused'}</strong></span><small>Friday creates the weekly edition instead of a daily edition.</small></label>
      <label className="automation-toggle digest-publish-toggle"><span>Publishing</span><span className="automation-toggle-control"><input type="checkbox" checked={publishNow} disabled={saving} onChange={(event) => setPublishNow(event.target.checked)} /> <strong>{publishNow ? 'Publish immediately' : 'Create privately'}</strong></span><small>Choose whether completed editions go live without review.</small></label>
      <button className="admin-primary-button digest-save-button" type="button" disabled={saving || !valid} onClick={save}>{saving ? <><LoaderCircle className="admin-spinner" /> Saving</> : <><Save /> Save digest settings</>}</button>
      {message ? <output className="schedule-message">{message}</output> : null}
    </div>
  </section>;
}
