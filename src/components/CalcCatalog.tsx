'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCalcProduct, saveCalcProduct } from '@/app/actions/calc'
import { FILAMENTS, type CalcProduct, type Job } from '@/lib/print-pricing'

const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const timeLabel = (j: Job) => {
  const h = Number(j.hours) || 0
  const m = Number(j.minutes) || 0
  return h || m ? `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}` : null
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex gap-1">
      {colors.map((c) => (
        <span
          key={c}
          title={c}
          className="inline-block h-4 w-4 rounded-full ring-1 ring-ink/20"
          style={{ background: FILAMENTS.find((f) => f.name === c)?.hex }}
        />
      ))}
    </span>
  )
}

/** Lista del catálogo compartido: buscar, cargar en la calculadora y (admin) borrar. */
export function CalcCatalogList({
  products,
  canDelete,
  editingId,
  onLoad,
  priceNow,
}: {
  products: CalcProduct[]
  canDelete: boolean
  editingId: string | null
  onLoad: (p: CalcProduct) => void
  priceNow: (p: CalcProduct) => number
}) {
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  const list = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">📦 Productos guardados</h2>
        {products.length > 4 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="input max-w-xs" />
        )}
      </div>
      {products.length === 0 ? (
        <p className="muted">Todavía no hay productos. Calcula uno abajo y dale “Guardar como producto”.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const now = priceNow(p)
            const t = timeLabel(p.job)
            return (
              <div key={p.id} className={`flex gap-3 rounded-2xl bg-white p-3 ring-1 ${editingId === p.id ? 'ring-2 ring-axo-600' : 'ring-axo-100'}`}>
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-axo-50 text-2xl">🧩</div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-extrabold">{p.name}</p>
                  <p className="text-sm">
                    {p.final_price ? <b className="text-axo-600">{money(p.final_price)}</b> : <span className="muted">Sin precio final</span>}
                    {now > 0 && <span className="muted"> · sugerido hoy {money(now)}</span>}
                  </p>
                  <p className="muted text-xs">
                    {[p.job.grams && `${p.job.grams} g`, t, p.wholesale].filter(Boolean).join(' · ')}
                  </p>
                  {p.colors.length > 0 && <Swatches colors={p.colors} />}
                  <div className="flex gap-1 pt-1">
                    <button type="button" className="btn-soft btn-sm" onClick={() => onLoad(p)}>
                      {editingId === p.id ? 'Cargado' : 'Usar / editar'}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`¿Borrar "${p.name}"?`)) return
                          start(async () => {
                            await deleteCalcProduct(p.id)
                            router.refresh()
                          })
                        }}
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Formulario para guardar lo que está en la calculadora como ficha del catálogo. */
export function CalcSaveForm({
  job,
  suggested,
  editing,
  onSaved,
  onNew,
}: {
  job: Job
  suggested: number
  editing: CalcProduct | null
  onSaved: (id: string) => void
  onNew: () => void
}) {
  const [colors, setColors] = useState<string[]>(editing?.colors ?? [])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const toggle = (c: string) =>
    setColors((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length >= 4 ? cur : [...cur, c]))

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        if (editing) fd.set('id', editing.id)
        fd.set('job', JSON.stringify(job))
        fd.set('colors', JSON.stringify(colors))
        fd.set('suggested_price', String(suggested || ''))
        setMsg(null)
        start(async () => {
          const r = await saveCalcProduct(fd)
          if (r.ok) {
            setMsg({ ok: true, text: editing ? 'Producto actualizado.' : 'Producto guardado. Ya aparece en la lista.' })
            const photo = form.elements.namedItem('photo') as HTMLInputElement | null
            if (photo) photo.value = ''
            if (!editing) {
              form.reset()
              setColors([])
            } else onSaved(r.id)
            router.refresh()
          } else setMsg({ ok: false, text: r.error })
        })
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">{editing ? `✏️ Editando: ${editing.name}` : '💾 Guardar como producto'}</h2>
        {editing && (
          <button type="button" className="btn-outline btn-sm" onClick={onNew}>
            + Nuevo producto
          </button>
        )}
      </div>
      <p className="muted">Se guarda todo lo de “Este trabajo” (gramos, tiempo, clickers, NFC, armado, piezas, ganancia) y lo compartes con el equipo.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nombre del producto</label>
          <input name="name" required maxLength={120} defaultValue={editing?.name ?? ''} placeholder="Ej. Tótem mini con QR + NFC" className="input" />
        </div>
        <div>
          <label className="label">Precio final que cobras ($)</label>
          <input
            name="final_price"
            inputMode="decimal"
            defaultValue={editing?.final_price ?? ''}
            placeholder={suggested ? `Sugerido: ${Math.round(suggested)}` : 'Ej. 250'}
            className="input"
          />
        </div>
        <div>
          <label className="label">Precio de mayoreo / promo</label>
          <input name="wholesale" maxLength={120} defaultValue={editing?.wholesale ?? ''} placeholder="Ej. 3 x $100" className="input" />
        </div>
      </div>

      <div>
        <label className="label">
          Colores / filamentos <span className="muted">(máx. 4 · {colors.length}/4)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {FILAMENTS.map((f) => {
            const on = colors.includes(f.name)
            return (
              <button
                key={f.name}
                type="button"
                onClick={() => toggle(f.name)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 ${on ? 'bg-axo-100 ring-axo-600' : 'bg-white ring-axo-100'} ${!on && colors.length >= 4 ? 'opacity-40' : ''}`}
              >
                <span className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-ink/20" style={{ background: f.hex }} />
                {f.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={editing?.notes ?? ''}
          placeholder="Ej. imprimir boca abajo, entrega en 2-3 días"
          className="input"
        />
      </div>

      <div>
        <label className="label">Foto {editing?.photo_url && <span className="muted">(sube otra para reemplazarla)</span>}</label>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
        <p className="muted mt-1">JPG, PNG o WebP, máximo 5 MB.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar producto'}
        </button>
        {msg && (
          <p role="status" className={`text-sm font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  )
}
