'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export type MapPoint = { lat: number; lng: number; label: string }

export function LocationMap({ points, className = 'h-72 w-full' }: { points: MapPoint[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || points.length === 0) return
    let map: import('leaflet').Map | undefined
    let cancelled = false

    import('leaflet').then((L) => {
      if (cancelled || !ref.current) return
      map = L.map(ref.current, { scrollWheelZoom: false })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)

      const bounds: [number, number][] = []
      points.forEach((p, i) => {
        // Círculos en vez de pines: no dependen de imágenes del bundle
        L.circleMarker([p.lat, p.lng], {
          radius: i === 0 ? 11 : 8,
          color: '#D4467A',
          weight: 3,
          fillColor: i === 0 ? '#EE5F8A' : '#FBAEBC',
          fillOpacity: 0.95,
        })
          .addTo(map!)
          .bindPopup(p.label)
        bounds.push([p.lat, p.lng])
      })
      if (bounds.length === 1) map.setView(bounds[0], 15)
      else map.fitBounds(bounds, { padding: [30, 30] })
    })

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [points])

  if (points.length === 0) return null
  return <div ref={ref} className={className} />
}
