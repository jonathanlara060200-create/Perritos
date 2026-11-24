import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { Flash } from '@/components/Flash'
import { PetAvatar } from '@/components/PetAvatar'
import { SubmitButton } from '@/components/SubmitButton'
import { getProfile, requireUser } from '@/lib/auth'
import { MAX_NAME_LENGTH } from '@/lib/plate'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/utils'

export const metadata = { title: 'Pedir AJolote ID' }

type Pet = { id: string; name: string; main_photo_path: string | null }

const STEPS = [
  { n: '1', title: 'Elige a tu mascota', text: 'Usamos la foto de su perfil para dibujar su silueta.' },
  { n: '2', title: 'Escribe su nombre', text: 'Es el nombre que va en la placa.' },
  { n: '3', title: 'Nosotros la diseñamos', text: 'Te mostramos el diseño para que lo apruebes antes de imprimir.' },
]

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const user = await requireUser()
  const profile = await getProfile()
  const supabase = await createClient()

  const [{ data: petRows }, { data: prodRows }] = await Promise.all([
    supabase.from('pets').select('id, name, main_photo_path').eq('owner_id', user.id).order('created_at'),
    supabase.from('products').select('base_price, currency').eq('is_active', true).order('base_price').limit(1),
  ])
  const pets = (petRows ?? []) as Pet[]
  const product = (prodRows ?? [])[0] as { base_price: number; currency: string } | undefined

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

  const withPhoto = pets.filter((p) => p.main_photo_path)
  const preselected = withPhoto.find((p) => p.id === sp.pet)?.id ?? withPhoto[0]?.id

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/orders" className="text-sm font-bold text-axo-600">← Mis pedidos</Link>
      <h1 className="text-3xl">Pedir AJolote ID</h1>
      <Flash sp={sp} />

      <section className="card space-y-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-axo-500 font-extrabold text-white">{s.n}</span>
            <div>
              <p className="font-bold">{s.title}</p>
              <p className="muted">{s.text}</p>
            </div>
          </div>
        ))}
        {product && (
          <p className="pt-1 text-center text-2xl font-extrabold text-axo-500">{formatMoney(Number(product.base_price), product.currency)}</p>
        )}
      </section>

      <form action={createOrder} className="space-y-6">
        <section className="card space-y-3">
          <h2 className="text-xl">1 · ¿Para quién es?</h2>
          <div className="grid gap-3">
            {pets.map((p) => {
              const hasPhoto = Boolean(p.main_photo_path)
              return hasPhoto ? (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-axo-100 bg-white p-3 has-[:checked]:border-axo-500 has-[:checked]:bg-axo-50">
                  <input type="radio" name="pet_id" value={p.id} defaultChecked={p.id === preselected} required className="h-5 w-5 accent-axo-500" />
                  <PetAvatar path={p.main_photo_path} name={p.name} className="h-16 w-16 shrink-0 rounded-2xl" />
                  <span className="font-bold">{p.name}</span>
                </label>
              ) : (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-axo-100 bg-white p-3 opacity-80">
                  <PetAvatar path={null} name={p.name} className="h-16 w-16 shrink-0 rounded-2xl" />
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <Link href={`/pets/${p.id}/edit`} className="text-sm font-bold text-axo-600">Sube su foto para pedir su placa →</Link>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="muted">Tip: una foto de frente, con buena luz y donde se vea completa su carita nos ayuda a que la silueta quede idéntica.</p>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">2 · Nombre en la placa</h2>
          <input
            name="engraved_name"
            maxLength={MAX_NAME_LENGTH}
            placeholder="Si lo dejas vacío usamos el nombre de tu mascota"
            className="input"
          />
          <p className="muted">Hasta {MAX_NAME_LENGTH} letras.</p>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">Notas para el diseño</h2>
          <textarea name="customer_notes" rows={3} maxLength={1000} placeholder="Opcional. Ej. Tiene una oreja caída, o me gustaría en tonos rosas." className="input" />
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

        {withPhoto.length > 0 ? (
          <SubmitButton className="btn-primary w-full py-4 text-lg" pendingText="Creando pedido…">Confirmar pedido</SubmitButton>
        ) : (
          <p className="card text-center font-bold">Sube la foto de tu mascota para poder pedir su placa.</p>
        )}
        <p className="muted text-center">El pago se hace después de confirmar. Te mostraremos cómo.</p>
      </form>
    </div>
  )
}
