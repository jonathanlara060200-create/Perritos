import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const config: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    // Las fotos se suben por Server Action (máx. 5 MB por foto, validado en la acción)
    serverActions: { bodySizeLimit: '6mb' },
  },
}

export default config

initOpenNextCloudflareForDev()
