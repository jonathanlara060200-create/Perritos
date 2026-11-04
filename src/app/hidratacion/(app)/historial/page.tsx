import { deleteLog, updateLog } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { dayKey, dayLabel, fmt, requireHydUser, timeLabel, type HydLog } from "@/lib/hyd"

export const metadata = { title: "Historial" }

export default async function Historial({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { supabase, profile } = await requireHydUser()
  const tz = profile.timezone
  const { data } = await supabase.from("hyd_logs").select("id, amount_ml, consumed_at, source").order("consumed_at", { ascending: false }).limit(300)

  const groups = new Map<string, HydLog[]>()
  for (const l of (data ?? []) as HydLog[]) {
    const k = dayKey(l.consumed_at, tz)
    groups.set(k, [...(groups.get(k) ?? []), l])
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Historial</h1>
      <Flash sp={sp} />
      {groups.size === 0 && <p className="text-slate-500">Todavía no tienes registros.</p>}
      {[...groups.entries()].map(([k, items]) => (
        <section key={k} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
          <h2 className="flex justify-between font-bold capitalize text-[#0B3C5D]">
            <span>{dayLabel(k, tz)}</span><span>{fmt(items.reduce((s, l) => s + l.amount_ml, 0))} ml</span>
          </h2>
          <ul className="mt-2 divide-y divide-sky-50">
            {items.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-20 text-sm text-slate-500">{timeLabel(l.consumed_at, tz)}</span>
                <form action={updateLog} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <input name="amount_ml" type="number" inputMode="numeric" min={1} max={10000} defaultValue={l.amount_ml} aria-label="Cantidad en ml" className="w-24 rounded-lg border border-sky-200 px-2 py-1" />
                  <span className="text-sm">ml</span>
                  <button className="rounded-lg bg-sky-50 px-3 py-1 text-sm font-semibold text-[#0B3C5D]">Guardar</button>
                </form>
                <form action={deleteLog}><input type="hidden" name="id" value={l.id} /><button className="rounded-lg px-3 py-1 text-sm text-red-600">Eliminar</button></form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
