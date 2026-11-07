// Arte de las placas como marcado SVG dentro de una caja de 100×100.
// Es la ÚNICA fuente de las siluetas: la app (PlateDesigner.tsx) y el diseño en Figma usan este mismo dibujo.
//
// Estructura física (no cambiar sin consultar):
//   · silueta de la mascota arriba
//   · orificio integrado para la argolla (arriba, o en el pompón del gorro)
//   · base rectangular abajo para el nombre: x 19→81, y 81→92 (centro del nombre: 50, 86.5)
//
// Color: todo sale del filamento elegido; las luces y sombras son translúcidas sobre ese mismo filamento.
// Única excepción: el negro de la silueta "misteriosa", que es solo un recurso de la vista previa.

export const PLATE_HOLE = '#F2F7FD'
export const MYSTERY_BLACK = '#17171C'

/** Zona del nombre dentro de la base (unidades de la caja 100×100). */
export const NAME_AREA = { cx: 50, cy: 86.5, maxWidth: 54 } as const

const HEX = /^#[0-9A-Fa-f]{6}$/
const FALLBACK = '#F8C8D8'

const dark = (o: number) => `fill="#000000" fill-opacity="${o}"`
const light = (o: number) => `fill="#FFFFFF" fill-opacity="${o}"`
const detail = 'fill="#371A16" fill-opacity=".62"'

/** Base rectangular (con puntas redondas) donde va el nombre. */
function base(f: string) {
  return (
    `<g fill="${f}"><rect x="19" y="81" width="62" height="11"/>` +
    `<circle cx="19" cy="81.5" r="6"/><circle cx="19" cy="91.5" r="6"/>` +
    `<circle cx="81" cy="81.5" r="6"/><circle cx="81" cy="91.5" r="6"/></g>` +
    `<rect x="19" y="81" width="62" height="11" ${dark(0.08)}/>`
  )
}

/** Orificio para la argolla. */
const hole = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${PLATE_HOLE}" stroke="#000000" stroke-opacity=".15" stroke-width=".6"/>`

/** Perrito sentado. `details` agrega pecho, hocico, ojos y nariz (la silueta misteriosa no los lleva). */
function dog(f: string, details: boolean) {
  const parts =
    `<path d="M72 68 C87 68 92 56 86 47" fill="none" stroke="${f}" stroke-width="6" stroke-linecap="round"/>` +
    `<ellipse cx="31" cy="63" rx="10" ry="13" fill="${f}"/>` +
    `<ellipse cx="69" cy="63" rx="10" ry="13" fill="${f}"/>` +
    `<path d="M36 40 C31 52 30 62 33 72 L67 72 C70 62 69 52 64 40 Z" fill="${f}"/>` +
    `<rect x="37" y="58" width="9" height="17" rx="4.5" fill="${f}"/>` +
    `<rect x="54" y="58" width="9" height="17" rx="4.5" fill="${f}"/>` +
    `<ellipse cx="41.5" cy="75" rx="7" ry="3.6" fill="${f}"/>` +
    `<ellipse cx="58.5" cy="75" rx="7" ry="3.6" fill="${f}"/>` +
    `<path d="M34 18 C24 12 16 22 18 37 C20 42 28 41 32 34 Z" fill="${f}"/>` +
    `<path d="M66 18 C76 12 84 22 82 37 C80 42 72 41 68 34 Z" fill="${f}"/>` +
    `<ellipse cx="50" cy="28" rx="18" ry="16" fill="${f}"/>`
  if (!details) return parts
  return (
    parts +
    `<ellipse cx="50" cy="56" rx="9" ry="13" ${light(0.35)}/>` +
    `<path d="M31 24 C25 22 21 28 22 36 C24 38 28 37 30 33 Z" ${dark(0.16)}/>` +
    `<path d="M69 24 C75 22 79 28 78 36 C76 38 72 37 70 33 Z" ${dark(0.16)}/>` +
    `<ellipse cx="50" cy="34" rx="9.5" ry="7.5" ${light(0.45)}/>` +
    `<circle cx="43" cy="26" r="2.3" ${detail}/>` +
    `<circle cx="57" cy="26" r="2.3" ${detail}/>` +
    `<ellipse cx="50" cy="32" rx="3.6" ry="2.6" ${detail}/>` +
    `<path d="M50 34.5 L50 37 M45.5 38 C48 40.5 52 40.5 54.5 38" fill="none" stroke="#371A16" stroke-opacity=".62" stroke-width="1.3" stroke-linecap="round"/>`
  )
}

/** Gorro de Santa en el mismo filamento: el relieve se ve con luces y sombras, sin otros colores. */
function santaHat(f: string) {
  return (
    `<path d="M32 12.5 C32 5 40 0.5 50 0.5 C58 0.5 65 4 70 10 C65 8.5 61 8.5 58 9.5 C49 11.5 41 12 32 12.5 Z" fill="${f}"/>` +
    `<path d="M32 12.5 C32 5 40 0.5 50 0.5 C58 0.5 65 4 70 10 C65 8.5 61 8.5 58 9.5 C49 11.5 41 12 32 12.5 Z" ${dark(0.2)}/>` +
    `<rect x="29" y="10.5" width="42" height="8" rx="4" fill="${f}"/>` +
    `<rect x="29" y="10.5" width="42" height="8" rx="4" ${light(0.55)} stroke="#000000" stroke-opacity=".2" stroke-width=".8"/>` +
    `<circle cx="72.5" cy="8" r="4.8" fill="${f}"/>` +
    `<circle cx="72.5" cy="8" r="4.8" ${light(0.55)} stroke="#000000" stroke-opacity=".2" stroke-width=".8"/>` +
    hole(72.5, 8, 1.8)
  )
}

/** Huesito en la boca del perrito. */
function boneInMouth(f: string) {
  const shapes = (dy: number) =>
    `<rect x="31" y="${39.4 + dy}" width="38" height="4" rx="2"/>` +
    `<circle cx="31" cy="${39.6 + dy}" r="3.3"/><circle cx="31" cy="${43.2 + dy}" r="3.3"/>` +
    `<circle cx="69" cy="${39.6 + dy}" r="3.3"/><circle cx="69" cy="${43.2 + dy}" r="3.3"/>`
  // 1) contorno oscuro  2) el huesito en el filamento  3) luz encima para que se distinga de la cara
  return (
    `<g fill="none" stroke="#371A16" stroke-opacity=".55" stroke-width="1.8" stroke-linejoin="round">${shapes(0)}</g>` +
    `<g fill="${f}">${shapes(0)}</g><g ${light(0.6)}>${shapes(0)}</g>`
  )
}

/** Signo de interrogación dibujado con trazos (sin depender de ninguna fuente). */
const QUESTION =
  `<path d="M43 53 C43 45.5 57 45.5 57 53 C57 58 50 58.5 50 64" fill="none" stroke="${PLATE_HOLE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="50" cy="70" r="2.8" fill="${PLATE_HOLE}"/>`

/**
 * Marcado SVG (sin la etiqueta <svg>) de una silueta, pintada con el filamento `fill`.
 * `fill` debe ser un hex de 6 dígitos; si no lo es se usa un rosa de respaldo (así nunca entra texto inesperado).
 */
export function plateArtMarkup(id: string, fill: string): string {
  const f = HEX.test(fill) ? fill : FALLBACK
  switch (id) {
    case 'misteriosa':
      // Silueta negra solo en la vista previa; la base y el nombre sí llevan los filamentos reales.
      return base(f) + dog(MYSTERY_BLACK, false) + QUESTION + hole(50, 16.5, 2.7)
    case 'navidad':
      return base(f) + dog(f, true) + santaHat(f)
    case 'huesito':
      return base(f) + dog(f, true) + boneInMouth(f) + hole(50, 16.5, 2.7)
    default: // 'personalizada' (y 'normal', de pedidos anteriores)
      return base(f) + dog(f, true) + hole(50, 16.5, 2.7)
  }
}
