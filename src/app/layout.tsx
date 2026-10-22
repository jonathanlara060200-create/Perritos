import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { PwaRegister } from '@/components/PwaRegister'
import { siteUrl } from '@/lib/utils'

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'AJolote ID · Ajolote de Bolsillo', template: '%s · AJolote ID' },
  description: 'La identidad física y digital de tu mascota. Una placa con su silueta, NFC y QR para ayudarla a volver a casa.',
  manifest: '/manifest.webmanifest',
  applicationName: 'AJolote ID',
  appleWebApp: { capable: true, title: 'AJolote ID', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#FFF8F0',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={nunito.variable}>
      <body className="font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
