'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { ITEM_TYPE, CUSTOM_STATUS, PARTS, PRICE_PER_LETTER, countPieces, type PartKey } from '@/lib/clickers'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { str } from '@/lib/utils'

const BACK = '/admin/clickers'

function readFields(fd: FormData) {
  const money = (k: string) => Math.min(9_999_999, Math.max(0, Number(String(fd.get(k) ?? '').replace(/[$,\s]/g, '')) || 0))
  const type = String(fd.get('item_type') ?? 'clicker')
  const due = str(fd.get('due_date'))
  const controlName = str(fd.get('control_name'))?.slice(0, 30) ?? null
  // Precio vacío (o 0) en un clicker = $20 por letra; si lo escribes tú, se respeta.
  const typed = money('price')
  const price = typed > 0 ? typed : type === 'clicker' ? countPieces(controlName) * PRICE_PER_LETTER : 0
  return {
    customer_name: (str(fd.get('customer_name')) ?? '').slice(0, 120),
    contact: str(fd.get('contact'))?.slice(0, 120) ?? null,
    item_type: type in ITEM_TYPE ? type : 'clicker',
    control_name: controlName,
    base_color: str(fd.get('base_color'))?.slice(0, 40) ?? null,
    key_color: str(fd.get('key_color'))?.slice(0, 40) ?? null,
    letter_color: str(fd.get('letter_color'))?.slice(0, 40) ?? null,
    has_nfc: fd.get('has_nfc') === 'on',
    price,
    paid_amount: money('paid_amount'),
    due_date: due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    description: str(fd.get('description'))?.slice(0, 500) ?? null,
    notes: str(fd.get('notes'))?.slice(0, 1000) ?? null,
  }
}

export async function createCustomOrder(fd: FormData) {
  await requireAdmin()
  const row = readFields(fd)
  if (!row.customer_name) go(BACK, 'error', 'Escribe quién hizo el pedido.')
  const supabase = await createClient()
  const { error } = await supabase.from('custom_orders').insert(row)
  if (error) go(BACK, 'error', 'No pudimos guardar el pedido. ¿Ya corriste la migración custom_orders en Supabase?')
  revalidatePath(BACK)
  go(BACK, 'ok', 'Pedido guardado.')
}

export async function updateCustomOrder(id: string, fd: FormData) {
  await requireAdmin()
  const row = readFields(fd)
  if (!row.customer_name) go(BACK, 'error', 'Escribe quién hizo el pedido.')
  const status = String(fd.get('status') ?? 'pending')
  const supabase = await createClient()
  const { error } = await supabase
    .from('custom_orders')
    .update({ ...row, status: status in CUSTOM_STATUS ? status : 'pending' })
    .eq('id', id)
  if (error) go(BACK, 'error', 'No pudimos actualizar el pedido.')
  revalidatePath(BACK)
  go(BACK, 'ok', 'Pedido actualizado.')
}

/** Marca/desmarca una parte (base, teclas, letras). Mueve el estado solo cuando tiene sentido. */
export async function togglePart(id: string, part: PartKey) {
  await requireAdmin()
  if (!PARTS.some((p) => p.key === part)) return
  const supabase = await createClient()
  const { data: cur } = await supabase
    .from('custom_orders')
    .select('base_done, keys_done, letters_done, status')
    .eq('id', id)
    .single()
  if (!cur) return

  const next = { base_done: !!cur.base_done, keys_done: !!cur.keys_done, letters_done: !!cur.letters_done }
  next[part] = !next[part]
  const all = next.base_done && next.keys_done && next.letters_done
  const any = next.base_done || next.keys_done || next.letters_done

  let status: string = cur.status
  if (all && (status === 'pending' || status === 'in_progress')) status = 'ready'
  else if (!all && status === 'ready') status = 'in_progress'
  else if (any && status === 'pending') status = 'in_progress'

  await supabase.from('custom_orders').update({ ...next, status }).eq('id', id)
  revalidatePath(BACK)
}

export async function setCustomStatus(id: string, status: string) {
  await requireAdmin()
  if (!(status in CUSTOM_STATUS)) return
  const supabase = await createClient()
  await supabase.from('custom_orders').update({ status }).eq('id', id)
  revalidatePath(BACK)
}

/** Marca el pedido como pagado por completo (paid_amount = price). */
export async function markCustomPaid(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data: cur } = await supabase.from('custom_orders').select('price').eq('id', id).single()
  if (!cur) return
  await supabase.from('custom_orders').update({ paid_amount: cur.price }).eq('id', id)
  revalidatePath(BACK)
}

export async function deleteCustomOrder(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('custom_orders').delete().eq('id', id)
  if (error) go(BACK, 'error', 'No pudimos borrar el pedido.')
  revalidatePath(BACK)
  go(BACK, 'ok', 'Pedido borrado.')
}
