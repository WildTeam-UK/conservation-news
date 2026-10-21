/* oxlint-disable next/no-html-link-for-pages -- full page loads reliably refresh protected Supabase admin views in Vinext */
'use client';

import { Activity, ChevronDown, GraduationCap, Rss, Tags } from 'lucide-react';
import { useState } from 'react';

type NavIcon = 'pipeline' | 'sources' | 'taxonomy' | 'training';
type NavItem = { label: string; href: string; active: boolean };

const icons = { pipeline: Activity, sources: Rss, taxonomy: Tags, training: GraduationCap };

export function AdminNavSection({ icon, label, description, active, items }: { icon: NavIcon; label: string; description: string; active: boolean; items: NavItem[] }) {
  const [open, setOpen] = useState(active);
  const Icon = icons[icon];
  const submenuId = `admin-${icon}-submenu`;

  return <div className={`admin-nav-section${open ? ' open' : ''}`}>
    <button className={`admin-nav-section-toggle${active ? ' active' : ''}`} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={submenuId} title={label}>
      <Icon />
      <span><strong>{label}</strong><small>{description}</small></span>
      <ChevronDown className="admin-nav-chevron" />
    </button>
    <div className="admin-nav-subitems" id={submenuId} aria-label={`${label} views`}>
      {items.map((item) => <a className={item.active ? 'active' : ''} href={item.href} aria-current={item.active ? 'page' : undefined} key={item.href}>{item.label}</a>)}
    </div>
  </div>;
}
