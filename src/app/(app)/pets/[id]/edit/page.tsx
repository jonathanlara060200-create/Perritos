import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  addContact,
  deleteContact,
  deletePet,
  deletePhoto,
  saveEmergency,
  saveVisibility,
  setMainPhoto,
  updatePet,
  uploadPhoto,
} from '@/app/actions/pets'
import { Flash } from '@/components/Flash'
import { PetFields } from '@/components/PetFields'
import { PhotoInput } from '@/components/PhotoInput'
import { SubmitButton } from '@/components/SubmitButton'
import { requireUser } from '@/lib/auth'
import { BEHAVIOR_PRESETS, SENSITIVITY_PRESETS, VISIBILITY_FIELDS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { photoUrl } from '@/lib/utils'

export const metadata = { title: 'Editar mascota' }

type Photo = { id: string; storage_path: string }
type Contact = {
  id: string
  name: string
  relationship: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  is_primary: boolean
  show_phone: boolean
  show_whatsapp: boolean
  show_email: boolean
}
type Emergency = {
  allergies: string[]
  sensitivities: string[]
  behavior: string[]
  special_care: string | null
  medications: string | null
  vet_info: string | null
}

export default async function EditPetPage({
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

  const [{ data: photoRows }, { data: contactRows }, { data: emgRow }, { data: visRow }] = await Promise.all([
    supabase.from('pet_photos').select('id, storage_path').eq('pet_id', id).order('sort_order'),
    supabase.from('pet_contacts').select('*').eq('pet_id', id).order('is_primary', { ascending: false }).order('sort_order'),
    supabase.from('pet_emergency_info').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('pet_visibility').select('*').eq('pet_id', id).maybeSingle(),
  ])
  const photos = (photoRows ?? []) as Photo[]
  const contacts = (contactRows ?? []) as Contact[]
  const emg = (emgRow ?? { allergies: [], sensitivities: [], behavior: [], special_care: null, medications: null, vet_info: null }) as Emergency
  const vis = (visRow ?? {}) as Record<string, boolean>

  const otherSens = emg.sensitivities.filter((s) => !SENSITIVITY_PRESETS.includes(s)).join(', ')
  const otherBeh = emg.behavior.filter((s) => !BEHAVIOR_PRESETS.includes(s)).join(', ')

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href={`/pets/${id}`} className="text-sm font-bold text-axo-600">← {pet.name}</Link>
      <h1 className="text-3xl">Editar a {pet.name}</h1>
      <Flash sp={sp} />

      <nav className="flex flex-wrap gap-2 text-sm font-bold">
        {[['datos', 'Datos'], ['fotos', 'Fotos'], ['emergencia', 'Emergencia'], ['contactos', 'Contactos'], ['privacidad', 'Privacidad']].map(([h, l]) => (
          <a key={h} href={`#${h}`} className="chip">{l}</a>
        ))}
      </nav>

      <section id="datos" className="card space-y-4">
        <h2 className="text-xl">Datos básicos</h2>
        <form action={updatePet.bind(null, id)} className="space-y-5">
          <PetFields pet={pet} />
          <SubmitButton className="btn-primary w-full">Guardar datos</SubmitButton>
        </form>
      </section>

      <section id="fotos" className="card space-y-4">
        <h2 className="text-xl">Fotos</h2>
        <p className="muted">La foto principal es la que se ve en el perfil público y la que usamos para diseñar su silueta. Máximo 6 fotos, 5 MB cada una.</p>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.storage_path)!} alt="" className={`aspect-square w-full rounded-2xl object-cover ${pet.main_photo_path === p.storage_path ? 'ring-4 ring-axo-400' : ''}`} />
              <div className="flex gap-1">
                {pet.main_photo_path !== p.storage_path && (
                  <form action={setMainPhoto.bind(null, id, p.id)} className="flex-1">
                    <button className="btn-soft btn-sm w-full px-1" title="Usar como principal">⭐</button>
                  </form>
                )}
                <form action={deletePhoto.bind(null, id, p.id)} className="flex-1">
                  <button className="btn-outline btn-sm w-full px-1" title="Eliminar">🗑️</button>
                </form>
              </div>
            </div>
          ))}
        </div>
        {photos.length < 6 && (
          <form action={uploadPhoto.bind(null, id)} className="space-y-3">
            <PhotoInput />
            <SubmitButton className="btn-primary w-full" pendingText="Subiendo…">Subir foto</SubmitButton>
          </form>
        )}
      </section>

      <section id="emergencia" className="card space-y-4">
        <h2 className="text-xl">Información de emergencia</h2>
        <p className="muted">Ayuda a quien la encuentre a cuidarla bien. Tú eliges qué se muestra en la sección de Privacidad.</p>
        <form action={saveEmergency.bind(null, id)} className="space-y-4">
          <div>
            <label className="label" htmlFor="allergies">Alergias</label>
            <textarea id="allergies" name="allergies" rows={2} defaultValue={emg.allergies.join(', ')} placeholder="Ej. Pollo, penicilina (separadas por coma)" className="input" />
          </div>
          <fieldset>
            <legend className="label">Se asusta con…</legend>
            <div className="space-y-2">
              {SENSITIVITY_PRESETS.map((s) => (
                <label key={s} className="flex items-center gap-2"><input type="checkbox" name="sensitivities" value={s} defaultChecked={emg.sensitivities.includes(s)} className="h-5 w-5" /> {s}</label>
              ))}
            </div>
            <input name="sensitivities_other" defaultValue={otherSens} placeholder="Otras (separadas por coma)" className="input mt-2" />
          </fieldset>
          <fieldset>
            <legend className="label">Comportamiento</legend>
            <div className="space-y-2">
              {BEHAVIOR_PRESETS.map((s) => (
                <label key={s} className="flex items-center gap-2"><input type="checkbox" name="behavior" value={s} defaultChecked={emg.behavior.includes(s)} className="h-5 w-5" /> {s}</label>
              ))}
            </div>
            <input name="behavior_other" defaultValue={otherBeh} placeholder="Otros (separados por coma)" className="input mt-2" />
          </fieldset>
          <div>
            <label className="label" htmlFor="special_care">Cuidados especiales</label>
            <textarea id="special_care" name="special_care" rows={2} maxLength={1000} defaultValue={emg.special_care ?? ''} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="medications">Medicamentos (opcional)</label>
            <textarea id="medications" name="medications" rows={2} maxLength={1000} defaultValue={emg.medications ?? ''} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="vet_info">Información veterinaria (opcional)</label>
            <textarea id="vet_info" name="vet_info" rows={2} maxLength={1000} defaultValue={emg.vet_info ?? ''} placeholder="Nombre y teléfono de su veterinario" className="input" />
          </div>
          <SubmitButton className="btn-primary w-full">Guardar información</SubmitButton>
        </form>
      </section>

      <section id="contactos" className="card space-y-4">
        <h2 className="text-xl">Contactos</h2>
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 rounded-2xl bg-axo-50 p-3">
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">{c.name}{c.is_primary && <span className="chip ml-2">Principal</span>}</p>
              {c.relationship && <p className="muted">{c.relationship}</p>}
              {c.whatsapp && <p>💬 {c.whatsapp} {c.show_whatsapp ? '· público' : '· oculto'}</p>}
              {c.phone && <p>📞 {c.phone} {c.show_phone ? '· público' : '· oculto'}</p>}
              {c.email && <p className="truncate">✉️ {c.email} {c.show_email ? '· público' : '· oculto'}</p>}
            </div>
            <form action={deleteContact.bind(null, id, c.id)}><button className="btn-outline btn-sm">Quitar</button></form>
          </div>
        ))}
        <form action={addContact.bind(null, id)} className="space-y-3 border-t border-axo-100 pt-4">
          <p className="font-bold">Agregar contacto</p>
          <input name="name" required maxLength={80} placeholder="Nombre" className="input" />
          <input name="relationship" maxLength={60} placeholder="Parentesco (ej. Mamá, Veterinario)" className="input" />
          <input name="whatsapp" inputMode="tel" placeholder="WhatsApp (10 dígitos)" className="input" />
          <input name="phone" inputMode="tel" placeholder="Teléfono" className="input" />
          <input name="email" type="email" placeholder="Correo" className="input" />
          <fieldset className="space-y-2">
            <legend className="label">¿Qué se muestra públicamente?</legend>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_whatsapp" defaultChecked className="h-5 w-5" /> WhatsApp</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_phone" className="h-5 w-5" /> Teléfono</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_email" className="h-5 w-5" /> Correo</label>
          </fieldset>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_primary" className="h-5 w-5" /> Es el contacto principal</label>
          <SubmitButton className="btn-primary w-full">Agregar contacto</SubmitButton>
        </form>
      </section>

      <section id="privacidad" className="card space-y-4">
        <h2 className="text-xl">Privacidad: qué ve quien escanee</h2>
        <p className="muted">Nunca mostramos tu dirección. Solo aparece lo que marques aquí.</p>
        <form action={saveVisibility.bind(null, id)} className="space-y-3">
          {VISIBILITY_FIELDS.map((f) => (
            <label key={f.key} className="flex items-start gap-3">
              <input type="checkbox" name={f.key} defaultChecked={vis[f.key]} className="mt-0.5 h-5 w-5" />
              <span>
                <span className="font-bold">{f.label}</span>
                {f.hint && <span className="muted block">{f.hint}</span>}
              </span>
            </label>
          ))}
          <SubmitButton className="btn-primary w-full">Guardar privacidad</SubmitButton>
        </form>
      </section>

      <details className="card border-red-200">
        <summary className="cursor-pointer font-bold text-red-700">Eliminar a {pet.name}</summary>
        <form action={deletePet.bind(null, id)} className="mt-3 space-y-3">
          <p className="muted">Se borran su perfil, fotos, contactos y reportes. Su QR y NFC dejarán de funcionar. No se puede deshacer.</p>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="confirm" className="h-5 w-5" /> Entiendo y quiero eliminarla</label>
          <SubmitButton className="btn-danger w-full" pendingText="Eliminando…">Eliminar mascota</SubmitButton>
        </form>
      </details>
    </div>
  )
}
