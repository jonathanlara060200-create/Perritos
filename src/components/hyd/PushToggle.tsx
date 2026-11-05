"use client"

import { useEffect, useState, useTransition } from "react"
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions/hyd"

const toKey = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0))
const b64u = (buf: ArrayBuffer | null) => {
  if (!buf) return ""
  let s = ""
  for (const x of new Uint8Array(buf)) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

type St = "loading" | "unsupported" | "denied" | "off" | "on"

export function PushToggle({ publicKey, configured, subscribedEndpoints }: { publicKey: string; configured: boolean; subscribedEndpoints: string[] }) {
  const [state, setState] = useState<St>("loading")
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported")
      if (Notification.permission === "denied") return setState("denied")
      const reg = (await navigator.serviceWorker.getRegistration()) ?? null
      const sub = await reg?.pushManager.getSubscription()
      setState(sub && subscribedEndpoints.includes(sub.endpoint) ? "on" : "off")
    })().catch(() => setState("unsupported"))
  }, [subscribedEndpoints])

  function enable() {
    setMsg(null)
    start(async () => {
      try {
        const perm = await Notification.requestPermission()
        if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return setMsg("No activamos nada. Puedes intentarlo cuando quieras.") }
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"))
        await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) })
        const r = await savePushSubscription({ endpoint: sub.endpoint, p256dh: b64u(sub.getKey("p256dh")), auth: b64u(sub.getKey("auth")) })
        if (!r.ok) { await sub.unsubscribe(); return setMsg(r.error) }
        setState("on")
        setMsg("¡Listo! Este dispositivo recibirá tus recordatorios.")
      } catch {
        setMsg("No pudimos activar los avisos en este navegador.")
      }
    })
  }
  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe() }
      setState("off")
      setMsg("Avisos desactivados en este dispositivo.")
    })
  }
  function test() {
    start(async () => {
      const r = await sendTestPush()
      setMsg(r.ok ? "Enviamos una notificación de prueba." : r.error)
    })
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
      <h2 className="font-bold text-[#0B3C5D]">Notificaciones en este dispositivo</h2>
      {!configured || !publicKey ? (
        <p className="mt-2 text-sm text-slate-600">Los avisos todavía no están disponibles en el servidor. Puedes usar la plataforma con normalidad.</p>
      ) : state === "loading" ? (
        <p className="mt-2 text-sm text-slate-500">Revisando…</p>
      ) : state === "unsupported" ? (
        <p className="mt-2 text-sm text-slate-600">Este navegador no admite notificaciones. En iPhone, primero usa “Compartir → Agregar a pantalla de inicio” y abre la app desde ahí.</p>
      ) : state === "denied" ? (
        <p className="mt-2 text-sm text-slate-600">Bloqueaste las notificaciones en este navegador. Puedes volver a permitirlas desde los ajustes del sitio; mientras tanto todo lo demás funciona igual.</p>
      ) : state === "on" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-emerald-700">● Activadas</span>
          <button onClick={test} disabled={pending} className="rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-semibold text-[#0B3C5D]">Enviar prueba</button>
          <button onClick={disable} disabled={pending} className="rounded-xl px-3 py-1.5 text-sm text-slate-600 underline">Desactivar</button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-slate-600">Tu navegador te pedirá permiso. Es opcional.</p>
          <button onClick={enable} disabled={pending} className="mt-2 rounded-2xl bg-[#1E7FD8] px-4 py-2 font-bold text-white">{pending ? "Activando…" : "Activar notificaciones"}</button>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm text-[#0B3C5D]">{msg}</p>}
    </section>
  )
}
