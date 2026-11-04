// Catálogo del personalizador de placa. Los ids deben coincidir con la validación de create_order() en SQL.
export const SHAPES = [
  {
    id: 'personalizada',
    label: 'Personalizada (?)',
    hint: 'Perrito genérico con signo de interrogación: la diseñamos a la medida de tu mascota.',
  },
  { id: 'navidad', label: 'Navidad', hint: 'Edición especial de Navidad: perrito con gorro navideño.' },
  { id: 'normal', label: 'Normal', hint: 'El perrito de siempre, sin gorro.' },
] as const

/** Siluetas de pedidos anteriores: solo para poder mostrarlas con nombre en el admin. */
export const LEGACY_SHAPES = [
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

export const FONTS = [
  { id: 'fredoka', label: 'Fredoka' },
  { id: 'baloo', label: 'Baloo' },
  { id: 'pacifico', label: 'Pacifico' },
  { id: 'chewy', label: 'Chewy' },
  { id: 'nunito', label: 'Nunito' },
] as const

export const SHAPE_IDS = SHAPES.map((s) => s.id) as unknown as [string, ...string[]]
export const SIZE_IDS = SIZES.map((s) => s.id) as unknown as [string, ...string[]]
export const FONT_IDS = FONTS.map((s) => s.id) as unknown as [string, ...string[]]

export const labelOf = (list: readonly { id: string; label: string }[], id?: string | null) =>
  list.find((x) => x.id === id)?.label ?? '—'
