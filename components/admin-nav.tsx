/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh protected Supabase admin views in Vinext */
import { CalendarClock, CalendarDays, FilePenLine, LayoutDashboard } from 'lucide-react';
import { AdminProfileMenu } from '@/components/admin-profile-menu';
import { AdminNavSection } from '@/components/admin-nav-section';
import { AdminNavToggle } from '@/components/admin-nav-toggle';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';

type AdminNavProps = {
  active: 'dashboard' | 'pipeline' | 'drafts' | 'queue' | 'digests' | 'sources' | 'tags' | 'training' | 'settings';
  subview?: 'pipeline-status' | 'collected' | 'candidates' | 'linking' | 'monitored' | 'recommendations' | 'topics' | 'tags' | 'good-news' | 'courses';
};

export function AdminNav({ active, subview }: AdminNavProps) {
  return (
    <>
    <nav className="admin-nav" id="admin-navigation" aria-label="Editorial navigation">
      <AdminNavToggle />
      <span className="admin-nav-group">Workspace</span>
      {/* Full page loads reliably refresh the protected Supabase session in Vinext. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'dashboard' ? 'active' : ''} href="/admin" title="Overview" aria-current={active === 'dashboard' ? 'page' : undefined}><LayoutDashboard /><span><strong>Overview</strong><small>Health and activity</small></span></a>
      <AdminNavSection icon="pipeline" label="Pipeline" description="Collection and assessment" active={active === 'pipeline'} items={[{ label: 'Pipeline status', href: '/admin/pipeline', active: subview === 'pipeline-status' }, { label: 'Collected items', href: '/admin/collected', active: subview === 'collected' }, { label: 'Candidates', href: '/admin/candidates', active: subview === 'candidates' }, { label: 'Link health', href: '/admin/linking', active: subview === 'linking' }]} />
      <span className="admin-nav-group">Publishing</span>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'drafts' ? 'active' : ''} href="/admin/drafts" title="Articles" aria-current={active === 'drafts' ? 'page' : undefined}><FilePenLine /><span><strong>Articles</strong><small>Every article status</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'queue' ? 'active' : ''} href="/admin/queue" title="Schedule" aria-current={active === 'queue' ? 'page' : undefined}><CalendarClock /><span><strong>Schedule</strong><small>Publishing queue</small></span></a>
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={active === 'digests' ? 'active' : ''} href="/admin/digests" title="Digests" aria-current={active === 'digests' ? 'page' : undefined}><CalendarDays /><span><strong>Digests</strong><small>Daily and weekly editions</small></span></a>
      <span className="admin-nav-group">Library</span>
      <AdminNavSection icon="sources" label="Sources" description="Feeds and source health" active={active === 'sources'} items={[{ label: 'Monitored sources', href: '/admin/sources?view=monitored', active: subview === 'monitored' }, { label: 'Recommendations', href: '/admin/sources?view=recommendations', active: subview === 'recommendations' }]} />
      <AdminNavSection icon="taxonomy" label="Taxonomy" description="Topics and classifications" active={active === 'tags'} items={[{ label: 'Topics', href: '/admin/tags?view=topics', active: subview === 'topics' }, { label: 'Tags', href: '/admin/tags?view=tags', active: subview === 'tags' }, { label: 'Good News', href: '/admin/good-news', active: subview === 'good-news' }]} />
      <AdminNavSection icon="training" label="Training" description="Courses and recommendations" active={active === 'training'} items={[{ label: 'Courses', href: '/admin/training', active: subview === 'courses' }]} />
      <AdminProfileMenu active={active === 'settings'} />
      <div className="admin-mobile-sign-out"><AdminSignOutButton /></div>
    </nav>
    </>
  );
}
