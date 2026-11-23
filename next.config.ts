import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const config: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  // Encabezados de seguridad. La CSP es básica a propósito (no limita scripts ni imágenes para no
  // romper Leaflet, Supabase Storage ni Mercado Pago): impide que otra página meta la tuya en un iframe.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=(), usb=()' },
        ],
      },
    ]
  },
  experimental: {
    // Las fotos se suben por Server Action (máx. 5 MB por foto, validado en la acción)
    serverActions: { bodySizeLimit: '6mb' },
  },
}

export default config

initOpenNextCloudflareForDev()
