import Link from 'next/link'
import { Flash } from '@/components/Flash'
import { PetAvatar } from '@/components/PetAvatar'
import { requireUser } from '@/lib/auth'
import { SPECIES } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { petAge } from '@/lib/utils'

export const metadata = { title: 'Mis mascotas' }

type Row = {
  id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  main_photo_path: string | null
  lost_pet_reports: { ended_at: string | null }[]
  tags: { status: string }[]
}

export default async function PetsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from('pets')
    .select('id, name, species, breed, birth_date, main_photo_path, lost_pet_reports!lost_pet_reports_pet_id_fkey(ended_at), tags!tags_pet_id_fkey(status)')
    .eq('owner_id', user.id)
    .order('created_at')
  const pets = (data ?? []) as Row[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Mis mascotas</h1>
        <Link href="/pets/new" className="btn-primary btn-sm">+ Agregar</Link>
      </div>
      <Flash sp={sp} />

      {pets.length === 0 ? (
        <div className="card py-10 text-center">
          <div className="text-5xl">🐾</div>
          <p className="mt-2 font-bold">Aún no registras ninguna mascota</p>
          <Link href="/pets/new" className="btn-primary mt-4">Registrar mi primera mascota</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((p) => {
            const lost = p.lost_pet_reports.some((r) => !r.ended_at)
            const hasTag = p.tags.some((t) => t.status === 'active')
            return (
              <Link key={p.id} href={`/pets/${p.id}`} className="card flex items-center gap-4 transition hover:bg-axo-50">
                <PetAvatar path={p.main_photo_path} name={p.name} className="h-20 w-20 shrink-0 rounded-3xl" />
                <div className="min-w-0">
                  <p className="truncate text-xl font-extrabold">{p.name}</p>
                  <p className="muted truncate">
                    {[SPECIES[p.species], p.breed, petAge(p.birth_date)].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lost && <span className="chip bg-red-100 text-red-700">🚨 Perdida</span>}
                    {hasTag ? <span className="chip">✅ Placa activa</span> : <span className="chip bg-butter text-ink/70">Sin placa activa</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
