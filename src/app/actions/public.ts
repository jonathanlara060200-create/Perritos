'use server'

import { createPublicClient } from '@/lib/supabase/public'

export type ReportResult = { ok: true } | { ok: false; error: string }

const ERRORS: Record<string, string> = {
  pet_not_found: 'No encontramos esta mascota.',
  reports_disabled: 'La familia desactivó los reportes de ubicación.',
  invalid_coordinates: 'No pudimos leer la ubicación.',
  empty_report: 'Comparte tu ubicación o escribe dónde la viste.',
  rate_limited: 'Ya recibimos varios reportes hace un momento. Intenta de nuevo en unos minutos.',
}

/** Reporte público: sin cuenta, sin sesión. La función SQL valida y limita el abuso. */
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

  const { error } = await createPublicClient().rpc('report_pet_location', {
    p_public_id: String(input.publicId).slice(0, 80),
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy,
    p_note: input.note ? String(input.note).slice(0, 500) : null,
  })

  if (error) return { ok: false, error: ERRORS[error.message] ?? 'No pudimos enviar el reporte. Intenta de nuevo.' }
  return { ok: true }
}
