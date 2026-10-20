import { Fragment } from 'react';

export function InlineBrand({ text }: { text: string }) {
  return <>{text.split(/(WILDNEWS|WildNews)/g).map((part, index) => /^(WILDNEWS|WildNews)$/.test(part)
    ? <span className="inline-brand" aria-label="WILDNEWS" key={`${part}-${index}`}><span>WILD</span><span>NEWS</span></span>
    : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}</>;
}
