import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/utils'

// Los perfiles de mascotas (/pet/...) quedan fuera de Google por privacidad.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/pets', '/orders', '/lost', '/pet/', '/qr/', '/api/', '/auth/', '/hidratacion/nfc/'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
