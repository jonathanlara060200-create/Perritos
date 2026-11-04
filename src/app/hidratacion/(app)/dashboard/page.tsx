import { QuickLog } from "@/components/hyd/QuickLog"
import { Ring } from "@/components/hyd/Ring"
import { dayKey, fmt, motivation, requireHydUser, timeLabel, type HydLog } from "@/lib/hyd"

export const metadata = { title: "Mi panel" }

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { supabase, profile } = await requireHydUser()
  const tz = profile.timezone

  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  const { data } = await supabase.from("hyd_logs").select("id, amount_ml, consumed_at, source").gte("consumed_at", since).order("consumed_at", { ascending: false })
  const today = dayKey(new Date(), tz)
  const logs = ((data ?? []) as HydLog[]).filter((l) => dayKey(l.consumed_at, tz) === today)

  const total = logs.reduce((s, l) => s + l.amount_ml, 0)
  const goal = profile.daily_goal_ml
  const pct = Math.round((total / goal) * 100)
  const remaining = Math.max(0, goal - total)
  const last = logs[0]
  const deviceCode = sp.nfc ? String(sp.nfc).toUpperCase().slice(0, 40) : undefined

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <Ring pct={pct} total={total} goal={goal} />
        <p className="mt-3 text-center text-slate-600">{motivation(pct, logs.length)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-sky-50 p-3"><dt className="text-xs text-slate-500">Falta</dt><dd className="font-bold text-[#0B3C5D]">{fmt(remaining)} ml</dd></div>
          <div className="rounded-2xl bg-sky-50 p-3"><dt className="text-xs text-slate-500">Registros</dt><dd className="font-bold text-[#0B3C5D]">{logs.length}</dd></div>
          <div className="rounded-2xl bg-sky-50 p-3"><dt className="text-xs text-slate-500">Termo</dt><dd className="font-bold text-[#0B3C5D]">{fmt(profile.bottle_ml)} ml</dd></div>
        </dl>
        {last && <p className="mt-3 text-center text-sm text-slate-500">Último registro: {fmt(last.amount_ml)} ml a las {timeLabel(last.consumed_at, tz)}</p>}
      </section>

      <QuickLog bottleMl={profile.bottle_ml} deviceCode={deviceCode} />

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <h2 className="text-lg font-bold text-[#0B3C5D]">Actividad de hoy</h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-slate-500">Aún no hay registros hoy.</p>
        ) : (
          <ul className="mt-2 divide-y divide-sky-50">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between py-2"><span>{timeLabel(l.consumed_at, tz)}</span><b>{fmt(l.amount_ml)} ml</b></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
