import { updatePassword } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: 'Nueva contraseña' }

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <>
      <h1 className="mb-4 text-2xl">Elige una contraseña nueva</h1>
      <Flash sp={sp} />
      <form action={updatePassword} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">Contraseña nueva</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Guardar contraseña</SubmitButton>
      </form>
    </>
  )
}
