"use client"

import { useState, useTransition } from "react"
import { resetClaimCodeAction } from "@/app/actions/hyd"

/** Genera un código de activación nuevo para un llavero sin dueño (el anterior deja de servir). */
export function ResetClaimCode({ deviceId }: { deviceId: string }) {
  const [pending, start] = useTransition()
  const [code, setCode] = useState("")
  const [err, setErr] = useState("")

  return (
    <div className="mt-2">
      {!code && (
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 disabled:opacity-50"
          onClick={() => {
            if (!confirm("¿Generar un código de activación nuevo? El anterior dejará de funcionar.")) return
            start(async () => {
              setErr("")
              const r = await resetClaimCodeAction(deviceId)
              if (r.ok) setCode(r.claim_code)
              else setErr(r.error)
            })
          }}
        >
          {pending ? "Generando…" : "Nuevo código de activación"}
        </button>
      )}
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      {code && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm">
          <p><b>Código de activación:</b> <span className="font-mono text-base tracking-widest">{code}</span></p>
          <p className="text-amber-800">Guárdalo ahora: solo se muestra una vez.</p>
        </div>
      )}
    </div>
  )
}
