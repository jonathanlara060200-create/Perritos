'use client'

import { useState } from 'react'

/** Botón que llena lat/lng ocultos con la ubicación actual del dueño (opcional). */
export function LocationPicker() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [msg, setMsg] = useState('')

  function pick() {
    setMsg('')
    if (!('geolocation' in navigator)) return setMsg('Tu navegador no permite obtener la ubicación.')
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMsg('No pudimos obtener tu ubicación.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  return (
    <div>
      <input type="hidden" name="last_seen_lat" value={coords?.lat ?? ''} />
      <input type="hidden" name="last_seen_lng" value={coords?.lng ?? ''} />
      <button type="button" onClick={pick} className="btn-outline btn-sm">
        {coords ? '✓ Ubicación guardada' : '📍 Usar mi ubicación actual'}
      </button>
      {msg && <p className="mt-1 text-sm font-bold text-red-700">{msg}</p>}
      <p className="muted mt-1">La ubicación exacta solo la ves tú. Públicamente solo se muestra la descripción.</p>
    </div>
  )
}
