import { createClient } from '@supabase/supabase-js'

/**
 * Cliente anónimo, sin cookies ni sesión. Es el que usa el perfil público:
 * solo puede llamar a las funciones get_public_pet / report_pet_location y leer catálogo.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
