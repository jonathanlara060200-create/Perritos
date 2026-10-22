import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { requireAdmin } from '@/lib/auth'

const NAV = [
  ['/admin', 'Resumen'],
  ['/admin/orders', 'Pedidos'],
  ['/admin/pets', 'Mascotas'],
  ['/admin/tags', 'Placas · QR · NFC'],
  ['/admin/lost', 'Perdidas'],
  ['/admin/users', 'Usuarios'],
  ['/admin/products', 'Productos'],
  ['/admin/analytics', 'Métricas'],
  ['/admin/settings', 'Ajustes'],
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-axo-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="chip bg-butter text-ink">Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm font-bold text-axo-600">Salir del panel</Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Administración">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-axo-100">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
