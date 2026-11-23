import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

export const getProfile = cache(async () => {
  const user = await getUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data as { id: string; full_name: string | null; phone: string | null; role: 'customer' | 'admin' } | null
})

export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')
  return profile
}

/** Quién puede entrar a los pedidos de clickers: el admin (todo) o el equipo de clickers (solo clickers, sin borrar). */
export const getClickerAccess = cache(async (): Promise<'admin' | 'staff' | null> => {
  const profile = await getProfile()
  if (!profile) return null
  if (profile.role === 'admin') return 'admin'
  const supabase = await createClient()
  const { data } = await supabase.rpc('is_clicker_staff')
  return data === true ? 'staff' : null
})

export async function requireClickerAccess() {
  const profile = await getProfile()
  if (!profile) redirect('/login?next=/clickers')
  const access = await getClickerAccess()
  if (!access) redirect('/dashboard')
  return access
}
