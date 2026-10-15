'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from './config';

let client: ReturnType<typeof createBrowserClient> | undefined;

export const getSupabaseBrowserClient = () => {
  if (!client) {
    const { url, publishableKey } = getPublicSupabaseConfig();
    client = createBrowserClient(url, publishableKey);
  }

  return client;
};

