import type { Metadata } from 'next';
import { HeartHandshake } from 'lucide-react';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { GoodNewsControls } from '@/components/good-news-controls';
import { getGoodNewsBackfillStatus } from '@/lib/openai/backfill-conservation-outlooks';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Good News | WILDNEWS editorial', robots: { index: false, follow: false } };

export default async function GoodNewsAdminPage() {
  const { supabase } = await requireContentAdmin();
  const [{ data: settings, error }, status] = await Promise.all([
    supabase.from('good_news_settings').select('minimum_score, minimum_confidence').eq('id', true).single(),
    getGoodNewsBackfillStatus(),
  ]);
  if (error || !settings) throw new Error('Unable to load Good News settings. Run the Good News migration first.');
  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="tags" subview="good-news" />
    <div className="admin-shell admin-good-news-shell">
      <section className="taxonomy-heading">
        <div><p className="eyebrow">Editorial classification</p><h1>Good News</h1><p>Control the evidence threshold for WILDNEWS stories that demonstrate meaningful conservation progress.</p></div>
        <div className="taxonomy-summary"><span><HeartHandshake /></span><strong>{status.qualifying}</strong><small>qualifying articles</small></div>
      </section>
      <GoodNewsControls initialStatus={status} initialSettings={settings} />
    </div>
  </main>;
}
