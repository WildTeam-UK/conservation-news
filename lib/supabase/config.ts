import { requireEnvironmentValue } from '@/lib/environment';

export const getPublicSupabaseConfig = () => ({
  url: requireEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  publishableKey: requireEnvironmentValue(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
});

export const getAdminSupabaseConfig = () => ({
  url: requireEnvironmentValue('SUPABASE_URL', process.env.SUPABASE_URL),
  secretKey: requireEnvironmentValue('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY),
});

