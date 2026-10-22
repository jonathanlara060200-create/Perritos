import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { Logo } from '@/components/Logo'
import { getProfile, requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/pets', label: 'Mascotas', icon: '🐾' },
  { href: '/orders', label: 'Pedidos', icon: '📦' },
  { href: '/lost', label: 'Perdidas', icon: '🚨' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const profile = await getProfile()
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-axo-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-axo-100">
                {n.label}
              </Link>
            ))}
            {profile?.role === 'admin' && (
              <Link href="/admin" className="rounded-xl bg-butter px-3 py-2 text-sm font-bold">Admin</Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {!!count && <span className="chip" title="Notificaciones sin leer">🔔 {count}</span>}
            <form action={signOut}>
              <button className="rounded-xl px-3 py-2 text-sm font-bold text-ink/70 hover:bg-axo-100">Salir</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-axo-100 bg-white md:hidden" aria-label="Navegación principal">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold">
              <span className="text-xl">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
