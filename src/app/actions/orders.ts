'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getProfile, requireUser } from '@/lib/auth'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { MAX_NAME_LENGTH, filamentOf } from '@/lib/plate'
import { createPreference, mpEnabled } from '@/lib/mercadopago'
import { siteUrl, str } from '@/lib/utils'

const schema = z.object({
  pet_id: z.string().uuid('Elige a tu mascota.'),
  shipping_name: z.string().min(2, 'Escribe el nombre de quien recibe.').max(120),
  shipping_phone: z.string().min(8, 'Escribe un teléfono de contacto.').max(30),
  street: z.string().min(3, 'Escribe la calle y número.').max(160),
  neighborhood: z.string().min(2, 'Escribe la colonia.').max(100),
  city: z.string().min(2, 'Escribe la ciudad.').max(100),
  state: z.string().min(2, 'Escribe el estado.').max(100),
  zip: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos.'),
})

type Variant = { id: string; color_name: string; price_delta: number; is_active: boolean }

/**
 * Pedido simple: el cliente solo elige a su mascota (con foto) y el nombre.
 * El diseño (silueta, colores, tipografía) lo hace Ajolote de Bolsillo a partir de la foto,
 * así que no se envían silueta, tamaño, letra ni colores: la base los acepta vacíos.
 */
export async function createOrder(fd: FormData) {
  await requireUser()
  const parsed = schema.safeParse({
    pet_id: fd.get('pet_id'),
    shipping_name: str(fd.get('shipping_name')) ?? '',
    shipping_phone: str(fd.get('shipping_phone')) ?? '',
    street: str(fd.get('street')) ?? '',
    neighborhood: str(fd.get('neighborhood')) ?? '',
    city: str(fd.get('city')) ?? '',
    state: str(fd.get('state')) ?? '',
    zip: str(fd.get('zip')) ?? '',
  })
  const back = `/orders/new?pet=${typeof fd.get('pet_id') === 'string' ? fd.get('pet_id') : ''}`
  if (!parsed.success) go(back, 'error', parsed.error.issues[0].message)
  const v = parsed.data
  const engraved = str(fd.get('engraved_name'))
  if (engraved && engraved.length > MAX_NAME_LENGTH) go(back, 'error', `El nombre en la placa puede tener hasta ${MAX_NAME_LENGTH} letras.`)

  const supabase = await createClient()

  // La silueta se dibuja con su foto: sin foto no se puede pedir.
  const { data: pet } = await supabase.from('pets').select('id, main_photo_path').eq('id', v.pet_id).maybeSingle()
  if (!pet) go(back, 'error', 'No encontramos a tu mascota.')
  if (!pet.main_photo_path) go(`/pets/${v.pet_id}/edit`, 'error', 'Sube una foto de tu mascota para que podamos diseñar su placa.')

  // Placa estándar: el producto activo más barato y su variante base (sin costo extra).
  const { data: prods } = await supabase
    .from('products')
    .select('id, base_price, product_variants(id, color_name, price_delta, is_active)')
    .eq('is_active', true)
    .order('base_price')
  const variants = ((prods ?? []) as { product_variants: Variant[] }[])
    .flatMap((p) => p.product_variants)
    .filter((x) => x.is_active && filamentOf(x.color_name))
    .sort((a, b) => Number(a.price_delta) - Number(b.price_delta))
  const variant = variants[0]
  if (!variant) go(back, 'error', 'Por ahora no podemos tomar pedidos. Escríbenos por WhatsApp.')

  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_pet_id: v.pet_id,
    p_variant_id: variant.id,
    p_engraved_name: engraved,
    p_shipping_name: v.shipping_name,
    p_shipping_phone: v.shipping_phone,
    p_shipping_address: { street: v.street, neighborhood: v.neighborhood, city: v.city, state: v.state, zip: v.zip },
    p_letter_color: null,
    p_zone_colors: null,
    p_customer_notes: str(fd.get('customer_notes')),
  })
  if (error || !orderId) go(back, 'error', 'No pudimos crear tu pedido. Revisa los datos e intenta de nuevo.')

  go(`/orders/${orderId}`, 'ok', '¡Pedido creado! Te mostraremos el diseño de su placa para que lo apruebes antes de imprimir.')
}

/** Crea el cobro en Mercado Pago y manda al cliente a su página de pago. */
export async function payOrder(orderId: string) {
  const user = await requireUser()
  const back = `/orders/${orderId}`
  if (!mpEnabled()) go(back, 'error', 'El pago en línea todavía no está disponible. Usa las instrucciones de transferencia.')

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, total, currency')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) go('/orders', 'error', 'No encontramos ese pedido.')
  if (order.status !== 'pending_payment') go(back, 'error', 'Este pedido ya no está pendiente de pago.')

  let link: string
  try {
    link = await createPreference({
      orderId: order.id,
      orderNumber: order.order_number,
      title: `AJolote ID · pedido #${order.order_number}`,
      amount: Number(order.total),
      currency: order.currency,
      payerEmail: user.email,
      siteUrl: siteUrl(),
    })
  } catch (e) {
    const isAdmin = (await getProfile())?.role === 'admin'
    const detail = isAdmin && e instanceof Error ? ` [admin: ${e.message}]` : ''
    go(back, 'error', `No pudimos abrir el pago en línea. Intenta de nuevo o usa la transferencia.${detail}`)
  }
  redirect(link)
}
