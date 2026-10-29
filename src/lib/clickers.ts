/** Colores de la base modular del clicker (los 4 que manejas). */
export const BASE_COLORS = [
  { name: 'Azul cielo', hex: '#8ED1F5' },
  { name: 'Amarillo', hex: '#FFD84D' },
  { name: 'Rosa bajito', hex: '#F8C8D8' },
  { name: 'Morado', hex: '#A98BDB' },
] as const

/** Colores comunes para teclas y letras (sugerencias; se puede escribir cualquier nombre). */
const OTHER_COLORS = [
  { name: 'Rosa', hex: '#F472B6' },
  { name: 'Rosa fuerte', hex: '#EC4899' },
  { name: 'Fucsia', hex: '#D946EF' },
  { name: 'Lila', hex: '#C4B5FD' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Coral', hex: '#FF7F6B' },
  { name: 'Naranja', hex: '#FB923C' },
  { name: 'Verde', hex: '#4ADE80' },
  { name: 'Verde menta', hex: '#A7E8C9' },
  { name: 'Verde oscuro', hex: '#15803D' },
  { name: 'Turquesa', hex: '#2DD4BF' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Azul marino', hex: '#1E3A8A' },
  { name: 'Negro', hex: '#1F1F1F' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#9CA3AF' },
  { name: 'Café', hex: '#8B5A2B' },
  { name: 'Beige', hex: '#E8D5B7' },
  { name: 'Dorado', hex: '#D4AF37' },
  { name: 'Plateado', hex: '#C0C0C0' },
] as const

export const COLOR_LIST: readonly { name: string; hex: string }[] = [...BASE_COLORS, ...OTHER_COLORS]

/** Minúsculas, sin acentos y sin espacios repetidos: "Rosa  Bajito" = "rosa bajito". */
export const colorKey = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

const COLOR_MAP = new Map(COLOR_LIST.map((c) => [colorKey(c.name), c.hex]))

/** Hex del color por nombre (o si escribiste directamente un #RRGGBB). null si no lo conocemos. */
export function colorHex(name?: string | null): string | null {
  if (!name) return null
  const k = colorKey(name)
  if (/^#[0-9a-f]{6}$/.test(k)) return k
  return COLOR_MAP.get(k) ?? null
}

/** Negro o blanco, el que mejor se lea sobre ese fondo. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1F1F1F' : '#FFFFFF'
}

export const ITEM_TYPE: Record<string, string> = {
  clicker: 'Clicker (nombre control)',
  llavero: 'Llavero',
  otro: 'Otro',
}

export const CUSTOM_STATUS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  ready: 'Listo para entregar',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const CUSTOM_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-butter text-ink',
  in_progress: 'bg-denim-100 text-denim-600',
  ready: 'bg-mint text-emerald-900',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-700',
}

/** Estados "abiertos": todavía hay trabajo o falta entregar. */
export const ACTIVE_STATUSES = ['pending', 'in_progress', 'ready']

/** Partes del clicker que se van completando. */
export const PARTS = [
  { key: 'base_done', label: 'Base' },
  { key: 'keys_done', label: 'Teclas' },
  { key: 'letters_done', label: 'Letras' },
] as const

export type PartKey = (typeof PARTS)[number]['key']

/** Cuántas teclas/letras lleva el nombre (los espacios no cuentan). */
export const countPieces = (name?: string | null) => (name ? [...name].filter((c) => c.trim() !== '').length : 0)

/** Precio automático del clicker: $ por cada letra (tecla) del nombre. */
export const PRICE_PER_LETTER = 20
