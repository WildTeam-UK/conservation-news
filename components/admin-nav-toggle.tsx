'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useRef, useState } from 'react';

export function AdminNavToggle() {
  const [expanded, setExpanded] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggleNavigation() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    buttonRef.current?.closest('.admin-page')?.classList.toggle('admin-nav-collapsed', !nextExpanded);
  }

  return <button ref={buttonRef} className="admin-nav-toggle" type="button" onClick={toggleNavigation} aria-expanded={expanded} aria-label={expanded ? 'Collapse admin menu' : 'Expand admin menu'}>
    {expanded ? <PanelLeftClose /> : <PanelLeftOpen />}
    <span>{expanded ? 'Collapse menu' : 'Expand menu'}</span>
  </button>;
}
