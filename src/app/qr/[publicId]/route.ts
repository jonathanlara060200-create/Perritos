import QRCode from 'qrcode'
import { petUrl } from '@/lib/utils'

// Imagen QR de la URL permanente. Solo codifica una URL que ya es pública (está impresa en la placa).
export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  if (!/^[a-z0-9-]{3,80}$/.test(publicId)) return new Response('Not found', { status: 404 })

  const url = new URL(req.url)
  const png = url.searchParams.get('format') === 'png'
  const target = petUrl(publicId, url.searchParams.get('s') === 'n' ? 'n' : 'q')
  const filename = `qr-${publicId}.${png ? 'png' : 'svg'}`
  const headers: Record<string, string> = {
    'Cache-Control': 'public, max-age=86400',
    ...(url.searchParams.get('download') === '1' ? { 'Content-Disposition': `attachment; filename="${filename}"` } : {}),
  }

  if (png) {
    const buf = await QRCode.toBuffer(target, { errorCorrectionLevel: 'Q', margin: 2, width: 1024 })
    return new Response(new Uint8Array(buf), { headers: { ...headers, 'Content-Type': 'image/png' } })
  }
  const svg = await QRCode.toString(target, { type: 'svg', errorCorrectionLevel: 'Q', margin: 2 })
  return new Response(svg, { headers: { ...headers, 'Content-Type': 'image/svg+xml' } })
}
