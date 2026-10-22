import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, timeAgo } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/labels'

export const metadata = { title: 'Admin' }

type Stats = {
  users: number; pets: number; tags_active: number; lost_active: number; orders_open: number; revenue: number
  views_30d: number; location_reports_30d: number
}

export default async function AdminHome() {
  const supabase = await createClient()
  const [{ data: stats }, { data: orders }, { data: locs }, { data: lost }] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('orders').select('id, order_number, status, total, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(6),
    supabase.from('pet_locations').select('id, created_at, pets(name, public_id)').order('created_at', { ascending: false }).limit(6),
    supabase.from('lost_pet_reports').select('id, lost_at, pets!lost_pet_reports_pet_id_fkey(id, name)').is('ended_at', null).order('lost_at', { ascending: false }),
  ])
  const s = (stats ?? {}) as Stats
  const cards = [
    ['Ventas cobradas', formatMoney(s.revenue ?? 0), '💰'],
    ['Pedidos abiertos', s.orders_open ?? 0, '📦'],
    ['Mascotas', s.pets ?? 0, '🐾'],
    ['Placas activas', s.tags_active ?? 0, '🏷️'],
    ['Perdidas ahora', s.lost_active ?? 0, '🚨'],
    ['Usuarios', s.users ?? 0, '👥'],
    ['Escaneos (30 d)', s.views_30d ?? 0, '📲'],
    ['Reportes (30 d)', s.location_reports_30d ?? 0, '📍'],
  ]

  type OrderRow = { id: string; order_number: number; status: string; total: number; created_at: string; profiles: { full_name: string | null } | null }
  type LocRow = { id: string; created_at: string; pets: { name: string; public_id: string } | null }
  type LostRow = { id: string; lost_at: string; pets: { id: string; name: string } | null }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Resumen</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v, i]) => (
          <div key={l as string} className="card text-center">
            <div className="text-2xl">{i}</div>
            <p className="text-2xl font-extrabold">{v}</p>
            <p className="muted">{l}</p>
          </div>
        ))}
      </div>

      {((lost ?? []) as unknown as LostRow[]).length > 0 && (
        <section className="card border-2 border-red-200 bg-red-50 space-y-2">
          <h2 className="text-xl text-red-700">🚨 Mascotas perdidas ahora</h2>
          {((lost ?? []) as unknown as LostRow[]).map((r) => (
            <p key={r.id}><b>{r.pets?.name}</b> · desde {timeAgo(r.lost_at)}</p>
          ))}
          <Link href="/admin/lost" className="btn-outline btn-sm">Ver todas</Link>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="text-xl">Pedidos recientes</h2>
          {((orders ?? []) as unknown as OrderRow[]).map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 rounded-xl p-2 hover:bg-axo-50">
              <span><b>#{o.order_number}</b> · {o.profiles?.full_name ?? 'Cliente'}</span>
              <span className="chip">{ORDER_STATUS[o.status]}</span>
            </Link>
          ))}
          {!(orders ?? []).length && <p className="muted">Aún no hay pedidos.</p>}
        </section>
        <section className="card space-y-2">
          <h2 className="text-xl">Reportes recientes</h2>
          {((locs ?? []) as unknown as LocRow[]).map((l) => (
            <p key={l.id} className="flex justify-between gap-2 p-2">
              <span>📍 {l.pets?.name}</span><span className="muted">{timeAgo(l.created_at)}</span>
            </p>
          ))}
          {!(locs ?? []).length && <p className="muted">Sin reportes todavía.</p>}
        </section>
      </div>
    </div>
  )
}
