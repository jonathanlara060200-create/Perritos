import Link from 'next/link'
import { PetAvatar } from '@/components/PetAvatar'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatMoney, timeAgo } from '@/lib/utils'

export const metadata = { title: 'Mis mascotas perdidas' }

type Report = {
  id: string
  lost_at: string
  ended_at: string | null
  resolution: string | null
  reward_amount: number | null
  last_seen_description: string | null
  pets: { id: string; name: string; main_photo_path: string | null; owner_id: string }
}

export default async function LostPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from('lost_pet_reports')
    .select('id, lost_at, ended_at, resolution, reward_amount, last_seen_description, pets!lost_pet_reports_pet_id_fkey!inner(id, name, main_photo_path, owner_id)')
    .eq('pets.owner_id', user.id)
    .order('lost_at', { ascending: false })
  const reports = (data ?? []) as unknown as Report[]
  const active = reports.filter((r) => !r.ended_at)
  const past = reports.filter((r) => r.ended_at)

  // último reporte de ubicación por mascota activa
  const lastSeen: Record<string, string> = {}
  if (active.length) {
    const { data: locs } = await supabase
      .from('pet_locations')
      .select('pet_id, created_at')
      .in('pet_id', active.map((r) => r.pets.id))
      .order('created_at', { ascending: false })
    for (const l of (locs ?? []) as { pet_id: string; created_at: string }[]) lastSeen[l.pet_id] ??= l.created_at
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">🚨 Mis mascotas perdidas</h1>

      {active.length === 0 ? (
        <div className="card py-10 text-center">
          <div className="text-5xl">🏡</div>
          <p className="mt-2 font-bold">Todas tus mascotas están en casa</p>
          <p className="muted mt-1">Si una se pierde, activa el modo perdida desde su perfil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map((r) => (
            <Link key={r.id} href={`/pets/${r.pets.id}`} className="card flex items-center gap-4 border-2 border-red-200 bg-red-50">
              <PetAvatar path={r.pets.main_photo_path} name={r.pets.name} className="h-20 w-20 shrink-0 rounded-3xl" />
              <div className="min-w-0">
                <p className="text-xl font-extrabold">{r.pets.name}</p>
                <p className="muted">Perdida desde {formatDate(r.lost_at, true)}</p>
                {r.last_seen_description && <p className="truncate text-sm">📍 {r.last_seen_description}</p>}
                <p className="mt-1 text-sm font-bold">
                  {lastSeen[r.pets.id] ? `Último reporte ${timeAgo(lastSeen[r.pets.id])}` : 'Sin reportes aún'}
                  {r.reward_amount ? ` · 🎁 ${formatMoney(r.reward_amount)}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">Historial</h2>
          {past.map((r) => (
            <div key={r.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold">{r.pets.name}</p>
                <p className="muted">{formatDate(r.lost_at)} → {formatDate(r.ended_at)}</p>
              </div>
              <span className={r.resolution === 'found' ? 'chip bg-mint text-emerald-900' : 'chip'}>
                {r.resolution === 'found' ? '🎉 Encontrada' : 'Cancelada'}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
