import { redirect } from "next/navigation"
import { setDeviceStatus } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { CreateDevice } from "@/components/hyd/CreateDevice"
import { createClient } from "@/lib/supabase/server"
import { siteUrl } from "@/lib/utils"

export const metadata = { title: "Llaveros de hidratación" }

export default async function AdminHidratacion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) redirect("/")
  const { data: devices } = await supabase.from("hyd_devices").select("id, code, label, status, owner_id, claimed_at, last_seen_at").order("created_at", { ascending: false }).limit(200)

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Llaveros de hidratación</h1><a href="/admin/hidratacion/avisos" className="rounded-lg bg-sky-50 px-3 py-1 text-sm font-semibold">Configurar avisos (push)</a></div>
      <Flash sp={sp} />
      <CreateDevice />
      <ul className="space-y-2">
        {(devices ?? []).map((d) => (
          <li key={d.id} className="rounded-2xl bg-white p-3 ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <b className="font-mono">{d.code}</b> {d.label && <span className="text-slate-500">· {d.label}</span>}
                <div className="text-sm text-slate-500">{d.status === "active" ? "Activo (con dueño)" : d.status === "available" ? "Disponible" : "Desactivado"}</div>
                <div className="break-all text-xs text-slate-400">{siteUrl()}/hidratacion/nfc/{d.code}</div>
              </div>
              <form action={setDeviceStatus} className="flex gap-2">
                <input type="hidden" name="id" value={d.id} />
                {d.status === "disabled" ? (
                  <button name="status" value={d.owner_id ? "active" : "available"} className="rounded-lg bg-emerald-50 px-3 py-1 text-sm">Activar</button>
                ) : (
                  <button name="status" value="disabled" className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-700">Desactivar</button>
                )}
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
