import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Usuarios · Admin' }

type Row = { id: string; full_name: string | null; phone: string | null; role: string; created_at: string; pets: { id: string }[] }

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  let query = supabase.from('profiles').select('id, full_name, phone, role, created_at, pets!pets_owner_id_fkey(id)').order('created_at', { ascending: false }).limit(200)
  const q = sp.q?.trim().replace(/[%,()]/g, '')
  if (q) query = query.ilike('full_name', `%${q}%`)
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Usuarios</h1>
      <form className="flex gap-3">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar por nombre" className="input" />
        <button className="btn-primary">Buscar</button>
      </form>
      <div className="space-y-2">
        {rows.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-extrabold">{u.full_name ?? 'Sin nombre'} {u.role === 'admin' && <span className="chip bg-butter text-ink">Admin</span>}</p>
              <p className="muted">{u.phone ?? 'sin teléfono'} · registrado {formatDate(u.created_at)}</p>
            </div>
            <span className="chip">{u.pets.length} {u.pets.length === 1 ? 'mascota' : 'mascotas'}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="card muted text-center">No hay usuarios.</p>}
      </div>
      <p className="muted">Para hacer admin a alguien, ejecuta el UPDATE comentado al final de <code>supabase/seed.sql</code> en el SQL Editor. No se puede hacer desde la app, a propósito.</p>
    </div>
  )
}
