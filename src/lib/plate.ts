// Catálogo del personalizador de placa. Los ids deben coincidir con la validación de create_order() en SQL.
import { COLOR_LIST, colorHex, officialColor } from '@/lib/clickers'

// ───────────────────────── Filamentos (única fuente de color de fabricación) ─────────────────────────

/** Orden en que se muestran los 4 filamentos que manejas. Los hex salen de lib/clickers.ts. */
const FILAMENT_ORDER = ['Amarillo', 'Morado', 'Azul cielo', 'Rosa bajito'] as const

const FILAMENT_LABELS: Record<string, string> = {
  Amarillo: 'Amarillo pastel',
  Morado: 'Morado pastel',
  'Azul cielo': 'Azul cielo pastel',
  'Rosa bajito': 'Rosa bajito pastel',
}

export type Filament = { name: string; label: string; hex: string }

/** Los únicos 4 colores con los que se fabrica: placa y letras salen siempre de aquí. */
export const FILAMENTS: readonly Filament[] = FILAMENT_ORDER.map((name) => ({
  name,
  label: FILAMENT_LABELS[name],
  hex: COLOR_LIST.find((c) => c.name === name)?.hex ?? '#CCCCCC',
}))

export const FILAMENT_NAMES = FILAMENTS.map((f) => f.name) as unknown as [string, ...string[]]

/** Filamento oficial para un nombre de color (reconoce alias: "Rosa" = "Rosa bajito"). null si no es uno de los 4. */
export const filamentOf = (name?: string | null): Filament | null => {
  const official = officialColor(name)
  return FILAMENTS.find((f) => f.name === official) ?? null
}

export const filamentHex = (name?: string | null) => colorHex(name)

export type Palette = { z1: string; z2: string; z3: string; letters: string }

/** Paletas sugeridas, solo con los 4 filamentos. Las letras nunca igualan a z2 (la zona donde van). */
export const SUGGESTED_PALETTES: readonly Palette[] = [
  { z1: 'Morado', z2: 'Rosa bajito', z3: 'Amarillo', letters: 'Morado' },
  { z1: 'Azul cielo', z2: 'Amarillo', z3: 'Morado', letters: 'Azul cielo' },
  { z1: 'Rosa bajito', z2: 'Amarillo', z3: 'Morado', letters: 'Morado' },
  { z1: 'Morado', z2: 'Amarillo', z3: 'Azul cielo', letters: 'Morado' },
]

// ───────────────────────── Diseños ─────────────────────────

export const SHAPES = [
  { id: 'circulo', label: 'Círculo y huellitas', letter: 'A', hint: 'Un círculo con un hueso al centro para el nombre y dos huellitas.' },
  { id: 'caricatura', label: 'Caricatura', letter: 'B', hint: 'Tu mascota en caricatura, de varios colores, sentada sobre un huesito con su nombre. La dibujamos a partir de su foto.' },
  { id: 'silueta', label: 'Solo silueta', letter: 'C', hint: 'La silueta completa de tu mascota en un solo color, sobre un huesito con su nombre. La hacemos a partir de su foto.' },
] as const

/** Siluetas de pedidos anteriores: solo para poder mostrarlas con nombre en el admin. */
export const LEGACY_SHAPES = [
  { id: 'personalizada', label: 'Mi mascota (anterior)' },
  { id: 'misteriosa', label: 'Misteriosa (anterior)' },
  { id: 'navidad', label: 'Navidad (anterior)' },
  { id: 'huesito', label: 'Huesito (anterior)' },
  { id: 'normal', label: 'Normal (anterior)' },
  { id: 'mascota', label: 'Mi mascota (anterior)' },
  { id: 'redonda', label: 'Redonda (anterior)' },
  { id: 'corazon', label: 'Corazón (anterior)' },
  { id: 'hueso', label: 'Hueso (anterior)' },
  { id: 'huella', label: 'Huellita (anterior)' },
  { id: 'nube', label: 'Nube (anterior)' },
] as const

export const ALL_SHAPES: readonly { id: string; label: string }[] = [...SHAPES, ...LEGACY_SHAPES]

export const SIZES = [
  { id: 'S', label: 'Chica', mm: 30 },
  { id: 'M', label: 'Mediana', mm: 38 },
  { id: 'L', label: 'Grande', mm: 46 },
] as const

// ───────────────────────── Tipografías (gruesas, aptas para letras en relieve) ─────────────────────────

export const FONTS = [
  { id: 'clasica', label: 'Clásica', hint: 'Con remates y trazo grueso; firme y fácil de leer.' },
  { id: 'moderna', label: 'Moderna y gruesa', hint: 'Sin remates, muy gruesa; la más resistente.' },
  { id: 'redondeada', label: 'Redondeada', hint: 'Puntas suaves y redondas.' },
  { id: 'divertida', label: 'Divertida', hint: 'Gruesa y juguetona.' },
  { id: 'elegante', label: 'Elegante', hint: 'Cursiva de trazo grueso y letras unidas, para que no se separen.' },
] as const

/** Tipografías de pedidos anteriores: solo para mostrarlas con nombre en el admin. */
export const LEGACY_FONTS = [
  { id: 'fredoka', label: 'Fredoka (anterior)' },
  { id: 'baloo', label: 'Baloo (anterior)' },
  { id: 'pacifico', label: 'Pacifico (anterior)' },
  { id: 'chewy', label: 'Chewy (anterior)' },
  { id: 'nunito', label: 'Nunito (anterior)' },
] as const

export const ALL_FONTS: readonly { id: string; label: string }[] = [...FONTS, ...LEGACY_FONTS]

/** Máximo de letras del nombre en la placa (más largo no cabe con letras gruesas y resistentes). */
export const MAX_NAME_LENGTH = 14

export const SHAPE_IDS = SHAPES.map((s) => s.id) as unknown as [string, ...string[]]
export const SIZE_IDS = SIZES.map((s) => s.id) as unknown as [string, ...string[]]
export const FONT_IDS = FONTS.map((s) => s.id) as unknown as [string, ...string[]]

export const labelOf = (list: readonly { id: string; label: string }[], id?: string | null) =>
  list.find((x) => x.id === id)?.label ?? '—'
