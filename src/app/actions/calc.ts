'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCalcAccess } from '@/lib/auth'
import { FILAMENTS, JOB0, num, type Job } from '@/lib/print-pricing'

type Result = { ok: true; id: string } | { ok: false; error: string }

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_PHOTO = 5 * 1024 * 1024

const text = (v: FormDataEntryValue | null, max: number) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

function refresh() {
  revalidatePath('/calculadora')
  revalidatePath('/admin/calculadora')
}

/** Crea o actualiza una ficha del catálogo de la calculadora (con foto opcional). */
export async function saveCalcProduct(fd: FormData): Promise<Result> {
  if (!(await getCalcAccess())) return { ok: false, error: 'No tienes acceso a la calculadora.' }

  const id = text(fd.get('id'), 40)
  const name = text(fd.get('name'), 120)
  if (!name) return { ok: false, error: 'Ponle un nombre al producto.' }

  let job: Job = JOB0
  try {
    const raw = JSON.parse(String(fd.get('job') ?? '{}')) as Partial<Job>
    job = Object.fromEntries(Object.keys(JOB0).map((k) => [k, String(raw[k as keyof Job] ?? '').slice(0, 20)])) as Job
  } catch {
    return { ok: false, error: 'Datos de la calculadora inválidos.' }
  }

  let colors: string[] = []
  try {
    colors = (JSON.parse(String(fd.get('colors') ?? '[]')) as string[]).filter((c) => FILAMENTS.some((f) => f.name === c)).slice(0, 4)
  } catch {
    colors = []
  }

  const finalPrice = num(String(fd.get('final_price') ?? ''))
  const suggested = num(String(fd.get('suggested_price') ?? ''))
  const row = {
    name,
    job,
    colors,
    notes: text(fd.get('notes'), 1000),
    wholesale: text(fd.get('wholesale'), 120),
    final_price: finalPrice || null,
    suggested_price: suggested || null,
    updated_at: new Date().toISOString(),
  }

  const supabase = await createClient()
  let productId = id
  if (id) {
    const { error } = await supabase.from('calc_products').update(row).eq('id', id)
    if (error) return { ok: false, error: 'No se pudo actualizar el producto.' }
  } else {
    const { data, error } = await supabase.from('calc_products').insert(row).select('id').single()
    if (error || !data) return { ok: false, error: 'No se pudo guardar el producto.' }
    productId = data.id as string
  }

  const file = fd.get('photo')
  if (file instanceof File && file.size > 0) {
    if (!TYPES[file.type]) return { ok: false, error: 'Guardado, pero la foto debe ser JPG, PNG o WebP.' }
    if (file.size > MAX_PHOTO) return { ok: false, error: 'Guardado, pero la foto pesa más de 5 MB.' }
    const path = `${productId}/${crypto.randomUUID()}.${TYPES[file.type]}`
    const { error: upErr } = await supabase.storage.from('calc-photos').upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) return { ok: false, error: 'Guardado, pero no se pudo subir la foto.' }
    const { data: old } = await supabase.from('calc_products').select('photo_path').eq('id', productId!).single()
    await supabase.from('calc_products').update({ photo_path: path }).eq('id', productId!)
    if (old?.photo_path) await supabase.storage.from('calc-photos').remove([old.photo_path as string])
  }

  refresh()
  return { ok: true, id: productId! }
}

/** Borra una ficha (solo admin). */
export async function deleteCalcProduct(id: string): Promise<Result> {
  if ((await getCalcAccess()) !== 'admin') return { ok: false, error: 'Solo el admin puede borrar productos.' }
  const supabase = await createClient()
  const { data: p } = await supabase.from('calc_products').select('photo_path').eq('id', id).single()
  const { error } = await supabase.from('calc_products').delete().eq('id', id)
  if (error) return { ok: false, error: 'No se pudo borrar.' }
  if (p?.photo_path) await supabase.storage.from('calc-photos').remove([p.photo_path as string])
  refresh()
  return { ok: true, id }
}
