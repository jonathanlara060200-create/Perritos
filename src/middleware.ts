import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

// Solo corre donde hay sesión. El perfil público (/pet/...) queda fuera a propósito: máxima velocidad.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pets/:path*',
    '/orders/:path*',
    '/lost/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
}
