export const ORDER_STATUS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  info_pending: 'Información pendiente',
  design_pending: 'Diseño pendiente',
  design_approved: 'Diseño aprobado',
  in_production: 'En producción',
  ready: 'Listo',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const TAG_STATUS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  in_production: 'En producción',
  produced: 'Producida',
  shipped: 'Enviada',
  active: 'Activa',
  lost: 'Perdida',
  deactivated: 'Desactivada',
  replaced: 'Reemplazada',
}

export const SPECIES: Record<string, string> = { dog: 'Perro', cat: 'Gato', other: 'Otra' }
export const SEX: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'No especificado' }

export const SENSITIVITY_PRESETS = [
  'Fuegos artificiales',
  'Tormentas',
  'Sonidos fuertes',
  'Personas desconocidas',
  'Otros animales',
]

export const BEHAVIOR_PRESETS = [
  'Es amigable',
  'Puede asustarse fácilmente',
  'No acercarse rápidamente',
  'Puede intentar escapar si se asusta',
  'No acercarse con otros perros',
]

export const VISIBILITY_FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: 'show_photo', label: 'Foto' },
  { key: 'show_breed', label: 'Raza' },
  { key: 'show_description', label: 'Descripción' },
  { key: 'show_allergies', label: 'Alergias' },
  { key: 'show_sensitivities', label: 'Sensibilidades' },
  { key: 'show_behavior', label: 'Comportamiento' },
  { key: 'show_special_care', label: 'Cuidados especiales' },
  { key: 'show_medications', label: 'Medicamentos' },
  { key: 'show_vet_info', label: 'Información veterinaria' },
  { key: 'show_reward', label: 'Recompensa (si activas modo perdida)' },
  { key: 'allow_location_reports', label: 'Permitir que reporten ubicación', hint: 'Quien la encuentre podrá enviarte dónde la vio.' },
]
