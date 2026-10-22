'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from './config';

let client: SupabaseClient | undefined;

export const getSupabaseBrowserClient = () => {
  if (!client) {
    const { url, publishableKey } = getPublicSupabaseConfig();
    client = createBrowserClient(url, publishableKey);
  }

  return client;
};

