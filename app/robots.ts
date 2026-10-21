import type { MetadataRoute } from 'next';
import { isProductionDeployment, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
