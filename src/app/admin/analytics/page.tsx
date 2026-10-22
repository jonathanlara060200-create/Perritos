import { createClient } from '@/lib/supabase/server'
import { ORDER_STATUS } from '@/lib/labels'
import { formatMoney } from '@/lib/utils'

export const metadata = { title: 'Métricas · Admin' }

type Stats = {
  views_total: number
  views_30d: number
  nfc_30d: number
  qr_30d: number
  location_reports_30d: number
  lost_active: number
  lost_closed: number
  recovered: number
  tags_active: number
  revenue: number
  top_pets: { name: string; public_id: string; views: number }[]
  orders_by_status: Record<string, number>
}

export default async function Analytics() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('admin_stats')
  const s = (data ?? {}) as Stats
  const rate = s.lost_closed > 0 ? Math.round((s.recovered / s.lost_closed) * 100) : null
  const sourced = (s.nfc_30d ?? 0) + (s.qr_30d ?? 0)

  const cards = [
    ['Escaneos totales', s.views_total ?? 0],
    ['Escaneos (30 d)', s.views_30d ?? 0],
    ['Vía NFC (30 d)', s.nfc_30d ?? 0],
    ['Vía QR (30 d)', s.qr_30d ?? 0],
    ['Reportes de ubicación (30 d)', s.location_reports_30d ?? 0],
    ['Perfiles con placa activa', s.tags_active ?? 0],
    ['Perdidas ahora', s.lost_active ?? 0],
    ['Ventas cobradas', formatMoney(s.revenue ?? 0)],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Métricas</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l as string} className="card text-center">
            <p className="text-2xl font-extrabold">{v}</p>
            <p className="muted">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="text-xl">Recuperación</h2>
          <p className="text-3xl font-extrabold">{rate === null ? '—' : `${rate}%`}</p>
          <p className="muted">{s.recovered ?? 0} encontradas de {s.lost_closed ?? 0} casos cerrados. Se mide con el botón “¡La encontré!” del dueño.</p>
        </section>
        <section className="card space-y-2">
          <h2 className="text-xl">NFC vs QR</h2>
          {sourced === 0 ? (
            <p className="muted">Aún no hay escaneos con origen identificado.</p>
          ) : (
            <>
              <div className="flex h-5 overflow-hidden rounded-full bg-axo-100">
                <div className="bg-axo-500" style={{ width: `${Math.round(((s.nfc_30d ?? 0) / sourced) * 100)}%` }} />
              </div>
              <p className="muted">NFC {s.nfc_30d} · QR {s.qr_30d} (últimos 30 días)</p>
            </>
          )}
        </section>
        <section className="card space-y-2">
          <h2 className="text-xl">Mascotas más visitadas (30 d)</h2>
          {(s.top_pets ?? []).map((p) => (
            <p key={p.public_id} className="flex justify-between"><span>{p.name}</span><b>{p.views}</b></p>
          ))}
          {!(s.top_pets ?? []).length && <p className="muted">Sin datos todavía.</p>}
        </section>
        <section className="card space-y-2">
          <h2 className="text-xl">Pedidos por estado</h2>
          {Object.entries(s.orders_by_status ?? {}).map(([k, v]) => (
            <p key={k} className="flex justify-between"><span>{ORDER_STATUS[k] ?? k}</span><b>{v}</b></p>
          ))}
          {!Object.keys(s.orders_by_status ?? {}).length && <p className="muted">Sin pedidos todavía.</p>}
        </section>
      </div>
      <p className="muted">Los escaneos no guardan identidad ni IP de quien escanea: solo la fecha, la mascota y el origen (NFC/QR).</p>
    </div>
  )
}
