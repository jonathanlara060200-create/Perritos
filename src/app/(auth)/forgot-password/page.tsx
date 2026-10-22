import Link from 'next/link'
import { requestPasswordReset } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: 'Recuperar contraseña' }

export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <>
      <h1 className="mb-2 text-2xl">Recuperar contraseña</h1>
      <p className="muted mb-4">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <Flash sp={sp} />
      <form action={requestPasswordReset} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Enviando…">Enviar enlace</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-bold text-axo-600">Volver a iniciar sesión</Link>
      </p>
    </>
  )
}
