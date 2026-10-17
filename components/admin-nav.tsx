import { Activity, CalendarClock, FilePenLine, LayoutDashboard, Rss, Tags } from 'lucide-react';
import Link from 'next/link';

type AdminNavProps = {
  active: 'dashboard' | 'pipeline' | 'drafts' | 'queue' | 'sources' | 'tags';
  subview?: 'monitored' | 'recommendations' | 'topics' | 'tags';
};

export function AdminNav({ active, subview }: AdminNavProps) {
  return (
    <>
    <nav className="admin-nav" aria-label="Editorial navigation">
      <span className="admin-nav-group">Workspace</span>
      {/* Full page loads reliably refresh the protected Supabase session in Vinext. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'dashboard' ? 'active' : ''} href="/admin"><LayoutDashboard /><span><strong>Overview</strong><small>Health and activity</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'pipeline' ? 'active' : ''} href="/admin/pipeline"><Activity /><span><strong>Pipeline</strong><small>Collection and assessment</small></span></a>
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
    {active === 'sources' ? <nav className="admin-subnav" aria-label="Source views"><Link className={subview === 'monitored' ? 'active' : ''} href="/admin/sources?view=monitored">Monitored sources</Link><Link className={subview === 'recommendations' ? 'active' : ''} href="/admin/sources?view=recommendations">Recommendations</Link></nav> : null}
    {active === 'tags' ? <nav className="admin-subnav" aria-label="Taxonomy views"><Link className={subview === 'topics' ? 'active' : ''} href="/admin/tags?view=topics">Topics</Link><Link className={subview === 'tags' ? 'active' : ''} href="/admin/tags?view=tags">Tags</Link></nav> : null}
    </>
  );
}
