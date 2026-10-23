import type { ReactNode } from 'react';

type ArchiveHeroProps = {
  label: ReactNode;
  title: ReactNode;
  description: ReactNode;
  descriptionLink?: ReactNode;
  meta: ReactNode;
};

export function ArchiveHero({ label, title, description, descriptionLink, meta }: ArchiveHeroProps) {
  return <section className="archive-hero editorial-hero shell">
    <div className="archive-hero-label editorial-hero-label">{label}</div>
    <h1>{title}</h1>
    <p className="editorial-hero-description">{description}{descriptionLink ? <span className="editorial-hero-description-link">{descriptionLink}</span> : null}</p>
    <span>{meta}</span>
  </section>;
}
