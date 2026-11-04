"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { logWaterAction } from "@/app/actions/hyd"

const QUICK = [100, 150, 250, 350, 500, 750]
const ACH: Record<string, string> = {
  first_log: "Primer registro",
  goal_reached: "Objetivo del día",
  streak_3: "3 días seguidos",
  streak_7: "7 días de constancia",
  first_month: "Primer mes",
}

export function QuickLog({ bottleMl, deviceCode }: { bottleMl: number; deviceCode?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [custom, setCustom] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function log(ml: number, source: "quick" | "bottle" | "manual") {
    setMsg(null)
    start(async () => {
      const r = await logWaterAction(ml, deviceCode ? "nfc" : source, deviceCode)
      if (!r.ok) return setMsg({ ok: false, text: r.error })
      const badges = r.achievements.map((a) => ACH[a]).filter(Boolean)
      setMsg({
        ok: true,
        text: `+${ml} ml registrados. Hoy llevas ${new Intl.NumberFormat("es-MX").format(r.total)} ml.` + (badges.length ? ` Logro: ${badges.join(", ")}.` : ""),
      })
      setCustom("")
      router.refresh()
    })
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
      <h2 className="text-lg font-bold text-[#0B3C5D]">Registrar agua</h2>
      <button
        type="button" disabled={pending} onClick={() => log(bottleMl, "bottle")}
        className="mt-3 w-full rounded-2xl bg-[#1E7FD8] px-4 py-4 text-lg font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        Tomé mi termo completo · {bottleMl} ml
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK.map((ml) => (
          <button
            key={ml} type="button" disabled={pending} onClick={() => log(ml, "quick")}
            className="rounded-xl bg-sky-50 py-3 font-semibold text-[#0B3C5D] ring-1 ring-sky-100 active:bg-sky-100 disabled:opacity-60"
          >
            {ml} ml
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="number" inputMode="numeric" min={1} max={10000} value={custom}
          onChange={(e) => setCustom(e.target.value)} placeholder="Otra cantidad (ml)" aria-label="Cantidad personalizada en mililitros"
          className="min-w-0 flex-1 rounded-xl border border-sky-200 px-3 py-3 text-base"
        />
        <button
          type="button" disabled={pending || !custom} onClick={() => log(Number(custom), "manual")}
          className="rounded-xl bg-[#0B3C5D] px-4 font-semibold text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
      <p role="status" aria-live="polite" className={`mt-3 min-h-6 text-sm ${msg ? (msg.ok ? "text-emerald-700" : "text-red-600") : ""}`}>
        {msg?.text}
      </p>
    </section>
  )
}
