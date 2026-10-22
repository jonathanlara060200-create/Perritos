import Link from 'next/link'
import { notFound } from 'next/navigation'
import { activateLost, endLost, updateLost } from '@/app/actions/lost'
import { claimTag, setTagStatus } from '@/app/actions/pets'
import { CopyButton } from '@/components/CopyButton'
import { Flash } from '@/components/Flash'
import { LocationMap } from '@/components/LocationMap'
import { LocationPicker } from '@/components/LocationPicker'
import { PetAvatar } from '@/components/PetAvatar'
import { PlatePreview } from '@/components/PlatePreview'
import { SubmitButton } from '@/components/SubmitButton'
import { requireUser } from '@/lib/auth'
import { getColorMap } from '@/lib/colors'
import { toLocalInput } from '@/lib/dates'
import { SEX, SPECIES, TAG_STATUS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { formatDate, petAge, petUrl, timeAgo } from '@/lib/utils'

export const metadata = { title: 'Mascota' }

type Lost = {
  id: string
  lost_at: string
  last_seen_description: string | null
  extra_info: string | null
  reward_amount: number | null
  ended_at: string | null
}
type Tag = { id: string; tag_code: string; status: string; color: string | null; nfc_written_at: string | null; activated_at: string | null }
type Loc = { id: string; lat: number | null; lng: number | null; note: string | null; created_at: string; accuracy_m: number | null }

export default async function PetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  await requireUser()
  const supabase = await createClient()

  const { data: pet } = await supabase.from('pets').select('*').eq('id', id).maybeSingle()
  if (!pet) notFound()

  const [{ data: lostRows }, { data: tagRows }, { data: locRows }, colors] = await Promise.all([
    supabase.from('lost_pet_reports').select('*').eq('pet_id', id).is('ended_at', null),
    supabase.from('tags').select('id, tag_code, status, color, nfc_written_at, activated_at').eq('pet_id', id).order('created_at'),
    supabase.from('pet_locations').select('id, lat, lng, note, created_at, accuracy_m').eq('pet_id', id).order('created_at', { ascending: false }).limit(20),
    getColorMap(),
  ])

  const lost = ((lostRows ?? []) as Lost[])[0] ?? null
  const tags = (tagRows ?? []) as Tag[]
  const locs = (locRows ?? []) as Loc[]
  const activeTag = tags.find((t) => t.status === 'active')
  const points = locs
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({ lat: l.lat!, lng: l.lng!, label: `${timeAgo(l.created_at)}${l.note ? ` · ${l.note}` : ''}` }))

  return (
    <div className="space-y-6">
      <Link href="/pets" className="text-sm font-bold text-axo-600">← Mis mascotas</Link>
      <Flash sp={sp} />

      <div className="flex items-center gap-4">
        <PetAvatar path={pet.main_photo_path} name={pet.name} className="h-24 w-24 shrink-0 rounded-4xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl">{pet.name}</h1>
          <p className="muted">{[SPECIES[pet.species], pet.breed, SEX[pet.sex], petAge(pet.birth_date)].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex gap-2">
            <Link href={`/pets/${id}/edit`} className="btn-soft btn-sm">✏️ Editar</Link>
            <Link href={`/pet/${pet.public_id}`} target="_blank" className="btn-outline btn-sm">👀 Ver perfil público</Link>
          </div>
        </div>
      </div>

      {!pet.is_active && (
        <div className="rounded-2xl bg-butter px-4 py-3 text-sm font-bold">
          Este perfil está desactivado: su QR y NFC no muestran información. Escríbenos si quieres reactivarlo.
        </div>
      )}

      {/* ---------- Modo perdida ---------- */}
      {lost ? (
        <section className="card space-y-4 border-2 border-red-200 bg-red-50">
          <h2 className="text-xl text-red-700">🚨 {pet.name} está en modo perdida</h2>
          <p className="text-sm">Activado el {formatDate(lost.lost_at, true)}. El perfil público ya muestra el aviso y la recompensa.</p>
          <form action={updateLost.bind(null, id, lost.id)} className="space-y-3">
            <LostFields defaults={lost} />
            <SubmitButton className="btn-outline w-full">Guardar cambios</SubmitButton>
          </form>
          <div className="grid grid-cols-2 gap-3">
            <form action={endLost.bind(null, id, lost.id, 'found')}>
              <button className="btn w-full bg-emerald-600 text-white hover:bg-emerald-700">🎉 ¡La encontré!</button>
            </form>
            <form action={endLost.bind(null, id, lost.id, 'cancelled')}>
              <button className="btn-outline w-full">Falsa alarma</button>
            </form>
          </div>
        </section>
      ) : (
        <details className="card">
          <summary className="btn w-full cursor-pointer list-none bg-red-600 py-4 text-lg text-white hover:bg-red-700">
            🚨 ACTIVAR MODO PERDIDA
          </summary>
          <form action={activateLost.bind(null, id)} className="mt-4 space-y-3">
            <p className="muted">Al activarlo, quien escanee la placa verá que {pet.name} está perdida y cómo ayudarte.</p>
            <LostFields />
            <SubmitButton className="btn w-full bg-red-600 text-white hover:bg-red-700" pendingText="Activando…">
              Activar ahora
            </SubmitButton>
          </form>
        </details>
      )}

      {/* ---------- Reportes de ubicación ---------- */}
      <section className="card space-y-3">
        <h2 className="text-xl">📍 Reportes recientes</h2>
        {locs.length === 0 ? (
          <p className="muted">Todavía nadie ha reportado a {pet.name}. Cuando alguien comparta su ubicación, aparecerá aquí y te avisaremos.</p>
        ) : (
          <>
            <LocationMap points={points} />
            <ul className="divide-y divide-axo-100">
              {locs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-bold">{l.lat != null ? 'Ubicación compartida' : 'Nota de avistamiento'}</p>
                    {l.note && <p className="text-sm">{l.note}</p>}
                    {l.lat != null && (
                      <a
                        className="text-sm font-bold text-axo-600"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.google.com/maps?q=${l.lat},${l.lng}`}
                      >
                        Abrir en mapas{l.accuracy_m ? ` (±${Math.round(l.accuracy_m)} m)` : ''}
                      </a>
                    )}
                  </div>
                  <span className="muted shrink-0">🕐 {timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ---------- Placas ---------- */}
      <section className="card space-y-4">
        <h2 className="text-xl">🏷️ Placas</h2>
        {tags.length === 0 && <p className="muted">Aún no tienes una placa activa. Pide tu AJolote ID o, si ya la recibiste, actívala abajo.</p>}
        {tags.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-axo-50 p-3">
            <div>
              <p className="font-extrabold">{t.tag_code}</p>
              <p className="muted">{TAG_STATUS[t.status]}{t.activated_at ? ` · activada ${formatDate(t.activated_at)}` : ''}</p>
            </div>
            <div className="flex gap-2">
              {t.status === 'active' && (
                <>
                  <form action={setTagStatus.bind(null, id, t.id, 'lost')}><button className="btn-outline btn-sm">Perdí la placa</button></form>
                  <form action={setTagStatus.bind(null, id, t.id, 'deactivated')}><button className="btn-outline btn-sm">Desactivar</button></form>
                </>
              )}
              {(t.status === 'lost' || t.status === 'deactivated') && (
                <form action={setTagStatus.bind(null, id, t.id, 'active')}><button className="btn-soft btn-sm">Reactivar</button></form>
              )}
            </div>
          </div>
        ))}

        <form action={claimTag.bind(null, id)} className="space-y-3 border-t border-axo-100 pt-4">
          <p className="font-bold">Activar una placa nueva</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="tag_code" placeholder="AJB-000001" required className="input uppercase" autoCapitalize="characters" />
            <input name="claim_code" placeholder="Código de activación" required className="input uppercase" autoCapitalize="characters" autoComplete="off" />
          </div>
          <p className="muted">Los dos códigos vienen en la tarjeta de tu pedido. Cada placa solo se puede activar una vez.</p>
          <SubmitButton className="btn-primary w-full" pendingText="Activando…">Activar placa</SubmitButton>
        </form>
      </section>

      {/* ---------- Enlace, QR y vista de la placa ---------- */}
      <section className="card space-y-4">
        <h2 className="text-xl">🔗 Su enlace permanente</h2>
        <p className="muted">Este enlace nunca cambia, aunque actualices la información. Es el que usan el QR y el NFC.</p>
        <div className="flex items-center gap-2 rounded-2xl bg-axo-50 p-3">
          <code className="min-w-0 flex-1 truncate text-sm">{petUrl(pet.public_id)}</code>
          <CopyButton text={petUrl(pet.public_id)} />
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/qr/${pet.public_id}`} alt={`QR de ${pet.name}`} className="h-40 w-40 rounded-2xl border border-axo-100 bg-white p-2" />
          <div className="flex flex-wrap gap-2">
            <a href={`/qr/${pet.public_id}?download=1`} className="btn-soft btn-sm">⬇️ Descargar QR (SVG)</a>
            <a href={`/qr/${pet.public_id}?format=png&download=1`} className="btn-soft btn-sm">⬇️ Descargar QR (PNG)</a>
          </div>
        </div>
        <PlatePreview
          name={pet.name}
          tagCode={activeTag?.tag_code ?? 'AJB-000000'}
          url={petUrl(pet.public_id, 'q')}
          color={(activeTag?.color && colors[activeTag.color]) || undefined}
        />
      </section>

      <p className="muted text-center">
        ¿Quieres una placa nueva? <Link href={`/orders/new?pet=${id}`} className="font-bold text-axo-600">Pedir AJolote ID</Link>
      </p>
    </div>
  )
}

function LostFields({ defaults }: { defaults?: Lost }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">¿Cuándo se perdió?</label>
        <input type="datetime-local" name="lost_at" required defaultValue={toLocalInput(defaults ? new Date(defaults.lost_at) : new Date())} max={toLocalInput()} className="input" />
      </div>
      <div>
        <label className="label">¿Dónde fue vista por última vez?</label>
        <input name="last_seen_description" maxLength={500} defaultValue={defaults?.last_seen_description ?? ''} placeholder="Ej. Parque cerca de casa, por la zona norte" className="input" />
      </div>
      <LocationPicker />
      <div>
        <label className="label">Información adicional</label>
        <textarea name="extra_info" rows={2} maxLength={1000} defaultValue={defaults?.extra_info ?? ''} placeholder="Ej. Lleva collar azul, no se acerca a extraños" className="input" />
      </div>
      <div>
        <label className="label">🎁 Recompensa en MXN (opcional)</label>
        <input name="reward_amount" inputMode="decimal" defaultValue={defaults?.reward_amount ?? ''} placeholder="1000" className="input" />
        <p className="muted mt-1">Es solo informativa. No se maneja ningún pago dentro de la plataforma.</p>
      </div>
    </div>
  )
}
