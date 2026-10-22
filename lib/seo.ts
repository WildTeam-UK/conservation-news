import type { Metadata } from 'next';

export const SITE_NAME = 'WILDNEWS';
export const SITE_URL = 'https://news.wildteam.org.uk';
export const DEFAULT_TITLE = 'WILDNEWS | Conservation news, clearly summarised';
export const DEFAULT_DESCRIPTION = 'Source-led conservation news briefings that bring together reporting, evidence and context from across a fragmented field.';
export const DEFAULT_SOCIAL_IMAGE = '/og.png';

export function isProductionDeployment() {
  return process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}

export function withSiteName(title: string) {
  const unbrandedTitle = title.trim().replace(/(?:\s*(?:\||-|:)\s*wild\s*news)+\s*$/i, '').trim();
  return unbrandedTitle ? `${unbrandedTitle} | ${SITE_NAME}` : SITE_NAME;
}

export function pageMetadata({ title, description, path, image = DEFAULT_SOCIAL_IMAGE }: { title: string; description: string; path: string; image?: string | null }): Metadata {
  const images = image ? [{ url: image, alt: title }] : [];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: SITE_NAME,
      locale: 'en_GB',
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map(({ url }) => url),
    },
  };
}

export function articleMetadata({ title, description, path, image, imageAlt, publishedTime, modifiedTime }: { title: string; description: string; path: string; image?: string | null; imageAlt?: string | null; publishedTime?: string | null; modifiedTime?: string | null }): Metadata {
  const images = image ? [{ url: image, alt: imageAlt || title }] : [{ url: DEFAULT_SOCIAL_IMAGE, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url: path,
      siteName: SITE_NAME,
      locale: 'en_GB',
      title,
      description,
      images,
      publishedTime: publishedTime ?? undefined,
      modifiedTime: modifiedTime ?? undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map(({ url }) => url),
    },
  };
}

export function newsArticleJsonLd({ headline, description, path, image, publishedTime, modifiedTime, sections = [] }: { headline: string; description: string; path: string; image?: string | null; publishedTime?: string | null; modifiedTime?: string | null; sections?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    headline,
    description,
    image: [absoluteUrl(image || DEFAULT_SOCIAL_IMAGE)],
    datePublished: publishedTime ?? undefined,
    dateModified: modifiedTime ?? publishedTime ?? undefined,
    articleSection: sections.length ? sections : undefined,
    isAccessibleForFree: true,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'WildTeam',
      url: 'https://www.wildteam.org.uk',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/wildteam-logo.png') },
    },
  };
}

export const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-GB',
    publisher: { '@id': `${SITE_URL}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'WildTeam',
    url: 'https://www.wildteam.org.uk',
    logo: { '@type': 'ImageObject', url: absoluteUrl('/wildteam-logo.png') },
    sameAs: [
      'https://www.linkedin.com/company/wildteam-uk/',
      'https://www.facebook.com/WildTeamUK/',
      'https://www.instagram.com/wildteamuk/',
      'https://www.youtube.com/channel/UCUUcxfaUjtX4dl4zs4gMjSg',
    ],
  },
];
