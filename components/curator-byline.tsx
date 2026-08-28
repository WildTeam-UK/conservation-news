import { authorSlug, getCurator } from '@/lib/stories';

export function CuratorByline({ name, meta, showAvatar = true }: { name: string; meta?: string; showAvatar?: boolean }) {
  const curator = getCurator(name);
  if (!curator) return null;

  return <p className={`byline curator-byline${showAvatar ? '' : ' curator-byline-no-avatar'}`}>
    {showAvatar ? <img className="curator-avatar" src={curator.avatar} alt="" /> : null}
    <span className="curator-copy"><a href={`/authors/${authorSlug(name)}`}>{name}</a>{meta ? <><span className="curator-separator">·</span>{meta}</> : null}</span>
  </p>;
}
