import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ai.adyapan.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/admin-login/', '/profile/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
