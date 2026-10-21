import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from './config';

let publicClient: SupabaseClient | undefined;

export function getSupabasePublicClient() {
  if (!publicClient) {
    const { url, publishableKey } = getPublicSupabaseConfig();
    publicClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return publicClient;
}
