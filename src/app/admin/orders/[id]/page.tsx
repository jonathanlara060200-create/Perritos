import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addNote, assignTagToItem, registerPayment, saveDesign, updateOrder } from '@/app/actions/admin'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
import { ORDER_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney, photoUrl } from '@/lib/utils'

export const metadata = { title: 'Pedido · Admin' }

type Design = {
  id: string
  silhouette_type: string | null
  width_mm: number | null
  height_mm: number | null
  thickness_mm: number | null
  pla_color: string | null
  engraved_name: string | null
  dtf_uv: boolean
  notes: string | null
  approved_at: string | null
}
type Item = {
  id: string
  unit_price: number
  tag_id: string | null
  products: { name: string } | null
  product_variants: { color_name: string } | null
  pets: { id: string; name: string; public_id: string; main_photo_path: string | null } | null
  tags: { id: string; tag_code: string } | null
  tag_designs: Design[] | Design | null
}
type Order = {
  id: string
  order_number: number
  status: string
  subtotal: number
  shipping_cost: number
  total: number
  currency: string
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: { street?: string; neighborhood?: string; city?: string; state?: string; zip?: string } | null
  tracking_number: string | null
  shipping_carrier: string | null
  customer_notes: string | null
  created_at: string
  profiles: { full_name: string | null; phone: string | null } | null
  order_items: Item[]
}

export default async function AdminOrder({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select(
      '*, profiles(full_name, phone), order_items(id, unit_price, tag_id, products(name), product_variants(color_name), pets(id, name, public_id, main_photo_path), tags!order_items_tag_id_fkey(id, tag_code), tag_designs(*))',
    )
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()
  const order = data as unknown as Order

  const [{ data: payments }, { data: notes }, { data: available }] = await Promise.all([
    supabase.from('payments').select('id, amount, status, provider, provider_ref, paid_at').eq('order_id', id).order('created_at'),
    supabase.from('admin_notes').select('id, note, created_at, profiles(full_name)').eq('entity_type', 'order').eq('entity_id', id).order('created_at', { ascending: false }),
    supabase.from('tags').select('id, tag_code').eq('status', 'available').order('tag_code').limit(100),
  ])
  const back = `/admin/orders/${id}`
  const addr = order.shipping_address
  const paid = ((payments ?? []) as { amount: number; status: string }[]).filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm font-bold text-axo-600">← Pedidos</Link>
      <Flash sp={sp} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Pedido #{order.order_number}</h1>
        <span className="chip">{ORDER_STATUS[order.status]}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-1 text-sm">
          <h2 className="text-xl">Cliente</h2>
          <p className="font-bold">{order.profiles?.full_name ?? '—'}</p>
          {order.profiles?.phone && <p>📞 {order.profiles.phone}</p>}
          <p className="muted">Pedido creado el {formatDate(order.created_at, true)}</p>
          {order.customer_notes && <p className="rounded-xl bg-butter/50 p-2">📝 {order.customer_notes}</p>}
          <h3 className="pt-2 font-extrabold">Envío</h3>
          <p>{order.shipping_name} · {order.shipping_phone}</p>
          {addr && <p>{addr.street}, {addr.neighborhood}, {addr.city}, {addr.state}, CP {addr.zip}</p>}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">Estado y envío</h2>
          <form action={updateOrder.bind(null, id)} className="space-y-3">
            <select name="status" defaultValue={order.status} className="input">
              {Object.entries(ORDER_STATUS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="shipping_carrier" defaultValue={order.shipping_carrier ?? ''} placeholder="Paquetería" className="input" />
              <input name="tracking_number" defaultValue={order.tracking_number ?? ''} placeholder="Número de guía" className="input" />
            </div>
            <div>
              <label className="label">Costo de envío (MXN)</label>
              <input name="shipping_cost" inputMode="decimal" defaultValue={order.shipping_cost} className="input" />
            </div>
            <SubmitButton className="btn-primary w-full">Guardar</SubmitButton>
          </form>
          <p className="muted">Al cambiar el estado, el cliente recibe una notificación automática.</p>
        </section>
      </div>

      {order.order_items.map((it) => {
        const design = (Array.isArray(it.tag_designs) ? it.tag_designs[0] : it.tag_designs) as Design | null
        const photo = photoUrl(it.pets?.main_photo_path)
        return (
          <section key={it.id} className="card space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              {photo && (
                <a href={photo} target="_blank" rel="noreferrer" title="Abrir foto completa">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={`Foto de ${it.pets?.name}`} className="h-28 w-28 rounded-3xl object-cover" />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl">{it.products?.name} · {it.product_variants?.color_name}</h2>
                <p>Para <b>{it.pets?.name}</b> · {formatMoney(it.unit_price, order.currency)}</p>
                {it.pets && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/pet/${it.pets.public_id}`} target="_blank" className="btn-outline btn-sm">Ver perfil público</Link>
                    {photo && <a href={photo} download className="btn-soft btn-sm">⬇️ Foto</a>}
                  </div>
                )}
              </div>
            </div>

            {it.tags ? (
              <p className="rounded-2xl bg-mint p-3 font-bold">
                🏷️ Placa asignada: <Link className="underline" href={`/admin/tags/${it.tags.id}`}>{it.tags.tag_code}</Link>
              </p>
            ) : (
              <form action={assignTagToItem.bind(null, id, it.id)} className="flex flex-col gap-2 sm:flex-row">
                <select name="tag_id" className="input" defaultValue="">
                  <option value="" disabled>Elegir placa disponible…</option>
                  {((available ?? []) as { id: string; tag_code: string }[]).map((t) => (
                    <option key={t.id} value={t.id}>{t.tag_code}</option>
                  ))}
                </select>
                <SubmitButton className="btn-primary" pendingText="Asignando…">Asignar placa</SubmitButton>
              </form>
            )}
            {!it.tags && !(available ?? []).length && (
              <p className="muted">No hay placas disponibles. <Link href="/admin/tags" className="font-bold text-axo-600">Genera un lote</Link>.</p>
            )}

            {design && (
              <form action={saveDesign.bind(null, design.id, id)} className="space-y-3 border-t border-axo-100 pt-4">
                <h3 className="font-extrabold">Datos de fabricación</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <input name="silhouette_type" defaultValue={design.silhouette_type ?? ''} placeholder="Tipo de silueta" className="input col-span-2 sm:col-span-1" />
                  <input name="width_mm" inputMode="decimal" defaultValue={design.width_mm ?? ''} placeholder="Ancho mm" className="input" />
                  <input name="height_mm" inputMode="decimal" defaultValue={design.height_mm ?? ''} placeholder="Alto mm" className="input" />
                  <input name="thickness_mm" inputMode="decimal" defaultValue={design.thickness_mm ?? ''} placeholder="Grosor mm" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="pla_color" defaultValue={design.pla_color ?? ''} placeholder="Color PLA" className="input" />
                  <input name="engraved_name" maxLength={40} defaultValue={design.engraved_name ?? ''} placeholder="Nombre en la placa" className="input" />
                </div>
                <textarea name="notes" rows={2} defaultValue={design.notes ?? ''} placeholder="Observaciones de diseño" className="input" />
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2"><input type="checkbox" name="dtf_uv" defaultChecked={design.dtf_uv} className="h-5 w-5" /> DTF UV</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="approve" defaultChecked={!!design.approved_at} className="h-5 w-5" /> Diseño aprobado</label>
                </div>
                <SubmitButton className="btn-soft">Guardar fabricación</SubmitButton>
                <p className="muted">Los archivos STL/3MF van en el bucket privado <code>design-files</code> de Supabase (ver README).</p>
              </form>
            )}
          </section>
        )
      })}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-xl">Pagos</h2>
          <p className="text-sm">Total: <b>{formatMoney(order.total, order.currency)}</b> · Cobrado: <b>{formatMoney(paid, order.currency)}</b></p>
          {((payments ?? []) as { id: string; amount: number; provider: string; provider_ref: string | null; paid_at: string | null }[]).map((p) => (
            <p key={p.id} className="rounded-xl bg-axo-50 p-2 text-sm">
              {formatMoney(p.amount)} · {p.provider}{p.provider_ref ? ` · ${p.provider_ref}` : ''} · {formatDate(p.paid_at, true)}
            </p>
          ))}
          <form action={registerPayment.bind(null, id)} className="space-y-2 border-t border-axo-100 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <input name="amount" inputMode="decimal" required defaultValue={Math.max(0, Number(order.total) - paid) || ''} placeholder="Monto" className="input" />
              <input name="provider" defaultValue="transferencia" placeholder="Método" className="input" />
            </div>
            <input name="provider_ref" placeholder="Referencia / folio (opcional)" className="input" />
            <SubmitButton className="btn-primary w-full">Registrar pago</SubmitButton>
          </form>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">Notas internas</h2>
          <form action={addNote.bind(null, 'order', id, back)} className="space-y-2">
            <textarea name="note" rows={2} required placeholder="Solo las ve el equipo" className="input" />
            <SubmitButton className="btn-soft">Agregar nota</SubmitButton>
          </form>
          {((notes ?? []) as unknown as { id: string; note: string; created_at: string; profiles: { full_name: string | null } | null }[]).map((n) => (
            <div key={n.id} className="rounded-xl bg-butter/50 p-3 text-sm">
              <p className="whitespace-pre-line">{n.note}</p>
              <p className="muted mt-1">{n.profiles?.full_name ?? 'Admin'} · {formatDate(n.created_at, true)}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
