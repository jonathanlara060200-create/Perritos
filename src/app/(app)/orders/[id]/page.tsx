import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Flash } from '@/components/Flash'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney } from '@/lib/utils'

export const metadata = { title: 'Pedido' }

const FLOW = ['pending_payment', 'paid', 'design_pending', 'design_approved', 'in_production', 'ready', 'shipped', 'delivered']

type Order = {
  id: string
  order_number: number
  status: string
  subtotal: number
  shipping_cost: number
  total: number
  currency: string
  shipping_name: string | null
  shipping_address: { street?: string; neighborhood?: string; city?: string; state?: string; zip?: string } | null
  tracking_number: string | null
  shipping_carrier: string | null
  shipped_at: string | null
  created_at: string
  order_items: {
    id: string
    unit_price: number
    products: { name: string } | null
    product_variants: { color_name: string } | null
    pets: { id: string; name: string } | null
    tags: { tag_code: string } | null
  }[]
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  await requireUser()
  const supabase = await createClient()

  const { data: orderRow, error: orderErr } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (orderErr) throw new Error(`No pudimos cargar el pedido: ${orderErr.message}`)
  if (!orderRow) notFound()

  const { data: itemRows } = await supabase
    .from('order_items')
    .select('id, unit_price, product_id, variant_id, pet_id, tag_id')
    .eq('order_id', id)
  const rawItems = (itemRows ?? []) as { id: string; unit_price: number; product_id: string; variant_id: string | null; pet_id: string | null; tag_id: string | null }[]
  const ids = (k: 'product_id' | 'variant_id' | 'pet_id' | 'tag_id') => rawItems.map((i) => i[k]).filter((x): x is string => !!x)
  const [prods, vars, petsR, tagsR] = await Promise.all([
    supabase.from('products').select('id, name').in('id', ids('product_id')),
    supabase.from('product_variants').select('id, color_name').in('id', ids('variant_id')),
    supabase.from('pets').select('id, name').in('id', ids('pet_id')),
    supabase.from('tags').select('id, tag_code').in('id', ids('tag_id')),
  ])
  const byId = <T extends { id: string }>(rows: T[] | null) => new Map((rows ?? []).map((r) => [r.id, r]))
  const pm = byId(prods.data as { id: string; name: string }[] | null)
  const vm = byId(vars.data as { id: string; color_name: string }[] | null)
  const petm = byId(petsR.data as { id: string; name: string }[] | null)
  const tm = byId(tagsR.data as { id: string; tag_code: string }[] | null)
  const order = {
    ...(orderRow as object),
    order_items: rawItems.map((i) => ({
      id: i.id,
      unit_price: i.unit_price,
      products: pm.get(i.product_id) ?? null,
      product_variants: i.variant_id ? vm.get(i.variant_id) ?? null : null,
      pets: i.pet_id ? petm.get(i.pet_id) ?? null : null,
      tags: i.tag_id ? tm.get(i.tag_id) ?? null : null,
    })),
  } as unknown as Order

  const { data: settings } = await supabase.from('app_settings').select('key, value').in('key', ['payment_instructions', 'support_whatsapp'])
  const cfg = Object.fromEntries(((settings ?? []) as { key: string; value: string }[]).map((s) => [s.key, s.value]))

  const stepIdx = FLOW.indexOf(order.status === 'info_pending' ? 'paid' : order.status)
  const cancelled = order.status === 'cancelled'
  const addr = order.shipping_address

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/orders" className="text-sm font-bold text-axo-600">← Mis pedidos</Link>
      <Flash sp={sp} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Pedido #{order.order_number}</h1>
        <span className={cancelled ? 'chip bg-red-100 text-red-700' : 'chip'}>{ORDER_STATUS[order.status] ?? order.status}</span>
      </div>
      <p className="muted">Creado el {formatDate(order.created_at, true)}</p>

      {order.status === 'pending_payment' && (
        <div className="card border-2 border-butter bg-butter/40 space-y-2">
          <p className="font-extrabold">💳 Falta tu pago</p>
          <p className="whitespace-pre-line text-sm">{cfg.payment_instructions}</p>
          <p className="text-sm">Monto: <b>{formatMoney(order.total, order.currency)}</b> · Referencia: <b>#{order.order_number}</b></p>
          {cfg.support_whatsapp && (
            <a
              href={`https://wa.me/${cfg.support_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero pagar mi pedido #${order.order_number} de AJolote ID`)}`}
              className="btn w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              💬 Escribir por WhatsApp
            </a>
          )}
        </div>
      )}

      {order.status === 'info_pending' && (
        <div className="card border-2 border-butter bg-butter/40">
          <p className="font-extrabold">Necesitamos más información</p>
          <p className="muted">Te escribiremos para pedirte lo que falta (por ejemplo, otra foto de tu mascota).</p>
        </div>
      )}

      {!cancelled && (
        <ol className="card space-y-3">
          {FLOW.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${i <= stepIdx ? 'bg-axo-500 text-white' : 'bg-axo-100 text-axo-600'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </span>
              <span className={i === stepIdx ? 'font-extrabold' : i < stepIdx ? '' : 'text-ink/50'}>{ORDER_STATUS[s]}</span>
            </li>
          ))}
        </ol>
      )}

      {order.tracking_number && (
        <div className="card">
          <p className="font-extrabold">🚚 Seguimiento</p>
          <p>{order.shipping_carrier ?? 'Paquetería'}: <b>{order.tracking_number}</b></p>
          {order.shipped_at && <p className="muted">Enviado el {formatDate(order.shipped_at)}</p>}
        </div>
      )}

      <section className="card space-y-3">
        <h2 className="text-xl">Detalle</h2>
        {order.order_items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{it.products?.name}</p>
              <p className="muted">
                {it.product_variants?.color_name}
                {it.pets && <> · para <Link href={`/pets/${it.pets.id}`} className="font-bold text-axo-600">{it.pets.name}</Link></>}
                {it.tags && <> · placa {it.tags.tag_code}</>}
              </p>
            </div>
            <p className="font-bold">{formatMoney(it.unit_price, order.currency)}</p>
          </div>
        ))}
        <div className="space-y-1 border-t border-axo-100 pt-3 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotal, order.currency)}</span></p>
          <p className="flex justify-between"><span>Envío</span><span>{Number(order.shipping_cost) ? formatMoney(order.shipping_cost, order.currency) : 'Por definir'}</span></p>
          <p className="flex justify-between text-base font-extrabold"><span>Total</span><span>{formatMoney(order.total, order.currency)}</span></p>
        </div>
      </section>

      {addr && (
        <section className="card text-sm">
          <h2 className="mb-1 text-xl">Envío a</h2>
          <p className="font-bold">{order.shipping_name}</p>
          <p>{addr.street}, {addr.neighborhood}</p>
          <p>{addr.city}, {addr.state} · CP {addr.zip}</p>
        </section>
      )}
    </div>
  )
}
