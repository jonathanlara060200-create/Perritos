// Arte de las placas como marcado SVG dentro de una caja de 100×100.
// Es la ÚNICA fuente de los dibujos: la app (PlateDesigner.tsx) y la propuesta de Figma usan este mismo arte.
// Los dibujos salen del calcado de las 3 referencias del dueño (ver plate-art-data.ts).
//
// Cada diseño tiene máximo 2 zonas de color (z1, z2) más el color de las letras = 3 colores como máximo.
// Cada zona se imprime en uno de los 4 filamentos.
// Estructura física: orificio integrado para la argolla arriba y un hueso/base donde va el nombre en relieve.

import { ART_DATA, type NameArea } from '@/lib/plate-art-data'

export const PLATE_HOLE = '#F2F7FD'

export type ZoneKey = 'z1' | 'z2'
export type PlateColors = { z1: string; z2: string }

export type DesignSpec = {
  /** Zonas de color que el cliente puede elegir, en orden. z1 = color principal (variante del producto). */
  zones: readonly { key: ZoneKey; label: string }[]
  /** Zona sobre la que van las letras (las letras no pueden ser del mismo filamento que esa zona). */
  lettersOn: ZoneKey
  /** Dónde va el nombre (caja 100×100): centro, ancho disponible y alto de mayúsculas. */
  area: NameArea
}

// Base con forma de hueso del diseño "solo silueta" (misma geometría que las referencias).
const BONE = { x: 22, y: 72, w: 56, h: 14, r: 6.5 }

export const DESIGN_SPECS: Record<string, DesignSpec> = {
  circulo: {
    zones: [
      { key: 'z1', label: 'Círculo' },
      { key: 'z2', label: 'Hueso y huellitas' },
    ],
    lettersOn: 'z2',
    area: ART_DATA.circulo.name,
  },
  caricatura: {
    zones: [
      { key: 'z1', label: 'Silueta' },
      { key: 'z2', label: 'Hueso de abajo' },
    ],
    lettersOn: 'z2',
    area: ART_DATA.caricatura.name,
  },
  silueta: {
    zones: [
      { key: 'z1', label: 'Silueta' },
      { key: 'z2', label: 'Hueso de abajo' },
    ],
    lettersOn: 'z2',
    area: { cx: 50, cy: BONE.y + BONE.h / 2, w: 50, h: 7 },
  },
}

const HEX = /^#[0-9A-Fa-f]{6}$/
const FALLBACK = '#F8C8D8'
const safe = (c: string | undefined) => (c && HEX.test(c) ? c : FALLBACK)

const holeMarkup = (h: { x: number; y: number; r: number }) =>
  `<circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="${PLATE_HOLE}" stroke="#000000" stroke-opacity=".18" stroke-width=".5"/>`

/** Un relleno de zona; el borde del mismo color tapa las costuras finas entre capas. */
const layer = (d: string, fill: string, seam = false) =>
  d ? `<path d="${d}" fill="${fill}" fill-rule="${seam ? 'nonzero' : 'evenodd'}"${seam ? ` stroke="${fill}" stroke-width=".3" stroke-linejoin="round"` : ''}/>` : ''

/** SVG (contenido) de un diseño con los colores (hex) de cada zona. No incluye el nombre. */
export function plateArtMarkup(id: string, colors: PlateColors): string {
  const c1 = safe(colors.z1)
  const c2 = safe(colors.z2)
  if (id === 'silueta') {
    const d = ART_DATA.silueta
    const { x, y, w, h, r } = BONE
    const bone = `<g fill="${c2}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/><circle cx="${x}" cy="${y + 3}" r="${r}"/><circle cx="${x}" cy="${y + h - 3}" r="${r}"/><circle cx="${x + w}" cy="${y + 3}" r="${r}"/><circle cx="${x + w}" cy="${y + h - 3}" r="${r}"/></g>`
    return bone + layer(d.sil, c1) + holeMarkup(d.hole)
  }
  if (id === 'caricatura') {
    const d = ART_DATA.caricatura
    // El hueso va debajo y el perrito encima (sus patitas quedan sobre el hueso).
    return layer(d.bone, c2) + layer(d.dog, c1) + holeMarkup(d.hole)
  }
  const d = ART_DATA.circulo
  return layer(d.z1, c1) + layer(d.z2, c2, true) + holeMarkup(d.hole)
}
