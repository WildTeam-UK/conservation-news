import { authorSlug, getCurator } from '@/lib/stories';

export function CuratorByline({ name, meta, showAvatar = true }: { name: string; meta?: string; showAvatar?: boolean }) {
  const curator = getCurator(name);
  if (!curator) return <p className="byline curator-byline curator-byline-no-avatar"><span className="curator-copy">{name}{meta ? <><span className="curator-separator">·</span>{meta}</> : null}</span></p>;

  return <p className={`byline curator-byline${showAvatar ? '' : ' curator-byline-no-avatar'}`}>
    {showAvatar ? <>{/* oxlint-disable-next-line next/no-img-element */}<img className="curator-avatar" src={curator.avatar} alt="" /></> : null}
    <span className="curator-copy"><a href={`/authors/${authorSlug(name)}`}>{name}</a>{meta ? <><span className="curator-separator">·</span>{meta}</> : null}</span>
  </p>;
}
