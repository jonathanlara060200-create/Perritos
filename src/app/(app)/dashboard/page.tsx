import Link from 'next/link'
import { markNotificationsRead } from '@/app/actions/pets'
import { Flash } from '@/components/Flash'
import { getProfile, requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/utils'

export const metadata = { title: 'Inicio' }

type Notif = { id: string; title: string; body: string | null; pet_id: string | null; read_at: string | null; created_at: string }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const user = await requireUser()
  const profile = await getProfile()
  const supabase = await createClient()

  const [pets, lost, tags, orders, notifs] = await Promise.all([
    supabase.from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('lost_pet_reports').select('id, pets!lost_pet_reports_pet_id_fkey!inner(owner_id)', { count: 'exact', head: true }).eq('pets.owner_id', user.id).is('ended_at', null),
    supabase.from('tags').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'active'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).not('status', 'in', '(delivered,cancelled)'),
    supabase.from('notifications').select('id, title, body, pet_id, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
  ])
  const list = (notifs.data ?? []) as Notif[]
  const unread = list.filter((n) => !n.read_at).length
  const first = profile?.full_name?.split(' ')[0]

  const stats = [
    { label: 'Mascotas', value: pets.count ?? 0, href: '/pets', icon: '🐾' },
    { label: 'Placas activas', value: tags.count ?? 0, href: '/pets', icon: '🏷️' },
    { label: 'Pedidos en curso', value: orders.count ?? 0, href: '/orders', icon: '📦' },
    { label: 'Perdidas', value: lost.count ?? 0, href: '/lost', icon: '🚨' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Hola{first ? `, ${first}` : ''} 👋</h1>
      <Flash sp={sp} />

      {(lost.count ?? 0) > 0 && (
        <Link href="/lost" className="block rounded-3xl bg-red-600 p-4 text-center font-extrabold text-white">
          🚨 Tienes {lost.count} {lost.count === 1 ? 'mascota perdida' : 'mascotas perdidas'} · ver reportes
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card text-center transition hover:bg-axo-50">
            <div className="text-2xl">{s.icon}</div>
            <p className="text-3xl font-extrabold">{s.value}</p>
            <p className="muted">{s.label}</p>
          </Link>
        ))}
      </div>

      {(pets.count ?? 0) === 0 && (
        <div className="card bg-axo-50 text-center">
          <p className="text-lg font-extrabold">Empieza registrando a tu mascota</p>
          <Link href="/pets/new" className="btn-primary mt-3">Registrar mascota</Link>
        </div>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">🔔 Notificaciones</h2>
          {unread > 0 && (
            <form action={markNotificationsRead}><button className="btn-soft btn-sm">Marcar como leídas</button></form>
          )}
        </div>
        {list.length === 0 ? (
          <p className="muted">Aquí verás cuando alguien reporte a tu mascota o cambie el estado de tus pedidos.</p>
        ) : (
          <ul className="divide-y divide-axo-100">
            {list.map((n) => {
              const href = n.pet_id ? `/pets/${n.pet_id}` : '/orders'
              return (
                <li key={n.id}>
                  <Link href={href} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className={n.read_at ? 'font-semibold' : 'font-extrabold'}>
                        {!n.read_at && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-axo-500" />}
                        {n.title}
                      </p>
                      {n.body && <p className="muted">{n.body}</p>}
                    </div>
                    <span className="muted shrink-0">{timeAgo(n.created_at)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
