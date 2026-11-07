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

/** Combinaciones sugeridas (placa + letras), solo con los 4 filamentos y con buen contraste. */
export const SUGGESTED_COMBOS: readonly { plate: string; letters: string }[] = [
  { plate: 'Rosa bajito', letters: 'Morado' },
  { plate: 'Azul cielo', letters: 'Morado' },
  { plate: 'Amarillo', letters: 'Morado' },
  { plate: 'Morado', letters: 'Amarillo' },
]

// ───────────────────────── Diseños ─────────────────────────

export const SHAPES = [
  { id: 'personalizada', label: 'Mi mascota', letter: 'A', hint: 'La silueta de tu mascota: la diseñamos a la medida a partir de su foto.' },
  { id: 'misteriosa', label: 'Misteriosa', letter: 'B', hint: 'Una silueta con signo de interrogación, para adivinar quién es. En la vista previa se ve negra; tu placa se fabrica en el filamento que elijas.' },
  { id: 'navidad', label: 'Navidad', letter: 'C', hint: 'Edición navideña: tu mascota con gorrito de Santa Claus.' },
  { id: 'huesito', label: 'Huesito', letter: 'D', hint: 'Tu mascota con un huesito en la boca.' },
] as const

/** Siluetas de pedidos anteriores: solo para poder mostrarlas con nombre en el admin. */
export const LEGACY_SHAPES = [
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
