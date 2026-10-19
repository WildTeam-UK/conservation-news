'use client';

import { Menu, X } from 'lucide-react';
import { useRef, useState } from 'react';

export function AdminMobileNavToggle() {
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function setMenu(open: boolean) {
    setExpanded(open);
    buttonRef.current?.closest('.admin-page')?.classList.toggle('admin-mobile-nav-expanded', open);
  }

  return <>
    <button ref={buttonRef} className="admin-mobile-nav-toggle" type="button" onClick={() => setMenu(!expanded)} aria-expanded={expanded} aria-controls="admin-navigation" aria-label={expanded ? 'Close admin menu' : 'Open admin menu'}>
      {expanded ? <X /> : <Menu />}
    </button>
    <button className="admin-mobile-nav-backdrop" type="button" onClick={() => setMenu(false)} aria-label="Close admin menu" tabIndex={expanded ? 0 : -1} />
  </>;
}
