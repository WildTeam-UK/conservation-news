import Link from 'next/link';
import { LayoutDashboard, Rss } from 'lucide-react';

type AdminNavProps = {
  active: 'dashboard' | 'sources';
};

export function AdminNav({ active }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Editorial navigation">
      <Link className={active === 'dashboard' ? 'active' : ''} href="/admin"><LayoutDashboard /> Dashboard</Link>
      <Link className={active === 'sources' ? 'active' : ''} href="/admin/sources"><Rss /> Sources</Link>
    </nav>
  );
}
