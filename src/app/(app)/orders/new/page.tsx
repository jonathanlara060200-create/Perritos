import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { Flash } from '@/components/Flash'
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

        <section className="card space-y-4">
          <h2 className="text-xl">2 · Elige tu placa y su color</h2>
          {products.map((p, i) => (
            <div key={p.id} className="rounded-3xl border-2 border-axo-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">{p.name}</p>
                  <p className="muted">{p.description}</p>
                </div>
                <p className="shrink-0 text-xl font-extrabold text-axo-500">{formatMoney(p.base_price, p.currency)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.product_variants.map((v, j) => (
                  <label key={v.id} className="cursor-pointer">
                    <input type="radio" name="variant_id" value={v.id} required defaultChecked={i === 0 && j === 0} className="peer sr-only" />
                    <span className="flex items-center gap-2 rounded-full border-2 border-axo-100 px-3 py-2 text-sm font-bold peer-checked:border-axo-500 peer-checked:bg-axo-50 peer-focus-visible:ring-2">
                      <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: v.color_hex }} />
                      {v.color_name}
                      {Number(v.price_delta) !== 0 && <span className="muted">+{formatMoney(v.price_delta, p.currency)}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">3 · Nombre en la placa</h2>
          <input name="engraved_name" maxLength={40} placeholder="Si lo dejas vacío usamos el nombre de tu mascota" className="input" />
          <textarea name="customer_notes" rows={3} maxLength={1000} placeholder="Notas para el diseño (opcional). Ej. Tiene una oreja caída." className="input" />
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">4 · Datos de envío</h2>
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
