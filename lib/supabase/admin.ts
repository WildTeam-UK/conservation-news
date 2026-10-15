import { createClient } from '@supabase/supabase-js';
import { getAdminSupabaseConfig } from './config';

let adminClient: ReturnType<typeof createClient> | undefined;

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

