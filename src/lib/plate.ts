// Catálogo del personalizador de placa. Los ids deben coincidir con la validación de create_order() en SQL.
export const SHAPES = [
  { id: 'mascota', label: 'Mi mascota', hint: 'La diseñamos con su foto' },
  { id: 'redonda', label: 'Redonda' },
  { id: 'corazon', label: 'Corazón' },
  { id: 'hueso', label: 'Hueso' },
  { id: 'huella', label: 'Huellita' },
  { id: 'nube', label: 'Nube' },
] as const

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

export const CHARMS = [
  { id: 'none', label: 'Sin charm' },
  { id: 'corazon', label: 'Corazón' },
  { id: 'estrella', label: 'Estrella' },
  { id: 'luna', label: 'Luna' },
  { id: 'hueso', label: 'Hueso' },
  { id: 'huella', label: 'Huellita' },
  { id: 'rayo', label: 'Rayo' },
  { id: 'flor', label: 'Flor' },
] as const

export const SHAPE_IDS = SHAPES.map((s) => s.id) as unknown as [string, ...string[]]
export const SIZE_IDS = SIZES.map((s) => s.id) as unknown as [string, ...string[]]
export const FONT_IDS = FONTS.map((s) => s.id) as unknown as [string, ...string[]]
export const CHARM_IDS = CHARMS.map((s) => s.id) as unknown as [string, ...string[]]

export const labelOf = (list: readonly { id: string; label: string }[], id?: string | null) =>
  list.find((x) => x.id === id)?.label ?? '—'
