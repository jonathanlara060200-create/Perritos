'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { str } from '@/lib/utils'

const petSchema = z.object({
  name: z.string().min(1, 'Escribe el nombre de tu mascota.').max(60),
  species: z.enum(['dog', 'cat', 'other']),
  sex: z.enum(['male', 'female', 'unknown']),
  breed: z.string().max(80).nullable(),
  color: z.string().max(80).nullable(),
  description: z.string().max(1000).nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  weight_kg: z.number().positive('El peso debe ser mayor a 0.').max(200).nullable(),
})

function parsePet(fd: FormData) {
  const w = str(fd.get('weight_kg'))
  return petSchema.safeParse({
    name: str(fd.get('name')) ?? '',
    species: fd.get('species'),
    sex: fd.get('sex') ?? 'unknown',
    breed: str(fd.get('breed')),
    color: str(fd.get('color')),
    description: str(fd.get('description')),
    birth_date: str(fd.get('birth_date')),
    weight_kg: w ? Number(w.replace(',', '.')) : null,
  })
}

export async function createPet(fd: FormData) {
  const user = await requireUser()
  const parsed = parsePet(fd)
  if (!parsed.success) go('/pets/new', 'error', parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...parsed.data, owner_id: user.id })
    .select('id')
    .single()
  if (error || !data) go('/pets/new', 'error', 'No pudimos guardar la mascota. Intenta de nuevo.')

  go(`/pets/${data.id}/edit`, 'ok', '¡Mascota creada! Ahora agrega su foto e información de emergencia.')
}

export async function updatePet(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}/edit`
  const parsed = parsePet(fd)
  if (!parsed.success) go(back, 'error', parsed.error.issues[0].message)

  const supabase = await createClient()
  const { error } = await supabase.from('pets').update(parsed.data).eq('id', petId)
  if (error) go(back, 'error', 'No pudimos guardar los cambios.')
  revalidatePath(`/pets/${petId}`)
  go(back, 'ok', 'Datos guardados.')
}

export async function deletePet(petId: string, fd: FormData) {
  await requireUser()
  if (fd.get('confirm') !== 'on') go(`/pets/${petId}/edit`, 'error', 'Marca la casilla para confirmar.')
  const supabase = await createClient()

  const { data: photos } = await supabase.from('pet_photos').select('storage_path').eq('pet_id', petId)
  if (photos?.length) await supabase.storage.from('pet-photos').remove(photos.map((p: { storage_path: string }) => p.storage_path))

  const { error } = await supabase.from('pets').delete().eq('id', petId)
  if (error) go(`/pets/${petId}/edit`, 'error', 'No pudimos eliminar la mascota.')
  go('/pets', 'ok', 'Mascota eliminada. Su QR y NFC dejaron de funcionar.')
}

/* ---------- Fotos ---------- */

const MAX_PHOTO = 5 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function uploadPhoto(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}/edit`
  const file = fd.get('photo')
  if (!(file instanceof File) || file.size === 0) go(back, 'error', 'Selecciona una foto.')
  if (!TYPES[file.type]) go(back, 'error', 'Solo se permiten fotos JPG, PNG o WebP.')
  if (file.size > MAX_PHOTO) go(back, 'error', 'La foto pesa más de 5 MB.')

  const supabase = await createClient()
  const { data: pet } = await supabase.from('pets').select('id, owner_id, main_photo_path').eq('id', petId).single()
  if (!pet) go('/pets', 'error', 'Mascota no encontrada.')

  const { count } = await supabase.from('pet_photos').select('id', { count: 'exact', head: true }).eq('pet_id', petId)
  if ((count ?? 0) >= 6) go(back, 'error', 'Máximo 6 fotos por mascota. Elimina alguna para subir otra.')

  const path = `${pet.owner_id}/${petId}/${crypto.randomUUID()}.${TYPES[file.type]}`
  const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) go(back, 'error', 'No pudimos subir la foto.')

  const { error: rowErr } = await supabase.from('pet_photos').insert({ pet_id: petId, storage_path: path, sort_order: count ?? 0 })
  if (rowErr) {
    await supabase.storage.from('pet-photos').remove([path])
    go(back, 'error', 'No pudimos guardar la foto.')
  }
  if (!pet.main_photo_path) await supabase.from('pets').update({ main_photo_path: path }).eq('id', petId)

  revalidatePath(`/pets/${petId}`)
  go(back, 'ok', 'Foto agregada.')
}

export async function setMainPhoto(petId: string, photoId: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: photo } = await supabase.from('pet_photos').select('storage_path').eq('id', photoId).eq('pet_id', petId).single()
  if (!photo) go(`/pets/${petId}/edit`, 'error', 'Foto no encontrada.')
  await supabase.from('pets').update({ main_photo_path: photo.storage_path }).eq('id', petId)
  go(`/pets/${petId}/edit`, 'ok', 'Foto principal actualizada.')
}

export async function deletePhoto(petId: string, photoId: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: photo } = await supabase.from('pet_photos').select('storage_path').eq('id', photoId).eq('pet_id', petId).single()
  if (!photo) go(`/pets/${petId}/edit`, 'error', 'Foto no encontrada.')

  await supabase.storage.from('pet-photos').remove([photo.storage_path])
  await supabase.from('pet_photos').delete().eq('id', photoId)

  const { data: pet } = await supabase.from('pets').select('main_photo_path').eq('id', petId).single()
  if (pet?.main_photo_path === photo.storage_path) {
    const { data: next } = await supabase
      .from('pet_photos')
      .select('storage_path')
      .eq('pet_id', petId)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    await supabase.from('pets').update({ main_photo_path: next?.storage_path ?? null }).eq('id', petId)
  }
  go(`/pets/${petId}/edit`, 'ok', 'Foto eliminada.')
}

/* ---------- Información de emergencia ---------- */

function listFrom(fd: FormData, checks: string, other: string) {
  const fromChecks = fd.getAll(checks).map(String)
  const fromText = String(fd.get(other) ?? '').split(/[\n,;]+/)
  return [...fromChecks, ...fromText]
    .map((s) => s.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 20)
}

export async function saveEmergency(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}/edit`
  const supabase = await createClient()
  const { error } = await supabase.from('pet_emergency_info').upsert(
    {
      pet_id: petId,
      allergies: String(fd.get('allergies') ?? '')
        .split(/[\n,;]+/)
        .map((s) => s.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 20),
      sensitivities: listFrom(fd, 'sensitivities', 'sensitivities_other'),
      behavior: listFrom(fd, 'behavior', 'behavior_other'),
      special_care: str(fd.get('special_care'))?.slice(0, 1000) ?? null,
      medications: str(fd.get('medications'))?.slice(0, 1000) ?? null,
      vet_info: str(fd.get('vet_info'))?.slice(0, 1000) ?? null,
    },
    { onConflict: 'pet_id' },
  )
  if (error) go(back, 'error', 'No pudimos guardar la información de emergencia.')
  go(back, 'ok', 'Información de emergencia guardada.')
}

/* ---------- Privacidad ---------- */

const VIS_KEYS = [
  'show_photo',
  'show_breed',
  'show_description',
  'show_allergies',
  'show_sensitivities',
  'show_behavior',
  'show_special_care',
  'show_medications',
  'show_vet_info',
  'show_reward',
  'allow_location_reports',
] as const

export async function saveVisibility(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}/edit`
  const values: Record<string, boolean> = {}
  for (const k of VIS_KEYS) values[k] = fd.get(k) === 'on'

  const supabase = await createClient()
  const { error } = await supabase.from('pet_visibility').update(values).eq('pet_id', petId)
  if (error) go(back, 'error', 'No pudimos guardar la privacidad.')
  go(back, 'ok', 'Privacidad actualizada. El perfil público ya refleja los cambios.')
}

/* ---------- Contactos ---------- */

const cleanPhone = (v: string | null) => (v ? v.replace(/[^\d+]/g, '').slice(0, 30) || null : null)

export async function addContact(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}/edit`
  const name = str(fd.get('name'))
  const phone = cleanPhone(str(fd.get('phone')))
  const whatsapp = cleanPhone(str(fd.get('whatsapp')))
  const emailRaw = str(fd.get('email'))
  const email = emailRaw && z.string().email().safeParse(emailRaw).success ? emailRaw.slice(0, 160) : null

  if (!name) go(back, 'error', 'Escribe el nombre del contacto.')
  if (emailRaw && !email) go(back, 'error', 'El correo no es válido.')
  if (!phone && !whatsapp && !email) go(back, 'error', 'Agrega al menos un teléfono, WhatsApp o correo.')

  const supabase = await createClient()
  const { count } = await supabase.from('pet_contacts').select('id', { count: 'exact', head: true }).eq('pet_id', petId)
  if ((count ?? 0) >= 5) go(back, 'error', 'Máximo 5 contactos por mascota.')

  const wantsPrimary = fd.get('is_primary') === 'on' || (count ?? 0) === 0
  if (wantsPrimary) await supabase.from('pet_contacts').update({ is_primary: false }).eq('pet_id', petId)

  const { error } = await supabase.from('pet_contacts').insert({
    pet_id: petId,
    name: name.slice(0, 80),
    relationship: str(fd.get('relationship'))?.slice(0, 60) ?? null,
    phone,
    whatsapp,
    email,
    is_primary: wantsPrimary,
    show_phone: fd.get('show_phone') === 'on',
    show_whatsapp: fd.get('show_whatsapp') === 'on',
    show_email: fd.get('show_email') === 'on',
    sort_order: count ?? 0,
  })
  if (error) go(back, 'error', 'No pudimos guardar el contacto.')
  go(back, 'ok', 'Contacto agregado.')
}

export async function deleteContact(petId: string, contactId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from('pet_contacts').delete().eq('id', contactId).eq('pet_id', petId)
  go(`/pets/${petId}/edit`, 'ok', 'Contacto eliminado.')
}

/* ---------- Placas ---------- */

const CLAIM_ERRORS: Record<string, string> = {
  not_your_pet: 'Esa mascota no es tuya.',
  invalid_tag: 'No encontramos esa placa. Revisa el código (ej. AJB-000001).',
  invalid_code: 'El código de activación no es correcto.',
  tag_locked: 'Demasiados intentos fallidos. Escríbenos para ayudarte.',
  tag_not_claimable: 'Esta placa ya fue activada o todavía no está lista.',
  tag_assigned_to_other_pet: 'Esta placa fue hecha para otra mascota.',
}

export async function claimTag(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}`
  const tagCode = str(fd.get('tag_code'))
  const claimCode = str(fd.get('claim_code'))
  if (!tagCode || !claimCode) go(back, 'error', 'Escribe el código de la placa y el código de activación.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('claim_tag', { p_tag_code: tagCode, p_claim_code: claimCode, p_pet_id: petId })
  if (error) go(back, 'error', 'No pudimos activar la placa.')
  if (data !== 'ok') go(back, 'error', CLAIM_ERRORS[data as string] ?? 'No pudimos activar la placa.')
  revalidatePath(back)
  go(back, 'ok', '¡Placa activada! Ya puede ayudar a tu mascota a volver a casa.')
}

export async function setTagStatus(petId: string, tagId: string, status: 'lost' | 'deactivated' | 'active') {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc('owner_set_tag_status', { p_tag_id: tagId, p_status: status })
  if (error) go(`/pets/${petId}`, 'error', 'No pudimos actualizar la placa.')
  go(`/pets/${petId}`, 'ok', 'Placa actualizada.')
}

/* ---------- Notificaciones ---------- */

export async function markNotificationsRead() {
  const user = await requireUser()
  const supabase = await createClient()
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/dashboard')
}
