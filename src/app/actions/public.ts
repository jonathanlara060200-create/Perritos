'use server'

import { headers } from 'next/headers'
import { createPublicClient } from '@/lib/supabase/public'

export type ReportResult = { ok: true } | { ok: false; error: string }

const ERRORS: Record<string, string> = {
  pet_not_found: 'No encontramos esta mascota.',
  not_lost: 'Los reportes de ubicación solo están disponibles cuando la mascota está perdida.',
  reports_disabled: 'La familia desactivó los reportes de ubicación.',
  invalid_coordinates: 'No pudimos leer la ubicación.',
  empty_report: 'Comparte tu ubicación o escribe dónde la viste.',
  rate_limited: 'Ya enviaste varios reportes hace un momento. Intenta de nuevo en unos minutos.',
}

/** Huella anónima de quien reporta: sha256(secreto + IP + mascota). Sin el secreto no revela la IP. */
async function reporterHash(secret: string, publicId: string) {
  const h = await headers()
  const ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'sin-ip'
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${ip}:${publicId.toLowerCase()}`))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Reporte público: sin cuenta, sin sesión. La función SQL valida y limita el abuso por persona. */
export async function reportLocation(input: {
  publicId: string
  lat?: number | null
  lng?: number | null
  accuracy?: number | null
  note?: string | null
}): Promise<ReportResult> {
  const lat = typeof input.lat === 'number' && Number.isFinite(input.lat) ? input.lat : null
  const lng = typeof input.lng === 'number' && Number.isFinite(input.lng) ? input.lng : null
  const accuracy = typeof input.accuracy === 'number' && Number.isFinite(input.accuracy) ? Math.max(0, input.accuracy) : null

  const secret = process.env.REPORTS_SECRET
  if (!secret) return { ok: false, error: 'Los reportes no están configurados todavía. Contacta a la familia por WhatsApp.' }
  const publicId = String(input.publicId).slice(0, 80)

  const { error } = await createPublicClient().rpc('report_pet_location_v2', {
    p_secret: secret,
    p_reporter_hash: await reporterHash(secret, publicId),
    p_public_id: publicId,
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy,
    p_note: input.note ? String(input.note).slice(0, 500) : null,
  })

  if (error) return { ok: false, error: ERRORS[error.message] ?? 'No pudimos enviar el reporte. Intenta de nuevo.' }
  return { ok: true }
}
