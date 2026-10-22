import Link from 'next/link'
import { signIn } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: 'Iniciar sesión' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <>
      <h1 className="mb-4 text-2xl">Inicia sesión</h1>
      <Flash sp={sp} />
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? '/dashboard'} />
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-sm font-bold">
        <Link href="/forgot-password" className="text-axo-600">Olvidé mi contraseña</Link>
        <Link href="/register" className="text-axo-600">Crear cuenta</Link>
      </div>
    </>
  )
}
