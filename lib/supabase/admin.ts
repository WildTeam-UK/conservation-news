import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabaseConfig } from './config';

let adminClient: SupabaseClient | undefined;

export const getSupabaseAdminClient = () => {
  if (!adminClient) {
    const { url, secretKey } = getAdminSupabaseConfig();
    adminClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
};

