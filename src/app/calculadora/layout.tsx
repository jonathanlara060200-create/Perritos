import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { Logo } from '@/components/Logo'
import { requireCalcAccess } from '@/lib/auth'

/** Panel de la calculadora 3D: solo la calculadora, nada más del admin. */
export default async function CalculadoraLayout({ children }: { children: React.ReactNode }) {
  const access = await requireCalcAccess()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-axo-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/calculadora" />
            <span className="chip bg-butter text-ink">Calculadora</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href={access === 'admin' ? '/admin' : '/dashboard'} className="rounded-xl px-3 py-2 text-sm font-bold text-axo-600 hover:bg-axo-100">
              {access === 'admin' ? 'Admin' : 'Inicio'}
            </Link>
            <form action={signOut}>
              <button className="rounded-xl px-3 py-2 text-sm font-bold text-ink/70 hover:bg-axo-100">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
