import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addNote, markNfcWritten, replaceTag, saveNfcUid, updateTag } from '@/app/actions/admin'
import { CopyButton } from '@/components/CopyButton'
import { Flash } from '@/components/Flash'
import { NfcWriter } from '@/components/NfcWriter'
import { PlatePreview } from '@/components/PlatePreview'
import { SubmitButton } from '@/components/SubmitButton'
import { getColorMap } from '@/lib/colors'
import { TAG_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, petUrl } from '@/lib/utils'

export const metadata = { title: 'Placa · Admin' }

type Tag = {
  id: string
  tag_code: string
  status: string
  color: string | null
  material: string
  version: string
  model: string
  dtf_uv: boolean
  nfc_uid: string | null
  nfc_written_at: string | null
  nfc_locked: boolean
  activated_at: string | null
  notes: string | null
  replaces_tag_id: string | null
  created_at: string
  pets: { id: string; name: string; public_id: string } | null
  profiles: { full_name: string | null } | null
}

export default async function AdminTag({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data } = await supabase
    .from('tags')
    .select('*, pets!tags_pet_id_fkey(id, name, public_id), profiles!tags_owner_id_fkey(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()
  const tag = data as unknown as Tag

  const [{ data: available }, { data: notes }, colors] = await Promise.all([
    supabase.from('tags').select('id, tag_code').eq('status', 'available').order('tag_code').limit(100),
    supabase.from('admin_notes').select('id, note, created_at').eq('entity_type', 'tag').eq('entity_id', id).order('created_at', { ascending: false }),
    getColorMap(),
  ])

  const back = `/admin/tags/${id}`
  const nfcUrl = tag.pets ? petUrl(tag.pets.public_id, 'n') : null
  const qrUrl = tag.pets ? petUrl(tag.pets.public_id, 'q') : null

  return (
    <div className="space-y-6">
      <Link href="/admin/tags" className="text-sm font-bold text-axo-600">← Placas</Link>
      <Flash sp={sp} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{tag.tag_code}</h1>
        <span className="chip">{TAG_STATUS[tag.status]}</span>
      </div>
      <p className="muted">
        Creada {formatDate(tag.created_at)}
        {tag.activated_at ? ` · activada ${formatDate(tag.activated_at)}` : ''}
        {tag.profiles?.full_name ? ` · dueño: ${tag.profiles.full_name}` : ''}
      </p>

      {tag.pets && nfcUrl && qrUrl ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-4">
            <h2 className="text-xl">QR</h2>
            <p className="muted">Mascota: <Link className="font-bold text-axo-600" href={`/pet/${tag.pets.public_id}`} target="_blank">{tag.pets.name}</Link></p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/qr/${tag.pets.public_id}`} alt={`QR de ${tag.pets.name}`} className="mx-auto h-48 w-48 rounded-2xl border border-axo-100 bg-white p-2" />
            <div className="flex flex-wrap justify-center gap-2">
              <a href={`/qr/${tag.pets.public_id}?download=1`} className="btn-soft btn-sm">⬇️ SVG</a>
              <a href={`/qr/${tag.pets.public_id}?format=png&download=1`} className="btn-soft btn-sm">⬇️ PNG</a>
            </div>
            <p className="muted break-all">{qrUrl}</p>
          </section>

          <section className="card space-y-4">
            <h2 className="text-xl">NFC</h2>
            <p className="muted">
              {tag.nfc_written_at ? `✅ Escrito el ${formatDate(tag.nfc_written_at, true)}${tag.nfc_locked ? ' · bloqueado' : ''}` : 'Aún no se ha escrito el chip.'}
            </p>
            <div className="flex items-center gap-2 rounded-2xl bg-axo-50 p-3">
              <code className="min-w-0 flex-1 truncate text-sm">{nfcUrl}</code>
              <CopyButton text={nfcUrl} />
            </div>
            <NfcWriter url={nfcUrl} tagId={id} markWritten={markNfcWritten} />
            <p className="muted">
              Web NFC solo funciona en Chrome para Android. En iPhone o computadora, copia la URL y grábala con una app como NFC Tools (registro tipo URL).
            </p>
            <form action={saveNfcUid.bind(null, id)} className="flex gap-2">
              <input name="nfc_uid" defaultValue={tag.nfc_uid ?? ''} placeholder="UID del chip (opcional)" className="input" />
              <SubmitButton className="btn-outline">Guardar</SubmitButton>
            </form>
          </section>

          <section className="card md:col-span-2">
            <h2 className="mb-3 text-xl">Vista de la placa</h2>
            <div className="mx-auto max-w-sm">
              <PlatePreview name={tag.pets.name} tagCode={tag.tag_code} url={qrUrl} color={(tag.color && colors[tag.color]) || undefined} />
            </div>
          </section>
        </div>
      ) : (
        <p className="card muted">
          Esta placa aún no tiene mascota. Asígnala desde un pedido para generar su QR y NFC (ambos apuntan al enlace permanente de la mascota).
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="text-xl">Datos de la placa</h2>
        <form action={updateTag.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Estado</label>
            <select name="status" defaultValue={tag.status} className="input">
              {Object.entries(TAG_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <input name="color" defaultValue={tag.color ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input name="model" defaultValue={tag.model} className="input" />
          </div>
          <div>
            <label className="label">Material</label>
            <input name="material" defaultValue={tag.material} className="input" />
          </div>
          <div>
            <label className="label">Versión</label>
            <input name="version" defaultValue={tag.version} className="input" />
          </div>
          <label className="flex items-end gap-2 pb-3"><input type="checkbox" name="dtf_uv" defaultChecked={tag.dtf_uv} className="h-5 w-5" /> DTF UV</label>
          <div className="sm:col-span-2">
            <label className="label">Observaciones</label>
            <textarea name="notes" rows={2} defaultValue={tag.notes ?? ''} className="input" />
          </div>
          <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full">Guardar placa</SubmitButton></div>
        </form>
      </section>

      {tag.pets && ['active', 'lost', 'deactivated', 'shipped'].includes(tag.status) && (
        <section className="card space-y-3">
          <h2 className="text-xl">Reemplazar placa</h2>
          <p className="muted">
            La placa actual pasa a “Reemplazada” y la nueva hereda mascota y dueño. El perfil, el enlace y el historial se conservan; la nueva placa se activa con su propio código.
          </p>
          <form action={replaceTag.bind(null, id)} className="flex flex-col gap-2 sm:flex-row">
            <select name="new_tag_id" className="input" defaultValue="">
              <option value="" disabled>Elegir placa nueva disponible…</option>
              {((available ?? []) as { id: string; tag_code: string }[]).map((t) => <option key={t.id} value={t.id}>{t.tag_code}</option>)}
            </select>
            <SubmitButton className="btn-outline" pendingText="Reemplazando…">Reemplazar</SubmitButton>
          </form>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-xl">Notas internas</h2>
        <form action={addNote.bind(null, 'tag', id, back)} className="space-y-2">
          <textarea name="note" rows={2} required className="input" />
          <SubmitButton className="btn-soft">Agregar nota</SubmitButton>
        </form>
        {((notes ?? []) as { id: string; note: string; created_at: string }[]).map((n) => (
          <div key={n.id} className="rounded-xl bg-butter/50 p-3 text-sm">
            <p className="whitespace-pre-line">{n.note}</p>
            <p className="muted mt-1">{formatDate(n.created_at, true)}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
