import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VapidGenerator } from "@/components/hyd/VapidGenerator"

export const metadata = { title: "Avisos de hidratación" }

export default async function Avisos() {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) redirect("/")
  const ok = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href="/admin/hidratacion" className="text-sm underline">← Hidratación</Link>
      <h1 className="text-2xl font-bold">Configurar avisos (push)</h1>
      <p className={`rounded-xl p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        {ok ? "Las variables VAPID están presentes en este despliegue." : "Faltan variables VAPID en este despliegue (ver pasos abajo). Mientras tanto, la plataforma funciona sin avisos."}
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Pulsa “Generar claves nuevas” (se crean en tu navegador).</li>
        <li>En Cloudflare → tu proyecto → Variables: agrega <b>NEXT_PUBLIC_VAPID_PUBLIC_KEY</b>, <b>VAPID_PRIVATE_KEY</b> y <b>VAPID_SUBJECT</b>. La pública debe existir antes del build.</li>
        <li>Ejecuta el SQL en Supabase para registrar el hash del CRON_SECRET.</li>
        <li>En GitHub → Settings → Secrets → Actions: <b>HYD_CRON_URL</b> (https://TU-DOMINIO/api/hyd/cron) y <b>HYD_CRON_SECRET</b> (el CRON_SECRET). El workflow <code>hyd-reminders.yml</code> llama cada ~15 min.</li>
        <li>Haz un nuevo despliegue.</li>
      </ol>
      <VapidGenerator />
    </div>
  )
}
