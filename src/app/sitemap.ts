import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/utils'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/register`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/hidratacion`, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
