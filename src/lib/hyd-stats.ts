// Cálculos puros de estadísticas de hidratación (sin dependencias; fáciles de probar).
export type DayRow = { day: string; total_ml: number; entries: number }

const DAY = 86400000
const parse = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))
const key = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (k: string, n: number) => key(parse(k) + n * DAY)
/** Lunes de la semana (YYYY-MM-DD). */
export function weekStart(k: string) {
  const dow = new Date(parse(k)).getUTCDay() // 0 = domingo
  return addDays(k, -((dow + 6) % 7))
}

export function build(rows: DayRow[], goal: number, today: string) {
  const map = new Map(rows.map((r) => [r.day, Number(r.total_ml)]))
  const total = (k: string) => map.get(k) ?? 0
  const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i))

  const last7 = range(addDays(today, -6), 7).map((d) => ({ day: d, ml: total(d) }))
  const monthStart = today.slice(0, 8) + "01"
  const monthDays = Number(today.slice(8)) // días transcurridos del mes
  const monthTotal = range(monthStart, monthDays).reduce((s, d) => s + total(d), 0)

  const ws = weekStart(today)
  const thisWeek = range(ws, 7).reduce((s, d) => s + total(d), 0)
  const prevWeek = range(addDays(ws, -7), 7).reduce((s, d) => s + total(d), 0)

  const active = rows.filter((r) => r.total_ml > 0)
  const goalDays = active.filter((r) => r.total_ml >= goal).length

  // promedio sobre los últimos 30 días con registros (no castiga días sin usar la app)
  const l30 = range(addDays(today, -29), 30).map(total).filter((n) => n > 0)
  const avg = l30.length ? Math.round(l30.reduce((a, b) => a + b, 0) / l30.length) : 0

  // racha actual: días consecutivos con registro; si hoy aún no hay, cuenta desde ayer
  const has = (d: string) => total(d) > 0
  let cur = 0
  let d = has(today) ? today : addDays(today, -1)
  while (has(d)) { cur++; d = addDays(d, -1) }
  // mejor racha histórica
  const days = [...new Set(active.map((r) => r.day))].sort()
  let best = 0, run = 0, prev = ""
  for (const x of days) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1
    best = Math.max(best, run)
    prev = x
  }

  return { last7, monthTotal, thisWeek, prevWeek, weekDiff: thisWeek - prevWeek, goalDays, activeDays: active.length, avg, streak: cur, bestStreak: best, total }
}

/** Calendario del mes: celdas con día, mililitros y nivel de intensidad 0-3 (nunca > objetivo premia). */
export function calendar(rows: DayRow[], goal: number, today: string) {
  const map = new Map(rows.map((r) => [r.day, Number(r.total_ml)]))
  const first = today.slice(0, 8) + "01"
  const lead = (new Date(parse(first)).getUTCDay() + 6) % 7
  const dim = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0)).getUTCDate()
  const cells: ({ day: string; ml: number; level: number; future: boolean } | null)[] = Array(lead).fill(null)
  for (let i = 0; i < dim; i++) {
    const day = addDays(first, i)
    const ml = map.get(day) ?? 0
    const level = ml <= 0 ? 0 : ml >= goal ? 3 : ml >= goal * 0.5 ? 2 : 1
    cells.push({ day, ml, level, future: day > today })
  }
  return cells
}
