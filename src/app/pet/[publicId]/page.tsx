import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AxoMark } from '@/components/Logo'
import { createPublicClient } from '@/lib/supabase/public'
import { formatDate, formatMoney, photoUrl, telLink, waLink } from '@/lib/utils'

// Siempre fresco: debe reflejar al instante el modo perdida y la privacidad.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mascota', robots: { index: false, follow: false } }

type Contact = {
  name: string
  relationship: string | null
  is_primary: boolean
  phone: string | null
  whatsapp: string | null
  email: string | null
}
type PublicPet = {
  public_id: string
  name: string
  species: 'dog' | 'cat' | 'other'
  breed: string | null
  description: string | null
  photo_path: string | null
  is_lost: boolean
  allow_location_reports: boolean
  lost: { lost_at: string; last_seen_description: string | null; extra_info: string | null; reward_amount: number | null } | null
  emergency: {
    allergies: string[]
    sensitivities: string[]
    behavior: string[]
    special_care: string | null
    medications: string | null
    vet_info: string | null
  }
  contacts: Contact[]
}

const EMOJI = { dog: '🐶', cat: '🐱', other: '🐾' }

export default async function PublicPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>
  searchParams: Promise<{ s?: string }>
}) {
  const { publicId } = await params
  const { s } = await searchParams

  const { data } = await createPublicClient().rpc('get_public_pet', { p_public_id: publicId, p_source: s ?? null })
  const pet = data as PublicPet | null
  if (!pet) notFound()

  const photo = photoUrl(pet.photo_path)
  const em = pet.emergency
  const hasEmergency =
    em.allergies.length || em.sensitivities.length || em.behavior.length || em.special_care || em.medications || em.vet_info
  const msg = `Hola, encontré a ${pet.name} (escaneé su placa AJolote ID).`

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      {pet.is_lost ? (
        <div className="bg-red-600 px-5 py-4 text-center text-white">
          <p className="text-xl font-extrabold">🚨 MASCOTA PERDIDA</p>
          <p className="text-sm font-bold opacity-95">Necesitamos ayuda para encontrarla.</p>
        </div>
      ) : (
        <div className="bg-axo-100 px-5 py-3 text-center text-sm font-bold text-axo-600">Hola 👋 soy {pet.name}</div>
      )}

      <div className="space-y-5 px-4 pt-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`Foto de ${pet.name}`} className="aspect-square w-full rounded-4xl object-cover" fetchPriority="high" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-4xl bg-axo-100 text-8xl">{EMOJI[pet.species]}</div>
        )}

        <div className="text-center">
          <h1 className="text-5xl">{pet.name}</h1>
          {pet.breed && <p className="mt-1 text-lg font-bold text-ink/70">{pet.breed}</p>}
          {pet.description && <p className="mt-2 text-ink/80">{pet.description}</p>}
        </div>

        {pet.is_lost && pet.lost && (pet.lost.last_seen_description || pet.lost.extra_info) && (
          <div className="card space-y-2">
            <p className="text-sm font-extrabold uppercase tracking-wide text-red-600">Dónde y cuándo</p>
            <p className="text-sm text-ink/70">Se perdió el {formatDate(pet.lost.lost_at, true)}</p>
            {pet.lost.last_seen_description && <p>📍 {pet.lost.last_seen_description}</p>}
            {pet.lost.extra_info && <p>{pet.lost.extra_info}</p>}
          </div>
        )}

        <section className="space-y-3" aria-label="Contactar a la familia">
          <h2 className="text-xl">{pet.is_lost ? '📞 Contactar a su familia' : '¿Quieres contactar a mi familia?'}</h2>
          {pet.contacts.length === 0 && (
            <p className="muted">
              La familia no comparte un contacto directo. Usa el botón de reportar ubicación y recibirán tu aviso.
            </p>
          )}
          {pet.contacts.map((c, i) => (
            <div key={i} className="card space-y-2">
              <p className="font-extrabold">
                {c.name}
                {c.relationship ? <span className="font-semibold text-ink/60"> · {c.relationship}</span> : null}
              </p>
              {c.whatsapp && (
                <a href={waLink(c.whatsapp, msg)} className="btn w-full bg-emerald-600 py-4 text-lg text-white hover:bg-emerald-700">
                  💬 WhatsApp
                </a>
              )}
              {c.phone && (
                <a href={telLink(c.phone)} className="btn-primary w-full py-4 text-lg">
                  📞 Llamar
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Encontré a ${pet.name}`)}`} className="btn-outline w-full">
                  ✉️ Enviar correo
                </a>
              )}
            </div>
          ))}
        </section>

        {pet.allow_location_reports && (
          <section className="space-y-2">
            <h2 className="text-xl">{pet.is_lost ? '¿La encontraste?' : '¿Me encontraste?'}</h2>
            <Link href={`/pet/${pet.public_id}/report`} className="btn-primary w-full py-4 text-lg">
              📍 Reportar ubicación
            </Link>
            <p className="muted text-center">Sin cuentas ni apps. Solo toma un momento.</p>
          </section>
        )}

        {pet.is_lost && pet.lost?.reward_amount != null && pet.lost.reward_amount > 0 && (
          <div className="card bg-butter text-center">
            <p className="text-2xl font-extrabold">🎁 Recompensa: {formatMoney(pet.lost.reward_amount)}</p>
            <p className="muted mt-1">Recompensa ofrecida por la familia de la mascota.</p>
          </div>
        )}

        {hasEmergency ? (
          <section className="card space-y-3" aria-label="Información importante">
            <h2 className="text-xl">❤️ Información importante</h2>
            {em.allergies.length > 0 && <Row icon="⚠️" title="Alergias" items={em.allergies} />}
            {em.sensitivities.length > 0 && <Row icon="😨" title="Se asusta con" items={em.sensitivities} />}
            {em.behavior.length > 0 && <Row icon="🐾" title="Comportamiento" items={em.behavior} />}
            {em.special_care && <Block icon="❤️" title="Cuidados especiales" text={em.special_care} />}
            {em.medications && <Block icon="💊" title="Medicamentos" text={em.medications} />}
            {em.vet_info && <Block icon="🩺" title="Información veterinaria" text={em.vet_info} />}
            <p className="muted border-t border-axo-100 pt-3">
              Información proporcionada por el dueño. No sustituye las indicaciones de un veterinario.
            </p>
          </section>
        ) : null}

        <footer className="flex items-center justify-center gap-2 pt-4 text-xs font-bold text-ink/50">
          <AxoMark size={20} />
          Placa AJolote ID · Ajolote de Bolsillo
        </footer>
      </div>
    </main>
  )
}

function Row({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-sm font-extrabold">{icon} {title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
    </div>
  )
}

function Block({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-extrabold">{icon} {title}</p>
      <p className="whitespace-pre-line">{text}</p>
    </div>
  )
}
