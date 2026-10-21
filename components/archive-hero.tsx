import type { ReactNode } from 'react';

type ArchiveHeroProps = {
  label: ReactNode;
  title: ReactNode;
  description: ReactNode;
  meta: ReactNode;
};

export function ArchiveHero({ label, title, description, meta }: ArchiveHeroProps) {
  return <section className="archive-hero shell">
    <div className="archive-hero-label">{label}</div>
    <h1>{title}</h1>
    <p>{description}</p>
    <span>{meta}</span>
  </section>;
}
