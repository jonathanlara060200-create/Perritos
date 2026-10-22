'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { go } from '@/lib/flash'
import { safeNext, siteUrl, str } from '@/lib/utils'

const emailSchema = z.string().trim().email('Escribe un correo válido.').max(160)
const passwordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72)

export async function signIn(fd: FormData) {
  const next = safeNext(fd.get('next'))
  const email = emailSchema.safeParse(fd.get('email'))
  const password = String(fd.get('password') ?? '')
  if (!email.success || !password) go('/login', 'error', 'Escribe tu correo y contraseña.')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password })
  if (error) go(`/login?next=${encodeURIComponent(next)}`, 'error', 'Correo o contraseña incorrectos.')
  redirect(next)
}

export async function signUp(fd: FormData) {
  const email = emailSchema.safeParse(fd.get('email'))
  const password = passwordSchema.safeParse(fd.get('password'))
  const fullName = str(fd.get('full_name'))
  if (!email.success) go('/register', 'error', email.error.issues[0].message)
  if (!password.success) go('/register', 'error', password.error.issues[0].message)
  if (!fullName) go('/register', 'error', 'Escribe tu nombre.')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      data: { full_name: fullName.slice(0, 120) },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard`,
    },
  })
  if (error) go('/register', 'error', 'No pudimos crear tu cuenta. ¿Ya tienes una con este correo?')
  if (data.session) redirect('/dashboard')
  go('/login', 'ok', 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
}

export async function requestPasswordReset(fd: FormData) {
  const email = emailSchema.safeParse(fd.get('email'))
  if (!email.success) go('/forgot-password', 'error', email.error.issues[0].message)
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  })
  // Siempre la misma respuesta: no revelamos si el correo existe.
  go('/forgot-password', 'ok', 'Si el correo existe, te enviamos un enlace para cambiar tu contraseña.')
}

export async function updatePassword(fd: FormData) {
  const password = passwordSchema.safeParse(fd.get('password'))
  if (!password.success) go('/reset-password', 'error', password.error.issues[0].message)
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: password.data })
  if (error) go('/reset-password', 'error', 'No pudimos cambiar la contraseña. Pide un enlace nuevo.')
  go('/dashboard', 'ok', 'Contraseña actualizada.')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
