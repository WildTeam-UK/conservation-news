import { BrainCircuit, CalendarClock, FilePenLine, Inbox, LayoutDashboard, Rss, Tags } from 'lucide-react';

type AdminNavProps = {
  active: 'dashboard' | 'collected' | 'candidates' | 'drafts' | 'queue' | 'sources' | 'tags';
};

export function AdminNav({ active }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Editorial navigation">
      <span className="admin-nav-group">Workspace</span>
      {/* Full page loads reliably refresh the protected Supabase session in Vinext. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'dashboard' ? 'active' : ''} href="/admin"><LayoutDashboard /><span><strong>Overview</strong><small>Health and activity</small></span></a>
      <span className="admin-nav-group">Pipeline</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'collected' ? 'active' : ''} href="/admin/collected"><Inbox /><span><strong>Collected</strong><small>Incoming source items</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'candidates' ? 'active' : ''} href="/admin/candidates"><BrainCircuit /><span><strong>Candidates</strong><small>Assessed stories</small></span></a>
      <span className="admin-nav-group">Publishing</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'drafts' ? 'active' : ''} href="/admin/drafts"><FilePenLine /><span><strong>Articles</strong><small>Every article status</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'queue' ? 'active' : ''} href="/admin/queue"><CalendarClock /><span><strong>Schedule</strong><small>Publishing queue</small></span></a>
      <span className="admin-nav-group">Library</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'sources' ? 'active' : ''} href="/admin/sources"><Rss /><span><strong>Sources</strong><small>Feeds and source health</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'tags' ? 'active' : ''} href="/admin/tags"><Tags /><span><strong>Taxonomy</strong><small>Topics and tags</small></span></a>
    </nav>
  );
}
