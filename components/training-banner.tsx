import { ArrowRight } from 'lucide-react';

type TrainingBannerProps = {
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

export function TrainingBanner({
  className = '',
  eyebrow = 'Turn knowledge into action',
  title = 'Build the skills to make conservation happen.',
  description = 'Practical, accessible training for people protecting nature around the world.',
  href = 'https://training.wildteam.org.uk/',
  linkLabel = 'Explore WildTeam training',
}: TrainingBannerProps) {
  return <aside className={`training-banner ${className}`.trim()}>
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <a href={href}>{linkLabel} <ArrowRight /></a>
  </aside>;
}
