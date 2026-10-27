/* oxlint-disable next/no-html-link-for-pages -- a full page load keeps home navigation reliable in Vinext */

import { BrandWordmark } from '@wildteam-uk/ui';

export function Brand() {
  return <a href="/" className="brand" aria-label="WILDNEWS home">
    <BrandWordmark className="brand-wordmark" product="NEWS" aria-hidden="true" />
  </a>;
}
