import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/brand';

export function InteriorHeader({ actionHref = '/#donate', actionLabel = 'Donate' }: { actionHref?: string; actionLabel?: string }) {
  return <header className="interior-header">
    <div className="interior-header-row shell">
      <Brand />
      <nav className="primary-nav" aria-label="Main navigation">
        <a href="/about">About</a>
        <a href="https://training.wildteam.org.uk/courses" target="_blank" rel="noreferrer">Training</a>
        <a href="https://training.wildteam.org.uk/job-board" target="_blank" rel="noreferrer">Careers</a>
        <a href="/#newsletter">Newsletter</a>
      </nav>
      <a href={actionHref} className="donate-button">{actionLabel} <ArrowRight /></a>
    </div>
  </header>;
}
