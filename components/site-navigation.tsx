'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Brand } from '@/components/brand';

const navigationLinks = [
  { label: 'Community', href: 'https://training.wildteam.org.uk/social' },
  { label: 'Jobs', href: 'https://training.wildteam.org.uk/job-board' },
  { label: 'Training', href: 'https://training.wildteam.org.uk/' },
  { label: 'Digests', href: '/digests' },
];

const navigationActions = [
  { label: 'How we use AI', href: '/how-we-use-ai', kind: 'secondary' },
  { label: 'Read good news', href: '/good-news', kind: 'good-news' },
] as const;

export function SiteNavigation() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return <div className="masthead site-masthead">
    <Brand />
    <button className="site-menu-toggle" type="button" aria-expanded={open} aria-controls="site-navigation" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setOpen((current) => !current)}>
      {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
    </button>
    <div className={`site-navigation${open ? ' is-open' : ''}`} id="site-navigation">
      <nav className="primary-nav" aria-label="Main navigation">
        {navigationLinks.map((link) => <a href={link.href} onClick={closeMenu} key={link.label}>{link.label}</a>)}
      </nav>
      <div className="site-navigation-actions">
        {navigationActions.map((action) => <a className={`site-navigation-button ${action.kind}`} href={action.href} onClick={closeMenu} key={action.label}><span>{action.label}</span>{action.kind === 'good-news' ? <ArrowRight aria-hidden="true" /> : null}</a>)}
      </div>
    </div>
  </div>;
}
