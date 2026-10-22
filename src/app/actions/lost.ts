'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { go } from '@/lib/flash'
import { createClient } from '@/lib/supabase/server'
import { MX_OFFSET, str } from '@/lib/utils'

function parseLost(fd: FormData) {
  const lostAtRaw = str(fd.get('lost_at'))
  const lostAt = lostAtRaw ? new Date(`${lostAtRaw}${MX_OFFSET}`) : new Date()
  const latRaw = str(fd.get('last_seen_lat'))
  const lngRaw = str(fd.get('last_seen_lng'))
  const rewardRaw = str(fd.get('reward_amount'))
  const reward = rewardRaw ? Number(rewardRaw.replace(/[$,\s]/g, '')) : null

  const lat = latRaw ? Number(latRaw) : null
  const lng = lngRaw ? Number(lngRaw) : null
  return {
    error:
      Number.isNaN(lostAt.getTime()) || lostAt.getTime() > Date.now() + 60_000
        ? 'La fecha de pérdida no es válida.'
        : reward !== null && (Number.isNaN(reward) || reward < 0 || reward > 10_000_000)
          ? 'La recompensa no es válida.'
          : (lat === null) !== (lng === null) || (lat !== null && (Number.isNaN(lat) || Number.isNaN(lng!)))
            ? 'La ubicación no es válida.'
            : null,
    values: {
      lost_at: lostAt.toISOString(),
      last_seen_lat: lat,
      last_seen_lng: lng,
      last_seen_description: str(fd.get('last_seen_description'))?.slice(0, 500) ?? null,
      extra_info: str(fd.get('extra_info'))?.slice(0, 1000) ?? null,
      reward_amount: reward,
    },
  }
}

export async function activateLost(petId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}`
  const { error: invalid, values } = parseLost(fd)
  if (invalid) go(back, 'error', invalid)

  const supabase = await createClient()
  const { error } = await supabase.from('lost_pet_reports').insert({ pet_id: petId, ...values })
  if (error) {
    go(back, 'error', error.code === '23505' ? 'Ya está en modo perdida.' : 'No pudimos activar el modo perdida.')
  }
  revalidatePath(back)
  go(back, 'ok', '🚨 Modo perdida activado. El perfil público ya lo muestra.')
}

export async function updateLost(petId: string, reportId: string, fd: FormData) {
  await requireUser()
  const back = `/pets/${petId}`
  const { error: invalid, values } = parseLost(fd)
  if (invalid) go(back, 'error', invalid)

  const supabase = await createClient()
  const { error } = await supabase.from('lost_pet_reports').update(values).eq('id', reportId).eq('pet_id', petId).is('ended_at', null)
  if (error) go(back, 'error', 'No pudimos actualizar los datos.')
  go(back, 'ok', 'Datos del modo perdida actualizados.')
}

export async function endLost(petId: string, reportId: string, resolution: 'found' | 'cancelled') {
  await requireUser()
  const back = `/pets/${petId}`
  const supabase = await createClient()
  const { error } = await supabase
    .from('lost_pet_reports')
    .update({ ended_at: new Date().toISOString(), resolution })
    .eq('id', reportId)
    .eq('pet_id', petId)
    .is('ended_at', null)
  if (error) go(back, 'error', 'No pudimos desactivar el modo perdida.')
  revalidatePath(back)
  go(back, 'ok', resolution === 'found' ? '🎉 ¡Qué alegría! Modo perdida desactivado.' : 'Modo perdida desactivado.')
}
