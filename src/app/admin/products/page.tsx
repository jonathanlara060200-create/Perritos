import { addVariant, createProduct, saveProduct, saveVariant } from '@/app/actions/admin'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Productos · Admin' }

type Variant = { id: string; color_name: string; color_hex: string; price_delta: number; is_active: boolean }
type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  base_price: number
  includes_dtf_uv: boolean
  is_active: boolean
  product_variants: Variant[]
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('*, product_variants(*)').order('base_price')
  const products = (data ?? []) as unknown as Product[]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Productos y precios</h1>
      <Flash sp={sp} />

      {products.map((p) => (
        <section key={p.id} className="card space-y-4">
          <form action={saveProduct.bind(null, p.id)} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nombre <span className="muted">({p.sku})</span></label>
              <input name="name" defaultValue={p.name} required className="input" />
            </div>
            <div>
              <label className="label">Precio base (MXN)</label>
              <input name="base_price" inputMode="decimal" defaultValue={p.base_price} required className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <input name="description" defaultValue={p.description ?? ''} className="input" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="includes_dtf_uv" defaultChecked={p.includes_dtf_uv} className="h-5 w-5" /> Incluye DTF UV</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={p.is_active} className="h-5 w-5" /> Visible en la tienda</label>
            <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full">Guardar producto</SubmitButton></div>
          </form>

          <div className="space-y-2 border-t border-axo-100 pt-4">
            <h3 className="font-extrabold">Colores</h3>
            {p.product_variants.map((v) => (
              <form key={v.id} action={saveVariant.bind(null, v.id)} className="flex flex-wrap items-center gap-2 rounded-2xl bg-axo-50 p-2">
                <span className="h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: v.color_hex }} />
                <input name="color_name" defaultValue={v.color_name} className="input min-w-0 flex-1 basis-28" aria-label="Nombre" />
                <input name="color_hex" defaultValue={v.color_hex} className="input w-28" aria-label="Hex" />
                <input name="price_delta" inputMode="decimal" defaultValue={v.price_delta} className="input w-24" aria-label="Extra" title="Precio extra" />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="is_active" defaultChecked={v.is_active} className="h-5 w-5" /> Activo</label>
                <SubmitButton className="btn-soft btn-sm">Guardar</SubmitButton>
              </form>
            ))}
            <form action={addVariant.bind(null, p.id)} className="flex flex-wrap items-center gap-2 border-t border-axo-100 pt-3">
              <input name="color_name" placeholder="Nuevo color" required className="input min-w-0 flex-1 basis-28" />
              <input name="color_hex" placeholder="#F4B8C8" required className="input w-28" />
              <input name="price_delta" inputMode="decimal" placeholder="+0" className="input w-24" />
              <SubmitButton className="btn-outline btn-sm">Agregar</SubmitButton>
            </form>
          </div>
        </section>
      ))}

      <section className="card space-y-3">
        <h2 className="text-xl">Nuevo producto</h2>
        <form action={createProduct} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Nombre" required className="input" />
          <input name="sku" placeholder="SKU (ej. AJID-XL)" required className="input uppercase" />
          <input name="base_price" inputMode="decimal" placeholder="Precio MXN" required className="input" />
          <input name="description" placeholder="Descripción" className="input" />
          <label className="flex items-center gap-2"><input type="checkbox" name="includes_dtf_uv" className="h-5 w-5" /> Incluye DTF UV</label>
          <SubmitButton className="btn-primary">Crear producto</SubmitButton>
        </form>
      </section>
    </div>
  )
}
