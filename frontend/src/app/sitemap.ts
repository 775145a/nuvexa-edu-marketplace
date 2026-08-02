import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nuvexa-edu.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
  ];

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://nuvexa-api.vercel.app/api/v1').replace(/\/$/, '');
    const res = await fetch(`${apiBase}/courses?limit=500&status=PUBLISHED`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const courses = json?.data?.items || json?.data || [];
      if (Array.isArray(courses)) {
        courseRoutes = courses
          .filter((c: any) => c.slug)
          .map((c: any) => ({
            url: `${SITE_URL}/courses/${c.slug}`,
            lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          }));
      }
    }
  } catch {
    courseRoutes = [];
  }

  return [...staticRoutes, ...courseRoutes];
}
