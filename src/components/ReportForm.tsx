'use client'

import { useState } from 'react'
import { reportLocation } from '@/app/actions/public'

type State = 'idle' | 'locating' | 'sending' | 'done'

export function ReportForm({ publicId, petName }: { publicId: string; petName: string }) {
  const [state, setState] = useState<State>('idle')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  async function send(coords?: { lat: number; lng: number; accuracy: number }) {
    setState('sending')
    const res = await reportLocation({ publicId, note, ...coords })
    if (res.ok) {
      setState('done')
    } else {
      setState('idle')
      setMsg(res.error)
    }
  }

  function shareLocation() {
    setMsg('')
    if (!('geolocation' in navigator)) {
      setMsg('Tu navegador no permite compartir ubicación. Escribe dónde la viste y envía tu nota.')
      return
    }
    setState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => send({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {
        setState('idle')
        setMsg('No pudimos obtener tu ubicación. Puedes escribir dónde la viste y enviar solo la nota.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  if (state === 'done') {
    return (
      <div className="card bg-mint text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-2 text-2xl">¡Gracias por ayudar!</h2>
        <p className="mt-1">Ya avisamos a la familia de {petName}. Si puedes, quédate cerca con ella y contáctalos directamente.</p>
      </div>
    )
  }

  const busy = state !== 'idle'
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="note" className="label">¿Dónde la viste? (opcional)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ej. Cerca del parque, esquina con la farmacia"
          className="input"
        />
      </div>

      <button type="button" onClick={shareLocation} disabled={busy} className="btn-primary w-full py-4 text-lg">
        {state === 'locating' ? 'Obteniendo ubicación…' : state === 'sending' ? 'Enviando…' : '📍 Compartir mi ubicación'}
      </button>

      <button
        type="button"
        onClick={() => send()}
        disabled={busy || note.trim().length === 0}
        className="btn-outline w-full"
      >
        Enviar solo mi nota
      </button>

      {msg && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{msg}</p>}
      <p className="muted">
        Tu ubicación se usa solo para avisar a la familia. No guardamos tu nombre, teléfono ni dirección IP.
      </p>
    </div>
  )
}
