import Link from "next/link"
import { redirect } from "next/navigation"
import { claimDevice } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Tu llavero" }

export default async function NfcPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const code = decodeURIComponent(id).trim().toUpperCase().slice(0, 40)
  const here = `/hidratacion/nfc/${encodeURIComponent(code)}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data } = await supabase.rpc("hyd_device_lookup", { p_code: code })
  const state = (data as { state?: string } | null)?.state ?? "invalid"

  if (state === "mine") redirect(`/hidratacion/dashboard?nfc=${encodeURIComponent(code)}`)

  const card = "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100"

  if (state === "invalid" || state === "disabled")
    return (
      <div className={card}>
        <h1 className="text-xl font-extrabold text-[#0B3C5D]">{state === "disabled" ? "Este llavero está desactivado" : "No encontramos este llavero"}</h1>
        <p className="mt-2 text-slate-600">Revisa que lo hayas escaneado bien o escríbenos para ayudarte.</p>
      </div>
    )

  if (!user)
    return (
      <div className={card}>
        <h1 className="text-xl font-extrabold text-[#0B3C5D]">Bienvenido a tu llavero 💧</h1>
        <p className="mt-2 text-slate-600">Inicia sesión para registrar tu agua. Si es tu primera vez, crea tu cuenta.</p>
        <div className="mt-4 flex gap-3">
          <Link href={`/hidratacion/login?next=${encodeURIComponent(here)}`} className="rounded-2xl bg-[#1E7FD8] px-5 py-3 font-bold text-white">Iniciar sesión</Link>
          <Link href={`/hidratacion/registro?next=${encodeURIComponent(here)}`} className="rounded-2xl bg-white px-5 py-3 font-bold text-[#0B3C5D] ring-1 ring-sky-200">Crear cuenta</Link>
        </div>
      </div>
    )

  if (state === "taken")
    return (
      <div className={card}>
        <h1 className="text-xl font-extrabold text-[#0B3C5D]">Este llavero ya pertenece a otra cuenta</h1>
        <p className="mt-2 text-slate-600">Si crees que es un error, escríbenos.</p>
      </div>
    )

  // available + sesión: pedir el código de activación (viene con tu llavero)
  return (
    <div className={card}>
      <h1 className="text-xl font-extrabold text-[#0B3C5D]">Activa tu llavero</h1>
      <p className="mt-2 text-slate-600">Escribe el código de activación que viene con tu llavero.</p>
      <Flash sp={sp} />
      <form action={claimDevice} className="mt-4 space-y-3">
        <input type="hidden" name="code" value={code} />
        <input name="claim_code" required maxLength={16} autoComplete="off" autoCapitalize="characters" placeholder="Código de activación" className="input uppercase tracking-widest" />
        <button className="w-full rounded-2xl bg-[#1E7FD8] py-3 font-bold text-white">Activar</button>
      </form>
    </div>
  )
}
