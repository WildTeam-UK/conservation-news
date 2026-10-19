'use client';

import { Camera, LoaderCircle, Save, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

type AdminSettingsFormProps = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  initials: string;
};

export function AdminSettingsForm({ firstName: initialFirstName, lastName: initialLastName, email, role, avatarUrl: initialAvatarUrl, initials }: AdminSettingsFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function saveDetails(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Your details could not be saved.');
      setMessage('Your details have been saved.');
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your details could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.set('avatar', file);
      const response = await fetch('/api/admin/profile', { method: 'POST', body: formData });
      const result = await response.json() as { avatarUrl?: string; error?: string };
      if (!response.ok || !result.avatarUrl) throw new Error(result.error || 'The avatar could not be uploaded.');
      setAvatarUrl(result.avatarUrl);
      setMessage('Your avatar has been updated.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The avatar could not be uploaded.');
    } finally {
      setAvatarBusy(false);
      event.target.value = '';
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/profile', { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The avatar could not be removed.');
      setAvatarUrl(null);
      setMessage('Your avatar has been removed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The avatar could not be removed.');
    } finally {
      setAvatarBusy(false);
    }
  }

  return <div className="admin-settings-grid">
    <section className="admin-settings-card admin-avatar-card">
      <div><p className="eyebrow">Profile image</p><h2>Avatar</h2><p>Shown in your private editorial workspace.</p></div>
      <div className="admin-settings-avatar">{avatarUrl ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={avatarUrl} alt="Your current avatar" /></> : <span>{initials || <Camera />}</span>}</div>
      <div className="admin-avatar-actions">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} hidden />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={avatarBusy}>{avatarBusy ? <LoaderCircle className="admin-spinner" /> : <Upload />} {avatarUrl ? 'Replace avatar' : 'Add avatar'}</button>
        {avatarUrl ? <button className="remove" type="button" onClick={removeAvatar} disabled={avatarBusy}><Trash2 /> Remove</button> : null}
      </div>
      <small>JPG, PNG or WebP. Maximum file size 2 MB.</small>
    </section>

    <form className="admin-settings-card admin-profile-form" onSubmit={saveDetails}>
      <div className="admin-settings-card-heading"><div><p className="eyebrow">Account details</p><h2>Your profile</h2><p>These details personalise the editorial workspace.</p></div><span>{role}</span></div>
      <div className="admin-profile-fields">
        <label><span>First name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} /></label>
        <label><span>Last name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} /></label>
        <label className="wide"><span>Email address</span><input value={email} readOnly aria-readonly="true" /><small>Your sign-in email is managed by Supabase Authentication.</small></label>
      </div>
      <button className="admin-profile-save" type="submit" disabled={saving}>{saving ? <LoaderCircle className="admin-spinner" /> : <Save />} Save details</button>
    </form>
    {message || error ? <output className={`admin-profile-message${error ? ' failed' : ''}`}>{error || message}</output> : null}
  </div>;
}
