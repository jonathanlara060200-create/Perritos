import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { Flash } from '@/components/Flash'
import { PlateDesigner } from '@/components/PlateDesigner'
import { SubmitButton } from '@/components/SubmitButton'
import { getProfile, requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/utils'

export const metadata = { title: 'Pedir AJolote ID' }

type Variant = { id: string; color_name: string; color_hex: string; price_delta: number; is_active: boolean }
type Product = { id: string; name: string; description: string | null; base_price: number; currency: string; includes_dtf_uv: boolean; product_variants: Variant[] }

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const user = await requireUser()
  const profile = await getProfile()
  const supabase = await createClient()

  const [{ data: petRows }, { data: prodRows }] = await Promise.all([
    supabase.from('pets').select('id, name').eq('owner_id', user.id).order('created_at'),
    supabase
      .from('products')
      .select('id, name, description, base_price, currency, includes_dtf_uv, product_variants(id, color_name, color_hex, price_delta, is_active)')
      .eq('is_active', true)
      .order('base_price'),
  ])
  const pets = (petRows ?? []) as { id: string; name: string }[]
  const products = ((prodRows ?? []) as Product[]).map((p) => ({
    ...p,
    product_variants: p.product_variants.filter((v) => v.is_active),
  }))

  if (pets.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-3xl">Pedir AJolote ID</h1>
        <div className="card text-center">
          <p className="font-bold">Primero registra a tu mascota</p>
          <p className="muted mt-1">Necesitamos su perfil y su foto para diseñar su silueta.</p>
          <Link href="/pets/new" className="btn-primary mt-4">Registrar mascota</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/orders" className="text-sm font-bold text-axo-600">← Mis pedidos</Link>
      <h1 className="text-3xl">Pedir AJolote ID</h1>
      <Flash sp={sp} />

      <form action={createOrder} className="space-y-6">
        <section className="card space-y-3">
          <h2 className="text-xl">1 · ¿Para quién es?</h2>
          <select name="pet_id" defaultValue={sp.pet ?? pets[0].id} className="input" required>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="muted">Usaremos la foto principal de su perfil para diseñar la silueta. <Link href="/pets" className="font-bold text-axo-600">Revisa que tenga foto</Link>.</p>
        </section>

        <PlateDesigner
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            base_price: Number(p.base_price),
            currency: p.currency,
            variants: p.product_variants.map((v) => ({ id: v.id, color_name: v.color_name, color_hex: v.color_hex, price_delta: Number(v.price_delta) })),
          }))}
        />

        <section className="card space-y-3">
          <h2 className="text-xl">Notas para el diseño</h2>
          <textarea name="customer_notes" rows={3} maxLength={1000} placeholder="Opcional. Ej. Tiene una oreja caída." className="input" />
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">Datos de envío</h2>
          <input name="shipping_name" required defaultValue={profile?.full_name ?? ''} placeholder="Nombre de quien recibe" className="input" autoComplete="name" />
          <input name="shipping_phone" required defaultValue={profile?.phone ?? ''} inputMode="tel" placeholder="Teléfono" className="input" autoComplete="tel" />
          <input name="street" required placeholder="Calle y número" className="input" autoComplete="address-line1" />
          <input name="neighborhood" required placeholder="Colonia" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <input name="city" required placeholder="Ciudad" className="input" autoComplete="address-level2" />
            <input name="state" required placeholder="Estado" className="input" autoComplete="address-level1" />
          </div>
          <input name="zip" required inputMode="numeric" maxLength={5} placeholder="Código postal" className="input" autoComplete="postal-code" />
          <p className="muted">Tu dirección solo se usa para el envío y nunca se muestra en el perfil público.</p>
        </section>

        <SubmitButton className="btn-primary w-full py-4 text-lg" pendingText="Creando pedido…">Confirmar pedido</SubmitButton>
        <p className="muted text-center">El pago se hace después de confirmar. Te mostraremos cómo.</p>
      </form>
    </div>
  )
}
