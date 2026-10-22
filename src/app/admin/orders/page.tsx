import Link from 'next/link'
import { ORDER_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney } from '@/lib/utils'

export const metadata = { title: 'Pedidos · Admin' }

type Row = {
  id: string
  order_number: number
  status: string
  total: number
  currency: string
  created_at: string
  profiles: { full_name: string | null; phone: string | null } | null
  order_items: { pets: { name: string } | null }[]
}

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('id, order_number, status, total, currency, created_at, profiles(full_name, phone), order_items(pets(name))')
    .order('created_at', { ascending: false })
    .limit(100)
  if (sp.status && sp.status in ORDER_STATUS) query = query.eq('status', sp.status)
  const q = sp.q?.trim().replace(/^#/, '')
  if (q && /^\d+$/.test(q)) query = query.eq('order_number', Number(q))

  const { data } = await query
  let rows = (data ?? []) as unknown as Row[]
  if (q && !/^\d+$/.test(q)) {
    const n = q.toLowerCase()
    rows = rows.filter((r) => r.profiles?.full_name?.toLowerCase().includes(n) || r.order_items.some((i) => i.pets?.name.toLowerCase().includes(n)))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Pedidos</h1>
      <form className="flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar: #número, cliente o mascota" className="input" />
        <select name="status" defaultValue={sp.status ?? ''} className="input sm:max-w-56">
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="space-y-2">
        {rows.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 transition hover:bg-axo-50">
            <div>
              <p className="font-extrabold">#{o.order_number} · {o.profiles?.full_name ?? 'Cliente'}</p>
              <p className="muted">
                {o.order_items.map((i) => i.pets?.name).filter(Boolean).join(', ') || '—'} · {formatDate(o.created_at)} · {formatMoney(o.total, o.currency)}
              </p>
            </div>
            <span className="chip">{ORDER_STATUS[o.status]}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="card muted text-center">No hay pedidos con ese filtro.</p>}
      </div>
    </div>
  )
}
