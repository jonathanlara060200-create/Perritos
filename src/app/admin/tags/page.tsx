import Link from 'next/link'
import { deleteTag } from '@/app/actions/admin'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Flash } from '@/components/Flash'
import { TAG_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Placas · Admin' }

type Row = {
  id: string
  tag_code: string
  status: string
  color: string | null
  nfc_written_at: string | null
  created_at: string
  pets: { name: string } | null
}

export default async function AdminTags({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from('tags')
    .select('id, tag_code, status, color, nfc_written_at, created_at, pets!tags_pet_id_fkey(name)')
    .order('tag_code', { ascending: false })
    .limit(150)
  if (sp.status && sp.status in TAG_STATUS) query = query.eq('status', sp.status)
  const q = sp.q?.trim().toUpperCase()
  if (q) query = query.ilike('tag_code', `%${q}%`)

  const [{ data }, { data: variants }] = await Promise.all([
    query,
    supabase.from('product_variants').select('color_name').eq('is_active', true),
  ])
  const rows = (data ?? []) as unknown as Row[]
  const colors = [...new Set(((variants ?? []) as { color_name: string }[]).map((v) => v.color_name))]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Placas · QR · NFC</h1>
      <Flash sp={sp} />

      <section className="card space-y-3">
        <h2 className="text-xl">Generar lote de placas</h2>
        <p className="muted">
          Crea códigos únicos (AJB-000001…) con su código de activación. Se descarga un CSV: <b>es la única vez que se ven los códigos de activación</b>, guárdalo para imprimir las tarjetas.
        </p>
        <form method="post" action="/admin/tags/generate" className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Cantidad</label>
            <input name="count" type="number" min={1} max={200} defaultValue={10} required className="input" />
          </div>
          <div>
            <label className="label">Color</label>
            <select name="color" className="input" defaultValue="">
              <option value="">Sin definir</option>
              {colors.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Modelo</label>
            <input name="model" defaultValue="AJolote ID" className="input" />
          </div>
          <div>
            <label className="label">Material</label>
            <input name="material" defaultValue="PLA" className="input" />
          </div>
          <div>
            <label className="label">Versión</label>
            <input name="version" defaultValue="v1" className="input" />
          </div>
          <label className="flex items-end gap-2 pb-3"><input type="checkbox" name="dtf_uv" className="h-5 w-5" /> Lleva DTF UV</label>
          <button className="btn-primary sm:col-span-3">Generar y descargar CSV</button>
        </form>
      </section>

      <form className="flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar código (AJB-000001)" className="input" />
        <select name="status" defaultValue={sp.status ?? ''} className="input sm:max-w-56">
          <option value="">Todos los estados</option>
          {Object.entries(TAG_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-outline">Filtrar</button>
      </form>

      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-3 transition hover:bg-axo-50">
            <Link href={`/admin/tags/${t.id}`} className="min-w-0 flex-1">
              <p className="font-extrabold">{t.tag_code}</p>
              <p className="muted">
                {t.pets?.name ?? 'Sin mascota'} · {t.color ?? 'sin color'} · NFC {t.nfc_written_at ? '✅' : '—'}
              </p>
              <p className="muted">{formatDate(t.created_at)}</p>
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="chip">{TAG_STATUS[t.status]}</span>
              {!t.pets && (
                <form action={deleteTag.bind(null, t.id, '/admin/tags')}>
                  <ConfirmButton message={`¿Borrar la placa ${t.tag_code}? No se puede deshacer.`} className="rounded-xl px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                    🗑️ Borrar
                  </ConfirmButton>
                </form>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="card muted text-center md:col-span-2">No hay placas con ese filtro.</p>}
      </div>
    </div>
  )
}
