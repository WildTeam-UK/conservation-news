const requireValue = (name: string, value: string | undefined) => {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const getPublicSupabaseConfig = () => ({
  url: requireValue('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  publishableKey: requireValue(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
});

export const getAdminSupabaseConfig = () => ({
  url: requireValue('SUPABASE_URL', process.env.SUPABASE_URL),
  secretKey: requireValue('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY),
});

