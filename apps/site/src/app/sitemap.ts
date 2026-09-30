import type { MetadataRoute } from 'next';
import { SITE_URL } from './site-config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ['', '/case-study', '/architecture'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
  }));
}
