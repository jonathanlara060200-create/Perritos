'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { str } from '@/lib/utils'

const ORDER_STATUSES = ['pending_payment', 'paid', 'info_pending', 'design_pending', 'design_approved', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled']
const TAG_STATUSES = ['available', 'reserved', 'in_production', 'produced', 'shipped', 'active', 'lost', 'deactivated', 'replaced']

/* ---------- Pedidos ---------- */

export async function updateOrder(orderId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/orders/${orderId}`
  const status = String(fd.get('status') ?? '')
  if (!ORDER_STATUSES.includes(status)) go(back, 'error', 'Estado no válido.')

  const supabase = await createClient()
  const { data: current } = await supabase.from('orders').select('status, shipped_at, delivered_at').eq('id', orderId).single()
  if (!current) go('/admin/orders', 'error', 'Pedido no encontrado.')

  const shippingCost = Number(String(fd.get('shipping_cost') ?? '0').replace(/[$,\s]/g, '')) || 0
  const { data: items } = await supabase.from('order_items').select('unit_price').eq('order_id', orderId)
  const subtotal = (items ?? []).reduce((s: number, i: { unit_price: number }) => s + Number(i.unit_price), 0)

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({
      status,
      tracking_number: str(fd.get('tracking_number')),
      shipping_carrier: str(fd.get('shipping_carrier')),
      shipping_cost: Math.max(0, shippingCost),
      subtotal,
      total: subtotal + Math.max(0, shippingCost),
      shipped_at: status === 'shipped' || status === 'delivered' ? (current.shipped_at ?? now) : current.shipped_at,
      delivered_at: status === 'delivered' ? (current.delivered_at ?? now) : current.delivered_at,
    })
    .eq('id', orderId)
  if (error) go(back, 'error', 'No pudimos guardar el pedido.')
  revalidatePath(back)
  go(back, 'ok', 'Pedido actualizado.')
}

export async function registerPayment(orderId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/orders/${orderId}`
  const amount = Number(String(fd.get('amount') ?? '').replace(/[$,\s]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) go(back, 'error', 'El monto no es válido.')

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('payments').insert({
    order_id: orderId,
    provider: str(fd.get('provider')) ?? 'manual',
    provider_ref: str(fd.get('provider_ref')),
    amount,
    status: 'paid',
    paid_at: now,
  })
  if (error) go(back, 'error', 'No pudimos registrar el pago.')

  await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId).eq('status', 'pending_payment')
  revalidatePath(back)
  go(back, 'ok', 'Pago registrado.')
}

export async function addNote(entityType: 'order' | 'pet' | 'tag', entityId: string, back: string, fd: FormData) {
  const admin = await requireAdmin()
  const note = str(fd.get('note'))
  if (!note) go(back, 'error', 'Escribe la nota.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('admin_notes')
    .insert({ entity_type: entityType, entity_id: entityId, author_id: admin.id, note: note.slice(0, 2000) })
  if (error) go(back, 'error', 'No pudimos guardar la nota.')
  go(back, 'ok', 'Nota guardada.')
}

export async function saveDesign(designId: string, orderId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/orders/${orderId}`
  const num = (k: string) => {
    const v = str(fd.get(k))
    if (!v) return null
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const supabase = await createClient()
  const approve = fd.get('approve') === 'on'
  const { data: cur } = await supabase.from('tag_designs').select('approved_at').eq('id', designId).single()

  const { error } = await supabase
    .from('tag_designs')
    .update({
      silhouette_type: str(fd.get('silhouette_type')),
      width_mm: num('width_mm'),
      height_mm: num('height_mm'),
      thickness_mm: num('thickness_mm'),
      pla_color: str(fd.get('pla_color')),
      engraved_name: str(fd.get('engraved_name'))?.slice(0, 40) ?? null,
      dtf_uv: fd.get('dtf_uv') === 'on',
      notes: str(fd.get('notes')),
      approved_at: approve ? (cur?.approved_at ?? new Date().toISOString()) : null,
    })
    .eq('id', designId)
  if (error) go(back, 'error', 'No pudimos guardar el diseño.')
  go(back, 'ok', 'Datos de fabricación guardados.')
}

/** Asigna una placa disponible a un artículo del pedido: queda reservada para esa mascota. */
export async function assignTagToItem(orderId: string, itemId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/orders/${orderId}`
  const tagId = str(fd.get('tag_id'))
  if (!tagId) go(back, 'error', 'Elige una placa disponible.')

  const supabase = await createClient()
  const [{ data: item }, { data: order }, { data: tag }] = await Promise.all([
    supabase.from('order_items').select('id, pet_id, tag_id, product_variants(color_name), products(includes_dtf_uv)').eq('id', itemId).single(),
    supabase.from('orders').select('customer_id').eq('id', orderId).single(),
    supabase.from('tags').select('id, status').eq('id', tagId).single(),
  ])
  if (!item || !order || !tag) go(back, 'error', 'No encontramos el artículo o la placa.')
  if (item.tag_id) go(back, 'error', 'Este artículo ya tiene una placa asignada.')
  if (tag.status !== 'available') go(back, 'error', 'Esa placa ya no está disponible.')

  const variant = item.product_variants as unknown as { color_name: string } | null
  const product = item.products as unknown as { includes_dtf_uv: boolean } | null

  const { error } = await supabase
    .from('tags')
    .update({
      pet_id: item.pet_id,
      owner_id: order.customer_id,
      status: 'reserved',
      color: variant?.color_name ?? null,
      dtf_uv: product?.includes_dtf_uv ?? false,
    })
    .eq('id', tagId)
    .eq('status', 'available')
  if (error) go(back, 'error', 'No pudimos asignar la placa.')

  await supabase.from('order_items').update({ tag_id: tagId }).eq('id', itemId)
  await supabase.from('tag_designs').update({ tag_id: tagId }).eq('order_item_id', itemId)
  revalidatePath(back)
  go(back, 'ok', 'Placa asignada y reservada para la mascota.')
}

/* ---------- Placas ---------- */

export async function updateTag(tagId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/tags/${tagId}`
  const status = String(fd.get('status') ?? '')
  if (!TAG_STATUSES.includes(status)) go(back, 'error', 'Estado no válido.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('tags')
    .update({
      status,
      color: str(fd.get('color')),
      material: str(fd.get('material')) ?? 'PLA',
      version: str(fd.get('version')) ?? 'v1',
      model: str(fd.get('model')) ?? 'AJolote ID',
      dtf_uv: fd.get('dtf_uv') === 'on',
      notes: str(fd.get('notes')),
    })
    .eq('id', tagId)
  if (error) go(back, 'error', 'No pudimos guardar la placa.')
  go(back, 'ok', 'Placa actualizada.')
}

/** Borra una placa que no se necesita. Solo si no está ligada a una mascota. */
export async function deleteTag(tagId: string, back: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data: tag } = await supabase.from('tags').select('id, tag_code, pet_id').eq('id', tagId).maybeSingle()
  if (!tag) go('/admin/tags', 'error', 'Esa placa ya no existe.')
  if (tag.pet_id) {
    go(back, 'error', `${tag.tag_code} está ligada a una mascota. Primero desactívala o desvincúlala; no se borra para no dejar un QR muerto.`)
  }
  const { data: deleted, error } = await supabase.from('tags').delete().eq('id', tagId).select('id')
  if (error || !deleted || deleted.length === 0) go(back, 'error', 'No pudimos borrar la placa.')
  revalidatePath('/admin/tags')
  go('/admin/tags', 'ok', `Placa ${tag.tag_code} borrada.`)
}

export async function markNfcWritten(tagId: string, locked: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('tags').update({ nfc_written_at: new Date().toISOString(), nfc_locked: locked }).eq('id', tagId)
  revalidatePath(`/admin/tags/${tagId}`)
}

export async function saveNfcUid(tagId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/tags/${tagId}`
  const uid = str(fd.get('nfc_uid'))?.toUpperCase().replace(/[^0-9A-F:]/g, '') ?? null
  const supabase = await createClient()
  const { error } = await supabase.from('tags').update({ nfc_uid: uid }).eq('id', tagId)
  if (error) go(back, 'error', error.code === '23505' ? 'Ese UID de chip ya está en otra placa.' : 'No pudimos guardar el UID.')
  go(back, 'ok', 'UID del chip guardado.')
}

/** Reemplazo: la placa vieja queda "replaced" y la nueva hereda mascota y dueño. El perfil e historial no cambian. */
export async function replaceTag(oldTagId: string, fd: FormData) {
  await requireAdmin()
  const back = `/admin/tags/${oldTagId}`
  const newId = str(fd.get('new_tag_id'))
  if (!newId) go(back, 'error', 'Elige la placa nueva (disponible).')

  const supabase = await createClient()
  const [{ data: oldTag }, { data: newTag }] = await Promise.all([
    supabase.from('tags').select('id, pet_id, owner_id, color, dtf_uv, status').eq('id', oldTagId).single(),
    supabase.from('tags').select('id, status').eq('id', newId).single(),
  ])
  if (!oldTag || !newTag) go(back, 'error', 'No encontramos las placas.')
  if (!oldTag.pet_id) go(back, 'error', 'La placa anterior no tiene mascota asociada.')
  if (newTag.status !== 'available') go(back, 'error', 'La placa nueva no está disponible.')

  await supabase.from('tags').update({ status: 'replaced' }).eq('id', oldTagId)
  const { error } = await supabase
    .from('tags')
    .update({
      pet_id: oldTag.pet_id,
      owner_id: oldTag.owner_id,
      color: oldTag.color,
      dtf_uv: oldTag.dtf_uv,
      status: 'reserved',
      replaces_tag_id: oldTagId,
    })
    .eq('id', newId)
  if (error) go(back, 'error', 'No pudimos asignar la placa nueva.')
  go(`/admin/tags/${newId}`, 'ok', 'Placa reemplazada. La mascota conserva su perfil, enlace e historial.')
}

/* ---------- Mascotas ---------- */

export async function setPetActive(petId: string, active: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('pets').update({ is_active: active }).eq('id', petId)
  if (error) go('/admin/pets', 'error', 'No pudimos cambiar el estado.')
  revalidatePath('/admin/pets')
  go('/admin/pets', 'ok', active ? 'Perfil reactivado.' : 'Perfil desactivado: su QR/NFC ya no muestran datos.')
}

/* ---------- Productos ---------- */

export async function saveProduct(productId: string, fd: FormData) {
  await requireAdmin()
  const price = Number(String(fd.get('base_price') ?? '').replace(/[$,\s]/g, ''))
  if (!Number.isFinite(price) || price < 0) go('/admin/products', 'error', 'El precio no es válido.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({
      name: str(fd.get('name')) ?? 'AJolote ID',
      description: str(fd.get('description')),
      base_price: price,
      includes_dtf_uv: fd.get('includes_dtf_uv') === 'on',
      is_active: fd.get('is_active') === 'on',
    })
    .eq('id', productId)
  if (error) go('/admin/products', 'error', 'No pudimos guardar el producto.')
  revalidatePath('/')
  go('/admin/products', 'ok', 'Producto actualizado.')
}

export async function saveVariant(variantId: string, fd: FormData) {
  await requireAdmin()
  const hex = str(fd.get('color_hex')) ?? ''
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) go('/admin/products', 'error', 'El color debe ser un hex como #F4B8C8.')
  const delta = Number(String(fd.get('price_delta') ?? '0').replace(/[$,\s]/g, '')) || 0
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_variants')
    .update({ color_name: str(fd.get('color_name')) ?? 'Color', color_hex: hex, price_delta: delta, is_active: fd.get('is_active') === 'on' })
    .eq('id', variantId)
  if (error) go('/admin/products', 'error', 'No pudimos guardar el color.')
  go('/admin/products', 'ok', 'Color actualizado.')
}

export async function addVariant(productId: string, fd: FormData) {
  await requireAdmin()
  const hex = str(fd.get('color_hex')) ?? ''
  const name = str(fd.get('color_name'))
  if (!name) go('/admin/products', 'error', 'Escribe el nombre del color.')
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) go('/admin/products', 'error', 'El color debe ser un hex como #F4B8C8.')
  const supabase = await createClient()
  const { error } = await supabase.from('product_variants').insert({
    product_id: productId,
    color_name: name,
    color_hex: hex,
    price_delta: Number(String(fd.get('price_delta') ?? '0').replace(/[$,\s]/g, '')) || 0,
  })
  if (error) go('/admin/products', 'error', error.code === '23505' ? 'Ya existe un color con ese nombre.' : 'No pudimos agregar el color.')
  go('/admin/products', 'ok', 'Color agregado.')
}

export async function createProduct(fd: FormData) {
  await requireAdmin()
  const name = str(fd.get('name'))
  const sku = str(fd.get('sku'))?.toUpperCase()
  const price = Number(String(fd.get('base_price') ?? '').replace(/[$,\s]/g, ''))
  if (!name || !sku) go('/admin/products', 'error', 'Escribe nombre y SKU.')
  if (!Number.isFinite(price) || price < 0) go('/admin/products', 'error', 'El precio no es válido.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .insert({ name, sku, base_price: price, description: str(fd.get('description')), includes_dtf_uv: fd.get('includes_dtf_uv') === 'on' })
  if (error) go('/admin/products', 'error', error.code === '23505' ? 'Ese SKU ya existe.' : 'No pudimos crear el producto.')
  go('/admin/products', 'ok', 'Producto creado. Agrégale colores para que se pueda pedir.')
}

/* ---------- Ajustes ---------- */

export async function saveSettings(fd: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const rows = ['payment_instructions', 'support_whatsapp'].map((key) => ({
    key,
    value: String(fd.get(key) ?? '').trim().slice(0, 1000),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
  if (error) go('/admin/settings', 'error', 'No pudimos guardar los ajustes.')
  go('/admin/settings', 'ok', 'Ajustes guardados.')
}
