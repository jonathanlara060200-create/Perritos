"use client"

import { useState, useTransition } from "react"
import { createDeviceAction } from "@/app/actions/hyd"

export function CreateDevice() {
  const [label, setLabel] = useState("")
  const [pending, start] = useTransition()
  const [res, setRes] = useState<{ code: string; claim_code: string; url: string } | null>(null)
  const [err, setErr] = useState("")

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-sky-100">
      <h2 className="font-bold">Generar llavero</h2>
      <div className="mt-2 flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (opcional)" className="input min-w-0 flex-1" />
        <button
          disabled={pending} className="rounded-xl bg-[#0B3C5D] px-4 font-semibold text-white disabled:opacity-50"
          onClick={() => start(async () => {
            setErr(""); setRes(null)
            const r = await createDeviceAction(label)
            if (r.ok) { setRes(r); setLabel("") } else setErr(r.error)
          })}
        >
          Crear
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {res && (
        <div className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm">
          <p><b>URL para grabar en el NFC:</b> <span className="break-all">{res.url}</span></p>
          <p><b>Código de activación:</b> <span className="font-mono text-base">{res.claim_code}</span></p>
          <p className="text-amber-800">Guarda el código de activación ahora: solo se muestra una vez.</p>
        </div>
      )}
    </div>
  )
}
