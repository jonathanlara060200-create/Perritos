'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { str } from '@/lib/utils'

const schema = z.object({
  pet_id: z.string().uuid('Elige una mascota.'),
  variant_id: z.string().uuid('Elige un producto y un color.'),
  shipping_name: z.string().min(2, 'Escribe el nombre de quien recibe.').max(120),
  shipping_phone: z.string().min(8, 'Escribe un teléfono de contacto.').max(30),
  street: z.string().min(3, 'Escribe la calle y número.').max(160),
  neighborhood: z.string().min(2, 'Escribe la colonia.').max(100),
  city: z.string().min(2, 'Escribe la ciudad.').max(100),
  state: z.string().min(2, 'Escribe el estado.').max(100),
  zip: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos.'),
})

export async function createOrder(fd: FormData) {
  await requireUser()
  const parsed = schema.safeParse({
    pet_id: fd.get('pet_id'),
    variant_id: fd.get('variant_id'),
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

  const supabase = await createClient()
  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_pet_id: v.pet_id,
    p_variant_id: v.variant_id,
    p_engraved_name: str(fd.get('engraved_name')),
    p_shipping_name: v.shipping_name,
    p_shipping_phone: v.shipping_phone,
    p_shipping_address: { street: v.street, neighborhood: v.neighborhood, city: v.city, state: v.state, zip: v.zip },
    p_customer_notes: str(fd.get('customer_notes')),
  })
  if (error || !orderId) go(back, 'error', 'No pudimos crear tu pedido. Revisa los datos e intenta de nuevo.')

  go(`/orders/${orderId}`, 'ok', '¡Pedido creado! Sigue las instrucciones de pago para que lo mandemos a producción.')
}
