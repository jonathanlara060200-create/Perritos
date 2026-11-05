"use client"

import { useState } from "react"
import { bytesToB64u, generateVapidKeys } from "@/lib/webpush"

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("")

/** Todo se genera en TU navegador: nada se envía ni se guarda en ningún servidor. */
export function VapidGenerator() {
  const [out, setOut] = useState<{ pub: string; priv: string; cron: string; sql: string } | null>(null)

  async function make() {
    const k = await generateVapidKeys()
    const cron = bytesToB64u(crypto.getRandomValues(new Uint8Array(32)))
    const h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cron)))
    const sql = `insert into public.webhook_secrets(name, secret_hash) values ('hyd_cron', '${h}')\non conflict (name) do update set secret_hash = excluded.secret_hash;`
    setOut({ pub: k.publicKey, priv: k.privateKey, cron, sql })
  }
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div><p className="text-xs font-semibold text-slate-600">{k}</p><code className="block break-all rounded-lg bg-slate-100 p-2 text-xs">{v}</code></div>
  )
  return (
    <div className="space-y-3">
      <button onClick={make} className="rounded-xl bg-[#1E7FD8] px-4 py-2 font-bold text-white">Generar claves nuevas</button>
      {out && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">Cópialas ahora: no se vuelven a mostrar. Si generas otras, las suscripciones actuales dejan de funcionar.</p>
          <Row k="NEXT_PUBLIC_VAPID_PUBLIC_KEY (variable de build, pública)" v={out.pub} />
          <Row k="VAPID_PRIVATE_KEY (secreta)" v={out.priv} />
          <Row k="VAPID_SUBJECT (secreta o normal; pon tu correo)" v="mailto:tu-correo@ejemplo.com" />
          <Row k="CRON_SECRET (va en el programador, p. ej. secreto de GitHub Actions)" v={out.cron} />
          <Row k="SQL para ejecutar UNA vez en Supabase → SQL Editor" v={out.sql} />
        </div>
      )}
    </div>
  )
}
