import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = { name: string; value: string; options: CookieOptions }

const PROTECTED = ["/dashboard", "/pets", "/orders", "/lost", "/admin"]
// Páginas privadas del módulo de hidratación (landing, login, registro y /nfc/... son públicas).
const HYD_PROTECTED = [
  "/hidratacion/dashboard",
  "/hidratacion/perfil",
  "/hidratacion/historial",
  "/hidratacion/estadisticas",
  "/hidratacion/recordatorios",
]
const HYD_AUTH = ["/hidratacion/login", "/hidratacion/registro"]

const under = (path: string, base: string) => path === base || path.startsWith(base + "/")

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => under(path, p))
  const isHydProtected = HYD_PROTECTED.some((p) => under(path, p))

  if (!user && isHydProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/hidratacion/login"
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  if (user && HYD_AUTH.some((p) => under(path, p))) {
    const url = request.nextUrl.clone()
    url.pathname = "/hidratacion/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (user && (path === "/login" || path === "/register")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
