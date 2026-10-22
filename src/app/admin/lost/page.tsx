import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney, timeAgo } from '@/lib/utils'

export const metadata = { title: 'Perdidas · Admin' }

type Row = {
  id: string
  lost_at: string
  ended_at: string | null
  resolution: string | null
  reward_amount: number | null
  last_seen_description: string | null
  pets: { id: string; name: string; public_id: string; profiles: { full_name: string | null; phone: string | null } | null } | null
}

export default async function AdminLost() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lost_pet_reports')
    .select('id, lost_at, ended_at, resolution, reward_amount, last_seen_description, pets!lost_pet_reports_pet_id_fkey(id, name, public_id, profiles!pets_owner_id_fkey(full_name, phone))')
    .order('lost_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as unknown as Row[]

  const petIds = rows.filter((r) => !r.ended_at && r.pets).map((r) => r.pets!.id)
  const lastReport: Record<string, string> = {}
  if (petIds.length) {
    const { data: locs } = await supabase.from('pet_locations').select('pet_id, created_at').in('pet_id', petIds).order('created_at', { ascending: false })
    for (const l of (locs ?? []) as { pet_id: string; created_at: string }[]) lastReport[l.pet_id] ??= l.created_at
  }

  const active = rows.filter((r) => !r.ended_at)
  const closed = rows.filter((r) => r.ended_at)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">🚨 Mascotas perdidas</h1>
      <section className="space-y-2">
        <h2 className="text-xl">Activas ({active.length})</h2>
        {active.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 border-2 border-red-200 bg-red-50">
            <div>
              <p className="text-lg font-extrabold">{r.pets?.name}</p>
              <p className="muted">Dueño: {r.pets?.profiles?.full_name ?? '—'} {r.pets?.profiles?.phone ? `· ${r.pets.profiles.phone}` : ''}</p>
              <p className="text-sm">Perdida {formatDate(r.lost_at, true)}{r.last_seen_description ? ` · 📍 ${r.last_seen_description}` : ''}</p>
              <p className="text-sm font-bold">
                {r.pets && lastReport[r.pets.id] ? `Último reporte ${timeAgo(lastReport[r.pets.id])}` : 'Sin reportes'}
                {r.reward_amount ? ` · 🎁 ${formatMoney(r.reward_amount)}` : ''}
              </p>
            </div>
            {r.pets && <Link href={`/pet/${r.pets.public_id}`} target="_blank" className="btn-outline btn-sm">Ver perfil</Link>}
          </div>
        ))}
        {active.length === 0 && <p className="card muted text-center">No hay mascotas perdidas ahora mismo.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Historial</h2>
        {closed.map((r) => (
          <div key={r.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold">{r.pets?.name}</p>
              <p className="muted">{formatDate(r.lost_at)} → {formatDate(r.ended_at)}</p>
            </div>
            <span className={r.resolution === 'found' ? 'chip bg-mint text-emerald-900' : 'chip'}>{r.resolution === 'found' ? '🎉 Encontrada' : 'Cancelada'}</span>
          </div>
        ))}
        {closed.length === 0 && <p className="muted">Sin historial todavía.</p>}
      </section>
    </div>
  )
}
