import Link from 'next/link'
import {
  createCustomOrder,
  deleteCustomOrder,
  markCustomPaid,
  setCustomStatus,
  togglePart,
  updateCustomOrder,
} from '@/app/actions/clickers'
import { ClickerFields } from '@/components/ClickerFields'
import { ClickerPreview, ColorDot } from '@/components/ClickerPreview'
import { PendingPrints } from '@/components/PendingPrints'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
import {
  ACTIVE_STATUSES,
  CUSTOM_STATUS,
  CUSTOM_STATUS_STYLE,
  ITEM_TYPE,
  PARTS,
  groupPending,
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
  // Terminado = cancelado, o entregado y pagado por completo. Entregado con saldo sigue a la vista para cobrarlo.
  const isDone = (r: Row) => r.status === 'cancelled' || (r.status === 'delivered' && Number(r.paid_amount) >= Number(r.price))
  const open = all.filter((r) => !isDone(r))
  const doneCount = all.length - open.length
  const working = all.filter((r) => r.status === 'pending' || r.status === 'in_progress')

  // Resumen de dinero (los cancelados no cuentan)
  const live = all.filter((r) => r.status !== 'cancelled')
  const collected = live.reduce((s, r) => s + Math.min(Number(r.paid_amount), Number(r.price)), 0)
  const toCollect = live.reduce((s, r) => s + Math.max(0, Number(r.price) - Number(r.paid_amount)), 0)
  const stats: [string, string | number, string][] = [
    ['Pedidos abiertos', open.length, '📦'],
    ['Listos para entregar', all.filter((r) => r.status === 'ready').length, '✅'],
    ['Cobrado', formatMoney(collected), '💵'],
    ['Por cobrar', formatMoney(toCollect), '⏳'],
  ]

  // Qué falta por hacer, por color
  const clickersInWork = working.filter((r) => r.item_type === 'clicker')
  const who = (r: Row) => (r.control_name ? `${r.control_name.toUpperCase()} (${r.customer_name})` : r.customer_name)
  const bases = groupPending(clickersInWork.filter((r) => !r.base_done).map((r) => ({ color: r.base_color, name: r.control_name, who: who(r) })))
  const keys = groupPending(clickersInWork.filter((r) => !r.keys_done).map((r) => ({ color: r.key_color, name: r.control_name, who: who(r) })))
  const letters = groupPending(clickersInWork.filter((r) => !r.letters_done).map((r) => ({ color: r.letter_color, name: r.control_name, who: who(r) })))

  // Filtros: pestañas Abiertos / Terminados / Todos. Siempre lo más reciente arriba.
  const ver = sp.ver === 'terminados' || sp.ver === 'todos' ? sp.ver : 'abiertos'
  const tipo = sp.tipo && sp.tipo in ITEM_TYPE ? sp.tipo : ''
  const q = sp.q?.trim().toLowerCase() ?? ''
  const rows = all
    .filter((r) => (ver === 'todos' ? true : ver === 'abiertos' ? !isDone(r) : isDone(r)))
    .filter((r) => (tipo ? r.item_type === tipo : true))
    .filter((r) =>
      q
        ? [r.customer_name, r.control_name, r.contact, r.description].some((t) => t?.toLowerCase().includes(q))
        : true,
    )
    .sort((a, b) => {
      // En "Todos" los terminados se van hasta abajo.
      if (ver === 'todos' && isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1
      return b.created_at.localeCompare(a.created_at)
    })

  const tabHref = (v: string) => {
    const u = new URLSearchParams()
    if (v !== 'abiertos') u.set('ver', v)
    if (sp.q) u.set('q', sp.q)
    if (tipo) u.set('tipo', tipo)
    const s = u.toString()
    return `/admin/clickers${s ? `?${s}` : ''}`
  }
  const tabs: [string, string][] = [
    ['abiertos', `Abiertos (${open.length})`],
    ['terminados', `Terminados (${doneCount})`],
    ['todos', 'Todos'],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Clickers y llaveros</h1>
      <Flash sp={sp} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {clickersInWork.length > 0 && (
        <section className="card space-y-4">
          <h2 className="text-xl">Por imprimir (clickers en proceso)</h2>
          <PendingPrints bases={bases} keys={keys} letters={letters} />
          <p className="muted">Se cuenta lo que aún no marcas como hecho (Base, Teclas, Letras) en cada pedido.</p>
        </section>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Vista de pedidos">
        {tabs.map(([v, label]) => (
          <Link
            key={v}
            href={tabHref(v)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${ver === v ? 'bg-axo-500 text-white' : 'bg-axo-100 text-axo-600 hover:bg-axo-200'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form className="flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar: cliente, nombre del control…" className="input" />
        <select name="tipo" defaultValue={tipo} className="input sm:max-w-48">
          <option value="">Todos los tipos</option>
          {Object.entries(ITEM_TYPE).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <input type="hidden" name="ver" value={ver} />
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
