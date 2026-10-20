import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';
import { DEFAULT_DESCRIPTION, DEFAULT_SOCIAL_IMAGE, DEFAULT_TITLE, isProductionDeployment, SITE_NAME, SITE_URL, siteJsonLd } from '@/lib/seo';
import './globals.css';
import './admin-workspace.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: 'WildTeam',
  publisher: 'WildTeam',
  category: 'Conservation news',
  robots: isProductionDeployment() ? { index: true, follow: true } : { index: false, follow: false, noarchive: true },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_GB',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1731, height: 909, alt: 'WILDNEWS conservation news' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><head><link rel="describedby" href="/llms.txt" type="text/markdown" /></head><body><JsonLd data={siteJsonLd} />{children}</body></html>;
}
