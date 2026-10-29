/** Costos base: se guardan en este dispositivo (localStorage), no en la base de datos. */
export type Settings = {
  filamentKg: string // $ por kg de filamento
  watts: string // consumo promedio de la impresora
  kwh: string // $ por kWh
  machineHr: string // desgaste / mantenimiento por hora de impresión
  laborHr: string // tu mano de obra por hora
  waste: string // % extra de filamento por soportes, purgas y fallas
  clicker: string // $ por clicker
  nfc: string // $ por chip NFC
  packaging: string // $ de empaque por pieza
  minCharge: string // cobro mínimo por pieza
}

/** Valores de arranque aproximados: hay que ajustarlos a lo que realmente cuesta. */
export const DEFAULTS: Settings = {
  filamentKg: '350',
  watts: '120',
  kwh: '2.5',
  machineHr: '6',
  laborHr: '60',
  waste: '10',
  clicker: '15',
  nfc: '12',
  packaging: '5',
  minCharge: '50',
}

export type Job = {
  grams: string
  hours: string
  minutes: string
  clickers: string
  nfcs: string
  laborMin: string
  extras: string
  pieces: string
  margin: string
}

export const JOB0: Job = {
  grams: '',
  hours: '',
  minutes: '',
  clickers: '0',
  nfcs: '0',
  laborMin: '15',
  extras: '0',
  pieces: '1',
  margin: '100',
}

/** Referencias comunes para fijar precio: múltiplos del costo. */
export const STANDARDS: [number, string, string][] = [
  [1.5, 'Mínimo / mayoreo', 'Para pedidos grandes o amigos'],
  [2, 'Estándar', 'Piezas simples sin personalizar'],
  [2.5, 'Personalizado', 'Con nombre, colores o acabado especial'],
  [3, 'Premium', 'Diseño propio o entrega urgente'],
]

/** Texto → número positivo (acepta coma decimal). Vacío o inválido = 0. */
export const num = (s: string) => {
  const n = Number(String(s).replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Redondea hacia arriba al siguiente múltiplo de 5. */
export const ceil5 = (n: number) => Math.ceil(n / 5 - 1e-9) * 5

export function calculate(s: Settings, job: Job) {
  const pieces = Math.max(1, Math.round(num(job.pieces)) || 1)
  const hours = num(job.hours) + num(job.minutes) / 60
  const lines: [string, number][] = [
    ['Filamento', (num(job.grams) / 1000) * num(s.filamentKg) * (1 + num(s.waste) / 100)],
    ['Electricidad', (num(s.watts) / 1000) * hours * num(s.kwh)],
    ['Desgaste de máquina', hours * num(s.machineHr)],
    ['Mano de obra', (num(job.laborMin) / 60) * num(s.laborHr)],
    ['Clickers', Math.round(num(job.clickers)) * num(s.clicker)],
    ['NFC', Math.round(num(job.nfcs)) * num(s.nfc)],
    ['Empaque', num(s.packaging) * pieces],
    ['Otros costos', num(job.extras)],
  ]
  const cost = lines.reduce((t, [, v]) => t + v, 0)
  // Sin filamento ni tiempo capturados todavía no hay nada que cotizar (el armado y el empaque ya traen valores).
  const ready = num(job.grams) > 0 || hours > 0
  const costPer = cost / pieces
  const priceFor = (k: number) => Math.max(num(s.minCharge), ceil5(costPer * k))
  const k = 1 + num(job.margin) / 100
  const pricePer = ready ? priceFor(k) : 0
  const total = pricePer * pieces
  const profit = total - cost
  return {
    ready,
    pieces,
    hours,
    lines,
    cost,
    costPer,
    pricePer,
    total,
    profit,
    realMargin: total > 0 ? profit / total : 0,
    perHour: hours > 0 ? profit / hours : null,
    standards: STANDARDS.map(([mult, name, note]) => ({ mult, name, note, price: ready ? priceFor(mult) : 0 })),
  }
}
