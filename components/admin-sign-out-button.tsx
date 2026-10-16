'use client';

import { LogOut } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function AdminSignOutButton() {
  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.assign('/admin/login');
  }

  return <button className="admin-sign-out" type="button" onClick={signOut}>Sign out <LogOut /></button>;
}
