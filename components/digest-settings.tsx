'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, LoaderCircle, Mail, Save, Send, Settings2 } from 'lucide-react';

type Props = {
  runTime: string;
  dailyMinStories: number;
  dailyMaxStories: number;
  weeklyMinStories: number;
  weeklyMaxStories: number;
  maxEstimatedCostUsd: number;
  automationEnabled: boolean;
  publishImmediately: boolean;
  socialDistributionEnabled: boolean;
  socialDistributionMode: 'queue' | 'immediate';
  emailDistributionEnabled: boolean;
  bufferConfigured: boolean;
  brevoConfigured: boolean;
};

export function DigestSettings({ runTime, dailyMinStories, dailyMaxStories, weeklyMinStories, weeklyMaxStories, maxEstimatedCostUsd, automationEnabled, publishImmediately, socialDistributionEnabled, socialDistributionMode, emailDistributionEnabled, bufferConfigured, brevoConfigured }: Props) {
  const router = useRouter();
  const [time, setTime] = useState(runTime.slice(0, 5));
  const [dailyMin, setDailyMin] = useState(dailyMinStories);
  const [dailyMax, setDailyMax] = useState(dailyMaxStories);
  const [weeklyMin, setWeeklyMin] = useState(weeklyMinStories);
  const [weeklyMax, setWeeklyMax] = useState(weeklyMaxStories);
  const [maxCost, setMaxCost] = useState(maxEstimatedCostUsd);
  const [automationOn, setAutomationOn] = useState(automationEnabled);
  const [publishNow, setPublishNow] = useState(publishImmediately);
  const [socialOn, setSocialOn] = useState(socialDistributionEnabled);
  const [socialMode, setSocialMode] = useState(socialDistributionMode);
  const [emailOn, setEmailOn] = useState(emailDistributionEnabled);
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
          socialDistributionEnabled: socialOn,
          socialDistributionMode: socialMode,
          emailDistributionEnabled: emailOn,
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
      <p className="eyebrow">Automation settings</p>
      <h2 id="digest-settings-heading">Configure the digest workflow</h2>
      <p>Set the schedule and safeguards first, then choose what happens after an edition is generated and published.</p>
    </div>
    <div className="digest-settings-groups">
      <section className="digest-settings-group" aria-labelledby="digest-schedule-settings">
        <header><CalendarClock /><div><h3 id="digest-schedule-settings">Schedule and limits</h3><p>Controls when editions run and the maximum input and AI cost for each one.</p></div></header>
        <div className="digest-settings-controls">
          <label><span>Run time</span><input type="time" value={time} disabled={saving} onChange={(event) => setTime(event.target.value)} /><small>Daily in UK time; Friday creates the weekly edition.</small></label>
          <label><span>Maximum AI cost</span><input type="number" min="0.05" max="100" step="0.05" value={maxCost} disabled={saving} onChange={(event) => setMaxCost(Number(event.target.value))} /><small>Estimated limit for one digest run.</small></label>
          <fieldset><legend>Daily edition</legend><label><span>Minimum stories</span><input type="number" min="1" max="25" value={dailyMin} disabled={saving} onChange={(event) => setDailyMin(Number(event.target.value))} /></label><label><span>Maximum stories</span><input type="number" min="1" max="50" value={dailyMax} disabled={saving} onChange={(event) => setDailyMax(Number(event.target.value))} /></label></fieldset>
          <fieldset><legend>Weekly edition</legend><label><span>Minimum stories</span><input type="number" min="1" max="50" value={weeklyMin} disabled={saving} onChange={(event) => setWeeklyMin(Number(event.target.value))} /></label><label><span>Maximum stories</span><input type="number" min="1" max="100" value={weeklyMax} disabled={saving} onChange={(event) => setWeeklyMax(Number(event.target.value))} /></label></fieldset>
        </div>
      </section>
      <section className="digest-settings-group" aria-labelledby="digest-workflow-settings">
        <header><Settings2 /><div><h3 id="digest-workflow-settings">Generation and publishing</h3><p>Choose whether the scheduled workflow runs and whether completed editions need review.</p></div></header>
        <div className="digest-settings-controls digest-settings-toggle-grid">
          <label className="automation-toggle digest-publish-toggle"><span>Digest schedule</span><span className="automation-toggle-control"><input type="checkbox" checked={automationOn} disabled={saving} onChange={(event) => setAutomationOn(event.target.checked)} /> <strong>{automationOn ? 'Automation enabled' : 'Automation paused'}</strong></span><small>Friday creates the weekly edition instead of a daily edition.</small></label>
          <label className="automation-toggle digest-publish-toggle"><span>Publishing</span><span className="automation-toggle-control"><input type="checkbox" checked={publishNow} disabled={saving} onChange={(event) => setPublishNow(event.target.checked)} /> <strong>{publishNow ? 'Publish immediately' : 'Create privately'}</strong></span><small>Choose whether completed editions go live without review.</small></label>
        </div>
      </section>
      <section className="digest-settings-group" aria-labelledby="digest-distribution-settings">
        <header><Send /><div><h3 id="digest-distribution-settings">Social and email delivery</h3><p>Distribution begins only after an edition is public. Daily editions are never emailed.</p></div></header>
        <div className="digest-settings-controls digest-settings-distribution-grid">
          <label className="automation-toggle digest-publish-toggle"><span>Buffer social distribution</span><span className="automation-toggle-control"><input type="checkbox" checked={socialOn} disabled={saving || !bufferConfigured} onChange={(event) => setSocialOn(event.target.checked)} /> <strong>{socialOn ? 'Automatic social enabled' : 'Social paused'}</strong></span><small>{bufferConfigured ? 'Applies to every published daily and weekly edition.' : 'Add BUFFER_API_KEY and BUFFER_CHANNEL_IDS before enabling this channel.'}</small></label>
          <label className="digest-publish-toggle"><span>Buffer delivery</span><select value={socialMode} disabled={saving || !bufferConfigured} onChange={(event) => setSocialMode(event.target.value as 'queue' | 'immediate')}><option value="queue">Add to queue</option><option value="immediate">Publish immediately</option></select><small>{socialMode === 'immediate' ? 'Publish as soon as the delivery heartbeat processes it.' : 'Use each Buffer channel’s next available posting slot.'}</small></label>
          <label className="automation-toggle digest-publish-toggle digest-email-toggle"><span>Brevo weekly email</span><span className="automation-toggle-control"><input type="checkbox" checked={emailOn} disabled={saving || !brevoConfigured} onChange={(event) => setEmailOn(event.target.checked)} /> <strong>{emailOn ? 'Automatic weekly email enabled' : 'Weekly email paused'}</strong></span><small>{brevoConfigured ? 'Sends Friday’s published weekly edition to the Weekly Digest list.' : 'Add BREVO_API_KEY, BREVO_LIST_ID and BREVO_SENDER_ID before enabling this channel.'}</small></label>
        </div>
      </section>
    </div>
    <footer className="digest-settings-save-bar"><div><Mail /><span><strong>{emailOn ? 'Weekly email on' : 'Weekly email off'}</strong><small>{socialOn ? `Buffer ${socialMode === 'immediate' ? 'publishes immediately' : 'uses the queue'}` : 'Buffer distribution off'}</small></span></div><button className="admin-primary-button digest-save-button" type="button" disabled={saving || !valid} onClick={save}>{saving ? <><LoaderCircle className="admin-spinner" /> Saving</> : <><Save /> Save settings</>}</button>{message ? <output className="schedule-message">{message}</output> : null}</footer>
  </section>;
}
