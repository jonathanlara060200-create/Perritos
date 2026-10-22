import Link from 'next/link'
import { createPet } from '@/app/actions/pets'
import { Flash } from '@/components/Flash'
import { PetFields } from '@/components/PetFields'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: 'Nueva mascota' }

export default async function NewPetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/pets" className="text-sm font-bold text-axo-600">← Mis mascotas</Link>
      <h1 className="text-3xl">Nueva mascota</h1>
      <Flash sp={sp} />
      <form action={createPet} className="card space-y-5">
        <PetFields />
        <SubmitButton className="btn-primary w-full" pendingText="Creando…">Crear mascota</SubmitButton>
      </form>
      <p className="muted">En el siguiente paso podrás agregar su foto, información de emergencia y contactos.</p>
    </div>
  )
}
