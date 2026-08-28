import { authorSlug, getCurator } from '@/lib/stories';

export function CuratorByline({ name, prefix = 'By', meta }: { name: string; prefix?: string; meta?: string }) {
  const curator = getCurator(name);
  if (!curator) return null;

  return <p className="byline curator-byline">
    <img className="curator-avatar" src={curator.avatar} alt="" />
    <span className="curator-copy">{prefix} <a href={`/authors/${authorSlug(name)}`}>{name}</a>{meta ? <><span className="curator-separator">·</span>{meta}</> : null}</span>
  </p>;
}
