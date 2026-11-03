/** Colores de la base modular del clicker (los 4 que manejas). */
export const BASE_COLORS = [
  { name: 'Azul cielo', hex: '#8ED1F5' },
  { name: 'Amarillo', hex: '#FFD84D' },
  { name: 'Rosa bajito', hex: '#F8C8D8' },
  { name: 'Morado', hex: '#A98BDB' },
] as const

/** Los 4 colores de filamento que manejas: base, tecla y letra salen siempre de estos. */
export const COLOR_LIST: readonly { name: string; hex: string }[] = BASE_COLORS

/** Minúsculas, sin acentos y sin espacios repetidos: "Rosa  Bajito" = "rosa bajito". */
export const colorKey = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

/** Nombres abreviados o "de cariño" → el color real que tienes (Azul = Azul cielo, Lila = Morado, Rosa = Rosa bajito). */
const ALIASES: Record<string, string> = {
  azul: 'Azul cielo',
  'azul cielo': 'Azul cielo',
  'azul claro': 'Azul cielo',
  celeste: 'Azul cielo',
  rosa: 'Rosa bajito',
  'rosa bajito': 'Rosa bajito',
  'rosa claro': 'Rosa bajito',
  'rosa pastel': 'Rosa bajito',
  rosita: 'Rosa bajito',
  amarillo: 'Amarillo',
  morado: 'Morado',
  lila: 'Morado',
  lavanda: 'Morado',
  violeta: 'Morado',
  purpura: 'Morado',
}

/** Nombre oficial del color si lo reconocemos; si no, lo que se escribió (sin espacios sobrantes). */
export function canonicalColor(name?: string | null): string | null {
  const t = name?.trim()
  if (!t) return null
  return ALIASES[colorKey(t)] ?? t
}

const COLOR_MAP = new Map(COLOR_LIST.map((c) => [colorKey(c.name), c.hex]))

/** Hex del color por nombre (o si escribiste directamente un #RRGGBB). null si no lo conocemos. */
export function colorHex(name?: string | null): string | null {
  const c = canonicalColor(name)
  if (!c) return null
  const k = colorKey(c)
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

const SEGMENTER = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null

/** Una pieza por letra o emoji del nombre (los espacios no cuentan). */
export function pieces(name?: string | null): string[] {
  if (!name) return []
  const parts = SEGMENTER ? [...SEGMENTER.segment(name)].map((s) => s.segment) : [...name]
  return parts.filter((c) => c.trim() !== '')
}

/** Cuántas teclas/letras/bases lleva el nombre. */
export const countPieces = (name?: string | null) => pieces(name).length

/** Precio automático del clicker: $ por cada letra (tecla) del nombre. */
export const PRICE_PER_LETTER = 20

export type PendingGroup = {
  label: string
  /** Piezas por imprimir en este color. */
  n: number
  /** Letras a imprimir y cuántas de cada una. */
  letters: [string, number][]
  /** De quién son y cuántas piezas le tocan a cada quien. */
  who: { label: string; n: number }[]
}

/** Agrupa por color lo que falta por imprimir: una pieza por letra (o emoji) del nombre. */
export function groupPending(items: { color: string | null; name: string | null; who: string }[]): PendingGroup[] {
  const m = new Map<string, PendingGroup & { map: Map<string, number> }>()
  for (const it of items) {
    const chars = pieces(it.name).map((c) => c.toLocaleUpperCase('es-MX'))
    if (chars.length === 0) continue
    const label = canonicalColor(it.color) ?? 'Sin definir'
    const k = colorKey(label)
    let g = m.get(k)
    if (!g) {
      g = { label, n: 0, letters: [], who: [], map: new Map() }
      m.set(k, g)
    }
    g.n += chars.length
    for (const c of chars) g.map.set(c, (g.map.get(c) ?? 0) + 1)
    const w = g.who.find((x) => x.label === it.who)
    if (w) w.n += chars.length
    else g.who.push({ label: it.who, n: chars.length })
  }
  return [...m.values()]
    .map(({ map, ...g }) => ({ ...g, letters: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')) }))
    .sort((a, b) => b.n - a.n)
}
