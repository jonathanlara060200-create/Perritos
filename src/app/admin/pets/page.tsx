import Link from 'next/link'
import { setPetActive } from '@/app/actions/admin'
import { Flash } from '@/components/Flash'
import { PetAvatar } from '@/components/PetAvatar'
import { createClient } from '@/lib/supabase/server'
import { SPECIES } from '@/lib/labels'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Mascotas · Admin' }

type Row = {
  id: string
  name: string
  species: string
  breed: string | null
  public_id: string
  is_active: boolean
  main_photo_path: string | null
  created_at: string
  profiles: { full_name: string | null } | null
  tags: { tag_code: string; status: string }[]
}

export default async function AdminPets({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from('pets')
    .select('id, name, species, breed, public_id, is_active, main_photo_path, created_at, profiles!pets_owner_id_fkey(full_name), tags!tags_pet_id_fkey(tag_code, status)')
    .order('created_at', { ascending: false })
    .limit(100)
  const q = sp.q?.trim()
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, '')}%,public_id.ilike.%${q.replace(/[%,()]/g, '')}%`)
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Mascotas</h1>
      <Flash sp={sp} />
      <form className="flex gap-3">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar por nombre o enlace" className="input" />
        <button className="btn-primary">Buscar</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <div key={p.id} className="card space-y-3">
            <div className="flex items-center gap-3">
              <PetAvatar path={p.main_photo_path} name={p.name} className="h-16 w-16 shrink-0 rounded-2xl" />
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{p.name} {!p.is_active && <span className="chip bg-red-100 text-red-700">Desactivada</span>}</p>
                <p className="muted truncate">{[SPECIES[p.species], p.breed].filter(Boolean).join(' · ')} · dueño: {p.profiles?.full_name ?? '—'}</p>
                <p className="muted">{formatDate(p.created_at)} · {p.tags.map((t) => t.tag_code).join(', ') || 'sin placa'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/pet/${p.public_id}`} target="_blank" className="btn-outline btn-sm">Ver perfil</Link>
              <form action={setPetActive.bind(null, p.id, !p.is_active)}>
                <button className="btn-soft btn-sm">{p.is_active ? 'Desactivar perfil' : 'Reactivar perfil'}</button>
              </form>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="card muted text-center md:col-span-2">No hay mascotas.</p>}
      </div>
      <p className="muted">Cada cambio que haga un admin queda registrado en la auditoría (quién y qué columnas cambiaron).</p>
    </div>
  )
}
