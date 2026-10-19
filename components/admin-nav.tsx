/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh protected Supabase admin views in Vinext */
import { Activity, CalendarClock, CalendarDays, FilePenLine, LayoutDashboard, Rss, Tags } from 'lucide-react';
import { AdminProfileMenu } from '@/components/admin-profile-menu';
import { AdminNavToggle } from '@/components/admin-nav-toggle';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';

type AdminNavProps = {
  active: 'dashboard' | 'pipeline' | 'drafts' | 'queue' | 'digests' | 'sources' | 'tags' | 'settings';
  subview?: 'pipeline-status' | 'collected' | 'candidates' | 'monitored' | 'recommendations' | 'topics' | 'tags';
};

export function AdminNav({ active, subview }: AdminNavProps) {
  return (
    <>
    <nav className="admin-nav" id="admin-navigation" aria-label="Editorial navigation">
      <AdminNavToggle />
      <span className="admin-nav-group">Workspace</span>
      {/* Full page loads reliably refresh the protected Supabase session in Vinext. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'dashboard' ? 'active' : ''} href="/admin" title="Overview"><LayoutDashboard /><span><strong>Overview</strong><small>Health and activity</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'pipeline' ? 'active' : ''} href="/admin/pipeline" title="Pipeline"><Activity /><span><strong>Pipeline</strong><small>Collection and assessment</small></span></a>
      <div className="admin-nav-subitems" aria-label="Pipeline views"><a className={subview === 'pipeline-status' ? 'active' : ''} href="/admin/pipeline">Pipeline status</a><a className={subview === 'collected' ? 'active' : ''} href="/admin/collected">Collected items</a><a className={subview === 'candidates' ? 'active' : ''} href="/admin/candidates">Candidates</a></div>
      <span className="admin-nav-group">Publishing</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'drafts' ? 'active' : ''} href="/admin/drafts" title="Articles"><FilePenLine /><span><strong>Articles</strong><small>Every article status</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'queue' ? 'active' : ''} href="/admin/queue" title="Schedule"><CalendarClock /><span><strong>Schedule</strong><small>Publishing queue</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'digests' ? 'active' : ''} href="/admin/digests" title="Digests"><CalendarDays /><span><strong>Digests</strong><small>Daily and weekly editions</small></span></a>
      <span className="admin-nav-group">Library</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'sources' ? 'active' : ''} href="/admin/sources" title="Sources"><Rss /><span><strong>Sources</strong><small>Feeds and source health</small></span></a>
      <div className="admin-nav-subitems" aria-label="Source views"><a className={subview === 'monitored' ? 'active' : ''} href="/admin/sources?view=monitored">Monitored sources</a><a className={subview === 'recommendations' ? 'active' : ''} href="/admin/sources?view=recommendations">Recommendations</a></div>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'tags' ? 'active' : ''} href="/admin/tags" title="Taxonomy"><Tags /><span><strong>Taxonomy</strong><small>Topics and tags</small></span></a>
      <div className="admin-nav-subitems" aria-label="Taxonomy views"><a className={subview === 'topics' ? 'active' : ''} href="/admin/tags?view=topics">Topics</a><a className={subview === 'tags' ? 'active' : ''} href="/admin/tags?view=tags">Tags</a></div>
      <AdminProfileMenu active={active === 'settings'} />
      <div className="admin-mobile-sign-out"><AdminSignOutButton /></div>
    </nav>
    </>
  );
}
