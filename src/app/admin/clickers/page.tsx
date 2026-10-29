import {
  createCustomOrder,
  deleteCustomOrder,
  markCustomPaid,
  setCustomStatus,
  togglePart,
  updateCustomOrder,
} from '@/app/actions/clickers'
import { ClickerFields, ColorDatalists } from '@/components/ClickerFields'
import { ClickerPreview, ColorDot } from '@/components/ClickerPreview'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
import {
  ACTIVE_STATUSES,
  CUSTOM_STATUS,
  CUSTOM_STATUS_STYLE,
  ITEM_TYPE,
  PARTS,
  colorKey,
  countPieces,
} from '@/lib/clickers'
import { createClient } from '@/lib/supabase/server'
import { TZ, formatMoney } from '@/lib/utils'

export const metadata = { title: 'Clickers y llaveros · Admin' }

type Row = {
  id: string
  customer_name: string
  contact: string | null
  item_type: string
  control_name: string | null
  base_color: string | null
  key_color: string | null
  letter_color: string | null
  has_nfc: boolean
  base_done: boolean
  keys_done: boolean
  letters_done: boolean
  status: string
  price: number | string
  paid_amount: number | string
  due_date: string | null
  description: string | null
  notes: string | null
  created_at: string
}

/** Siguiente paso rápido según el estado actual. */
const NEXT: Record<string, [string, string]> = {
  pending: ['in_progress', 'Empezar'],
  in_progress: ['ready', 'Marcar listo'],
  ready: ['delivered', 'Entregado'],
}

const BADGE = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold'

function formatDay(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' })
}

/** Cuenta cuántas piezas faltan por color (solo clickers que siguen en trabajo). */
function tally(rows: Row[], color: (r: Row) => string | null, pieces: (r: Row) => number, done: (r: Row) => boolean) {
  const m = new Map<string, { label: string; n: number }>()
  for (const r of rows) {
    if (r.item_type !== 'clicker' || done(r)) continue
    const n = pieces(r)
    if (n === 0) continue
    const label = color(r)?.trim() || 'Sin definir'
    const k = colorKey(label)
    const cur = m.get(k)
    if (cur) cur.n += n
    else m.set(k, { label, n })
  }
  return [...m.values()].sort((a, b) => b.n - a.n)
}

export default async function AdminClickers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.from('custom_orders').select('*').order('created_at', { ascending: false }).limit(500)
  const all = (data ?? []) as unknown as Row[]

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl">Clickers y llaveros</h1>
        <div className="card space-y-2 border-2 border-red-200 bg-red-50">
          <p className="font-extrabold text-red-700">Falta crear la tabla de pedidos en Supabase.</p>
          <p className="text-sm">
            En Supabase → SQL Editor, ejecuta el contenido de <code>supabase/migrations/20261028000001_custom_orders.sql</code> y recarga esta página.
          </p>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  const isOpen = (r: Row) => ACTIVE_STATUSES.includes(r.status)
  const open = all.filter(isOpen)
  const working = all.filter((r) => r.status === 'pending' || r.status === 'in_progress')

  // Resumen
  const toCollect = all
    .filter((r) => r.status !== 'cancelled')
    .reduce((s, r) => s + Math.max(0, Number(r.price) - Number(r.paid_amount)), 0)
  const stats: [string, string | number, string][] = [
    ['Pedidos abiertos', open.length, '📦'],
    ['Listos para entregar', all.filter((r) => r.status === 'ready').length, '✅'],
    ['Por cobrar', formatMoney(toCollect), '💰'],
  ]

  // Qué falta por hacer, por color
  const bases = tally(working, (r) => r.base_color, () => 1, (r) => r.base_done)
  const keys = tally(working, (r) => r.key_color, (r) => countPieces(r.control_name), (r) => r.keys_done)
  const letters = tally(working, (r) => r.letter_color, (r) => countPieces(r.control_name), (r) => r.letters_done)

  // Filtros
  const ver = sp.ver === 'cerrados' || sp.ver === 'todos' ? sp.ver : 'activos'
  const tipo = sp.tipo && sp.tipo in ITEM_TYPE ? sp.tipo : ''
  const q = sp.q?.trim().toLowerCase() ?? ''
  const rows = all
    .filter((r) => (ver === 'todos' ? true : ver === 'activos' ? isOpen(r) : !isOpen(r)))
    .filter((r) => (tipo ? r.item_type === tipo : true))
    .filter((r) =>
      q
        ? [r.customer_name, r.control_name, r.contact, r.description].some((t) => t?.toLowerCase().includes(q))
        : true,
    )
    .sort((a, b) => {
      if (ver === 'activos') {
        // Lo que se entrega primero arriba; sin fecha, al final.
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
      }
      return b.created_at.localeCompare(a.created_at)
    })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Clickers y llaveros</h1>
      <Flash sp={sp} />
      <ColorDatalists />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(([l, v, i]) => (
          <div key={l} className="card text-center">
            <div className="text-2xl">{i}</div>
            <p className="text-xl font-extrabold sm:text-2xl">{v}</p>
            <p className="muted">{l}</p>
          </div>
        ))}
      </div>

      <details className="card" open={rows.length === 0 && all.length === 0}>
        <summary className="cursor-pointer text-xl font-extrabold">➕ Nuevo pedido</summary>
        <form action={createCustomOrder} className="mt-4 space-y-4">
          <ClickerFields />
          <SubmitButton className="btn-primary w-full">Guardar pedido</SubmitButton>
        </form>
      </details>

      {working.some((r) => r.item_type === 'clicker') && (
        <section className="card space-y-3">
          <h2 className="text-xl">Por hacer (clickers en proceso)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Bases', bases, ''],
              ['Teclas', keys, ' pzas'],
              ['Letras', letters, ' pzas'],
            ].map(([title, items, unit]) => {
              const list = items as { label: string; n: number }[]
              return (
                <div key={title as string}>
                  <h3 className="mb-1 font-extrabold">{title as string}</h3>
                  {list.length === 0 ? (
                    <p className="muted">Todo listo ✓</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {list.map((it) => (
                        <li key={it.label} className="flex items-center justify-between gap-2">
                          <ColorDot name={it.label} label="" />
                          <b>{it.n}{unit}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <p className="muted">Se cuenta lo que aún no marcas como hecho. Una letra = una tecla.</p>
        </section>
      )}

      <form className="flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar: cliente, nombre del control…" className="input" />
        <select name="tipo" defaultValue={tipo} className="input sm:max-w-48">
          <option value="">Todos los tipos</option>
          {Object.entries(ITEM_TYPE).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <select name="ver" defaultValue={ver} className="input sm:max-w-44">
          <option value="activos">Abiertos</option>
          <option value="cerrados">Entregados / cancelados</option>
          <option value="todos">Todos</option>
        </select>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="space-y-3">
        {rows.map((o) => {
          const price = Number(o.price)
          const paid = Number(o.paid_amount)
          const owes = Math.max(0, price - paid)
          const overdue = !!o.due_date && o.due_date < today && isOpen(o)
          const next = NEXT[o.status]
          const isClicker = o.item_type === 'clicker'
          return (
            <article key={o.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold">{o.customer_name}</p>
                  <p className="muted">
                    {ITEM_TYPE[o.item_type]}
                    {o.contact ? ` · ${o.contact}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${BADGE} ${CUSTOM_STATUS_STYLE[o.status]}`}>{CUSTOM_STATUS[o.status]}</span>
                  {o.due_date && (
                    <span className={`${BADGE} ${overdue ? 'bg-red-50 text-red-700' : 'bg-axo-100 text-axo-600'}`}>
                      📅 {formatDay(o.due_date)}{overdue ? ' · atrasado' : ''}
                    </span>
                  )}
                  {o.has_nfc && <span className={`${BADGE} bg-denim-100 text-denim-600`}>NFC</span>}
                </div>
              </div>

              {isClicker && (
                <>
                  <ClickerPreview name={o.control_name} base={o.base_color} keyColor={o.key_color} letterColor={o.letter_color} />
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <ColorDot name={o.base_color} label="Base" />
                    <ColorDot name={o.key_color} label="Tecla" />
                    <ColorDot name={o.letter_color} label="Letra" />
                  </div>
                </>
              )}
              {o.description && <p className="text-sm">{o.description}</p>}
              {o.notes && <p className="muted">📝 {o.notes}</p>}

              {isClicker && isOpen(o) && (
                <div className="flex flex-wrap gap-2">
                  {PARTS.map((p) => {
                    const done = o[p.key]
                    return (
                      <form key={p.key} action={togglePart.bind(null, o.id, p.key)}>
                        <button
                          type="submit"
                          className={`min-h-10 rounded-xl border-2 px-4 text-sm font-bold transition active:scale-[.98] ${
                            done ? 'border-emerald-300 bg-mint text-emerald-900' : 'border-axo-200 bg-white text-ink hover:bg-axo-50'
                          }`}
                        >
                          {done ? '✓' : '○'} {p.label}
                        </button>
                      </form>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-axo-100 pt-3">
                <p className="text-sm">
                  <b>{formatMoney(price)}</b>
                  {price > 0 && (owes > 0 ? <span className="text-red-700"> · falta {formatMoney(owes)}</span> : <span className="text-emerald-700"> · pagado ✓</span>)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {owes > 0 && o.status !== 'cancelled' && (
                    <form action={markCustomPaid.bind(null, o.id)}>
                      <SubmitButton className="btn-outline btn-sm" pendingText="…">Marcar pagado</SubmitButton>
                    </form>
                  )}
                  {next && (
                    <form action={setCustomStatus.bind(null, o.id, next[0])}>
                      <SubmitButton className="btn-soft btn-sm" pendingText="…">{next[1]}</SubmitButton>
                    </form>
                  )}
                </div>
              </div>

              <details>
                <summary className="cursor-pointer text-sm font-bold text-axo-600">Editar pedido</summary>
                <div className="mt-3 space-y-3">
                  <form action={updateCustomOrder.bind(null, o.id)} className="space-y-4">
                    <ClickerFields v={o} withStatus />
                    <SubmitButton className="btn-primary w-full">Guardar cambios</SubmitButton>
                  </form>
                  <form action={deleteCustomOrder.bind(null, o.id)}>
                    <ConfirmButton message={`¿Borrar el pedido de ${o.customer_name}? No se puede deshacer.`} className="btn-outline btn-sm text-red-700">
                      Borrar pedido
                    </ConfirmButton>
                  </form>
                </div>
              </details>
            </article>
          )
        })}
        {rows.length === 0 && <p className="card muted text-center">No hay pedidos con ese filtro.</p>}
      </div>
    </div>
  )
}
