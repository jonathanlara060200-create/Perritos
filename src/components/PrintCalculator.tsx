'use client'

import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { DEFAULTS, JOB0, calculate, num, type Job, type Settings } from '@/lib/print-pricing'

const STORAGE_KEY = 'toeva-calc-3d-v1'

const money = (n: number, dec = 2) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      {hint && <p className="muted mt-1">{hint}</p>}
    </div>
  )
}

export function PrintCalculator() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [job, setJob] = useState<Job>(JOB0)
  const [loaded, setLoaded] = useState(false)

  // Cargar costos guardados (si el navegador lo permite).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { s?: Partial<Settings>; margin?: string }
        if (saved.s) setS((cur) => ({ ...cur, ...saved.s }))
        if (saved.margin) setJob((cur) => ({ ...cur, margin: saved.margin as string }))
      }
    } catch {
      /* sin almacenamiento: se usan los valores de arranque */
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ s, margin: job.margin }))
    } catch {
      /* ignorar */
    }
  }, [s, job.margin, loaded])

  const setSet = (k: keyof Settings) => (v: string) => setS((cur) => ({ ...cur, [k]: v }))
  const setJ = (k: keyof Job) => (v: string) => setJob((cur) => ({ ...cur, [k]: v }))

  const r = useMemo(() => calculate(s, job), [s, job])

  const hasData = r.ready
  const clickersQty = Math.round(num(job.clickers))
  const nfcQty = Math.round(num(job.nfcs))
  const quote =
    `Cotización 3D\n` +
    (r.pieces > 1 ? `Piezas: ${r.pieces}\nPrecio por pieza: ${money(r.pricePer, 0)}\n` : '') +
    `Total: ${money(r.total, 0)}` +
    (clickersQty || nfcQty
      ? `\nIncluye:${clickersQty ? ` ${clickersQty} clicker${clickersQty > 1 ? 's' : ''}` : ''}${nfcQty ? ` ${nfcQty} NFC` : ''}`
      : '')

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <section className="card space-y-4">
          <h2 className="text-xl">Este trabajo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Filamento usado (g)" value={job.grams} onChange={setJ('grams')} placeholder="Ej. 35" hint="Lo que te dice el slicer." />
            <div>
              <label className="label">Tiempo de impresión</label>
              <div className="flex items-center gap-2">
                <input inputMode="numeric" value={job.hours} onChange={(e) => setJ('hours')(e.target.value)} placeholder="h" aria-label="Horas" className="input" />
                <span className="font-bold">h</span>
                <input inputMode="numeric" value={job.minutes} onChange={(e) => setJ('minutes')(e.target.value)} placeholder="min" aria-label="Minutos" className="input" />
                <span className="font-bold">min</span>
              </div>
            </div>
            <Field label="Clickers (cuántos)" value={job.clickers} onChange={setJ('clickers')} />
            <Field label="NFC (cuántos)" value={job.nfcs} onChange={setJ('nfcs')} />
            <Field label="Armado / acabado (min)" value={job.laborMin} onChange={setJ('laborMin')} hint="Limpiar, ensamblar, pintar, empacar." />
            <Field label="Otros costos (MXN)" value={job.extras} onChange={setJ('extras')} hint="Pintura, llavero, argolla…" />
            <Field label="Piezas en este trabajo" value={job.pieces} onChange={setJ('pieces')} hint="Todo lo de arriba es del trabajo completo; abajo verás el precio por pieza." />
            <Field label="Ganancia sobre el costo (%)" value={job.margin} onChange={setJ('margin')} hint="100% = cobras el doble del costo." />
          </div>
        </section>

        <details className="card">
          <summary className="cursor-pointer text-xl font-extrabold">⚙️ Mis costos base</summary>
          <p className="muted mt-2">Los valores de arranque son aproximados: cámbialos por los tuyos. Se guardan en este dispositivo.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Filamento ($ por kg)" value={s.filamentKg} onChange={setSet('filamentKg')} />
            <Field label="Merma / fallas (% extra de filamento)" value={s.waste} onChange={setSet('waste')} hint="Soportes, purga, impresiones fallidas." />
            <Field label="Consumo de la impresora (watts)" value={s.watts} onChange={setSet('watts')} hint="Promedio durante la impresión." />
            <Field label="Luz ($ por kWh)" value={s.kwh} onChange={setSet('kwh')} hint="Míralo en tu recibo de CFE." />
            <Field label="Desgaste de máquina ($ por hora)" value={s.machineHr} onChange={setSet('machineHr')} hint="Boquillas, cama, mantenimiento." />
            <Field label="Tu mano de obra ($ por hora)" value={s.laborHr} onChange={setSet('laborHr')} />
            <Field label="Clicker ($ c/u)" value={s.clicker} onChange={setSet('clicker')} />
            <Field label="NFC ($ c/u)" value={s.nfc} onChange={setSet('nfc')} />
            <Field label="Empaque ($ por pieza)" value={s.packaging} onChange={setSet('packaging')} />
            <Field label="Cobro mínimo por pieza ($)" value={s.minCharge} onChange={setSet('minCharge')} />
          </div>
          <button type="button" className="btn-outline btn-sm mt-3" onClick={() => setS(DEFAULTS)}>
            Restablecer valores de arranque
          </button>
        </details>
      </div>

      <div className="space-y-5 lg:sticky lg:top-32 lg:self-start">
        <section className="card space-y-4">
          <h2 className="text-xl">Precio sugerido</h2>
          {!hasData ? (
            <p className="muted">Escribe el filamento y el tiempo de impresión para ver cuánto cobrar.</p>
          ) : (
            <>
              <div className="rounded-3xl bg-axo-50 p-4 text-center">
                <p className="text-4xl font-extrabold text-axo-600">{money(r.pricePer, 0)}</p>
                <p className="muted">{r.pieces > 1 ? `por pieza · total ${money(r.total, 0)}` : 'precio al cliente'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white p-2 ring-1 ring-axo-100">
                  <p className="font-extrabold">{money(r.cost, 0)}</p>
                  <p className="muted">Te cuesta</p>
                </div>
                <div className="rounded-2xl bg-white p-2 ring-1 ring-axo-100">
                  <p className="font-extrabold">{money(r.profit, 0)}</p>
                  <p className="muted">Ganas ({Math.round(r.realMargin * 100)}%)</p>
                </div>
                <div className="rounded-2xl bg-white p-2 ring-1 ring-axo-100">
                  <p className="font-extrabold">{r.perHour === null ? '—' : money(r.perHour, 0)}</p>
                  <p className="muted">Ganancia / hora</p>
                </div>
              </div>

              <div>
                <h3 className="mb-1 font-extrabold">En qué se va el costo</h3>
                <ul className="space-y-1 text-sm">
                  {r.lines
                    .filter(([, v]) => v > 0)
                    .map(([label, v]) => (
                      <li key={label} className="flex items-center justify-between gap-2">
                        <span>{label}</span>
                        <span>
                          <b>{money(v)}</b> <span className="text-ink/50">· {Math.round((v / r.cost) * 100)}%</span>
                        </span>
                      </li>
                    ))}
                  <li className="flex items-center justify-between gap-2 border-t border-axo-100 pt-1 font-extrabold">
                    <span>Costo total{r.pieces > 1 ? ` (${money(r.costPer)} por pieza)` : ''}</span>
                    <span>{money(r.cost)}</span>
                  </li>
                </ul>
              </div>

              <CopyButton text={quote} label="Copiar cotización para el cliente" />
            </>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl">Referencias de precio</h2>
          <p className="muted">Se usa mucho cobrar entre 2 y 3 veces el costo; ajústalo a tu mercado. Precio por pieza, redondeado a $5.</p>
          <div className="space-y-2">
            {r.standards.map((st) => (
              <div key={st.mult} className="flex items-center justify-between gap-2 rounded-2xl bg-axo-50 p-3">
                <div>
                  <p className="font-extrabold">{st.name} <span className="muted">(×{st.mult})</span></p>
                  <p className="muted">{st.note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <b>{hasData ? money(st.price, 0) : '—'}</b>
                  <button type="button" className="btn-soft btn-sm" onClick={() => setJ('margin')(String((st.mult - 1) * 100))}>
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
