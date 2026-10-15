import { Inbox, LayoutDashboard, Rss } from 'lucide-react';

type AdminNavProps = {
  active: 'dashboard' | 'collected' | 'sources';
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
    </nav>
  );
}
