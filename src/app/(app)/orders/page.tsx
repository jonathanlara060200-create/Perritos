import Link from 'next/link'
import { Flash } from '@/components/Flash'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney } from '@/lib/utils'

export const metadata = { title: 'Mis pedidos' }

type Order = { id: string; order_number: number; status: string; total: number; currency: string; created_at: string }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, status, total, currency, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
  const orders = (data ?? []) as Order[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Mis pedidos</h1>
        <Link href="/orders/new" className="btn-primary btn-sm">+ Nuevo pedido</Link>
      </div>
      <Flash sp={sp} />
      {orders.length === 0 ? (
        <div className="card py-10 text-center">
          <div className="text-5xl">📦</div>
          <p className="mt-2 font-bold">Todavía no tienes pedidos</p>
          <Link href="/orders/new" className="btn-primary mt-4">Pedir mi AJolote ID</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="card flex items-center justify-between gap-3 transition hover:bg-axo-50">
              <div>
                <p className="font-extrabold">Pedido #{o.order_number}</p>
                <p className="muted">{formatDate(o.created_at)} · {formatMoney(o.total, o.currency)}</p>
              </div>
              <span className="chip">{ORDER_STATUS[o.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
