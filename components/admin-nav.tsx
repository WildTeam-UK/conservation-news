import { BrainCircuit, CalendarClock, FilePenLine, Inbox, LayoutDashboard, Rss, Tags } from 'lucide-react';

type AdminNavProps = {
  active: 'dashboard' | 'collected' | 'candidates' | 'drafts' | 'queue' | 'sources' | 'tags';
};

export function AdminNav({ active }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Editorial navigation">
      {/* Full page loads reliably refresh the protected Supabase session in Vinext. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'dashboard' ? 'active' : ''} href="/admin"><LayoutDashboard /> Dashboard</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'sources' ? 'active' : ''} href="/admin/sources"><Rss /> Sources</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'collected' ? 'active' : ''} href="/admin/collected"><Inbox /> Collected</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'candidates' ? 'active' : ''} href="/admin/candidates"><BrainCircuit /> Candidates</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'drafts' ? 'active' : ''} href="/admin/drafts"><FilePenLine /> Articles</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'queue' ? 'active' : ''} href="/admin/queue"><CalendarClock /> Queue</a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'tags' ? 'active' : ''} href="/admin/tags"><Tags /> Tags</a>
    </nav>
  );
}
