import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return <header className="page-hero editorial-hero shell">
    <div className="editorial-hero-label"><p className="eyebrow">{eyebrow}</p></div>
    <h1>{title}</h1>
    <p className="editorial-hero-description">{description}</p>
  </header>;
}
