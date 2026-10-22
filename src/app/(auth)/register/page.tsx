import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: 'Crear cuenta' }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <>
      <h1 className="mb-4 text-2xl">Crea tu cuenta</h1>
      <Flash sp={sp} />
      <form action={signUp} className="space-y-4">
        <div>
          <label className="label" htmlFor="full_name">Tu nombre</label>
          <input id="full_name" name="full_name" autoComplete="name" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
          <p className="muted mt-1">Mínimo 8 caracteres.</p>
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Creando…">Crear cuenta</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm">
        ¿Ya tienes cuenta? <Link href="/login" className="font-bold text-axo-600">Inicia sesión</Link>
      </p>
    </>
  )
}
