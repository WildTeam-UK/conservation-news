import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RefreshResult = {
  open_recommendations: number;
  created_or_updated: number;
};

export async function refreshSourceIntelligence() {
  const { data, error } = await getSupabaseAdminClient().rpc('refresh_source_network_recommendations');
  if (error) throw error;
  const result = (Array.isArray(data) ? data[0] : data) as RefreshResult | null;
  return {
    openRecommendations: Number(result?.open_recommendations ?? 0),
    createdOrUpdated: Number(result?.created_or_updated ?? 0),
  };
}
