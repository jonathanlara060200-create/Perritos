export const TZ = 'America/Mexico_City'
/** México ya no usa horario de verano; offset fijo para interpretar fechas escritas por el usuario. */
export const MX_OFFSET = '-06:00'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

/** URL permanente de la mascota. s = 'n' (NFC) o 'q' (QR) solo para métricas. */
export function petUrl(publicId: string, source?: 'n' | 'q') {
  return `${siteUrl()}/pet/${publicId}${source ? `?s=${source}` : ''}`
}

export function photoUrl(path?: string | null) {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pet-photos/${path}`
}

export function petAge(birth?: string | null): string | null {
  if (!birth) return null
  const b = new Date(birth + 'T00:00:00')
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return null
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const y = Math.floor(months / 12)
  const m = months % 12
  return `${y} ${y === 1 ? 'año' : 'años'}${m ? ` y ${m} ${m === 1 ? 'mes' : 'meses'}` : ''}`
}

export function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return 'justo ahora'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return rtf.format(Math.round(diff / (86400 * 30)), 'month')
}

export function formatDate(iso?: string | null, withTime = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function formatMoney(n: number | string | null | undefined, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n ?? 0))
}

function digits(s: string) {
  return s.replace(/\D/g, '')
}

/** wa.me necesita código de país: si son 10 dígitos asumimos México (52). */
export function waLink(number: string, text?: string) {
  let d = digits(number)
  if (d.length === 10) d = '52' + d
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const telLink = (number: string) => `tel:+${digits(number).length === 10 ? '52' : ''}${digits(number)}`

/** Evita open-redirects: solo rutas internas. */
export function safeNext(v: FormDataEntryValue | string | null | undefined, fallback = '/dashboard') {
  const s = typeof v === 'string' ? v : ''
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback
}

export const str = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}
