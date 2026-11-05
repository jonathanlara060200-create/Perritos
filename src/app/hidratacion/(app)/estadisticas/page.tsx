import { ACHIEVEMENTS, dayKey, fmt, requireHydUser } from "@/lib/hyd"
import { addDays, build, calendar, type DayRow } from "@/lib/hyd-stats"

export const metadata = { title: "Estadísticas" }

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const WD = ["L", "M", "M", "J", "V", "S", "D"]

export default async function Estadisticas() {
  const { supabase, user, profile } = await requireHydUser()
  const today = dayKey(new Date(), profile.timezone)
  const goal = profile.daily_goal_ml
  const [{ data }, { data: ach }] = await Promise.all([
    supabase.rpc("hyd_daily", { p_from: addDays(today, -89), p_to: today }),
    supabase.from("hyd_achievements").select("code, earned_at").eq("user_id", user.id),
  ])
  const rows: DayRow[] = ((data ?? []) as { day: string; total_ml: number | string; entries: number | string }[]).map((r) => ({ day: r.day, total_ml: Number(r.total_ml), entries: Number(r.entries) }))
  const s = build(rows, goal, today)
  const cal = calendar(rows, goal, today)
  const earned = new Set((ach ?? []).map((a) => a.code))
  const max = Math.max(goal, ...s.last7.map((d) => d.ml))
  const diff = s.weekDiff
  const wd = (k: string) => ["D", "L", "M", "M", "J", "V", "S"][new Date(k + "T12:00:00Z").getUTCDay()]
  const lvl = ["bg-sky-50", "bg-sky-200", "bg-sky-400", "bg-[#1E7FD8]"]

  const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
      <p className="text-xs text-slate-500">{label}</p><p className="text-xl font-extrabold text-[#0B3C5D]">{value}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Estadísticas</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card label="Esta semana" value={`${fmt(s.thisWeek)} ml`} />
        <Card label="Este mes" value={`${fmt(s.monthTotal)} ml`} />
        <Card label="Promedio diario" value={`${fmt(s.avg)} ml`} sub="días con registros, últimos 30" />
        <Card label="Objetivo alcanzado" value={`${s.goalDays} días`} sub="últimos 90 días" />
        <Card label="Días con registros" value={`${s.activeDays}`} sub="últimos 90 días" />
        <Card label="Racha actual" value={`${s.streak} ${s.streak === 1 ? "día" : "días"}`} sub={`Mejor racha: ${s.bestStreak}`} />
      </div>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold text-[#0B3C5D]">Últimos 7 días</h2>
        <div className="mt-3 flex h-40 items-end gap-2" role="img" aria-label="Consumo de los últimos 7 días">
          {s.last7.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-slate-500">{d.ml ? fmt(d.ml) : ""}</span>
              <div className={`w-full rounded-t-lg ${d.ml >= goal ? "bg-[#1E7FD8]" : "bg-sky-300"}`} style={{ height: `${Math.max(d.ml ? 4 : 0, (d.ml / max) * 100)}%` }} />
              <span className="text-xs text-slate-600">{wd(d.day)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Las barras más oscuras son días en que llegaste a tu objetivo ({fmt(goal)} ml).</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold text-[#0B3C5D]">Semana contra semana</h2>
        <p className="mt-1 text-sm text-slate-700">
          Esta semana: <b>{fmt(s.thisWeek)} ml</b> · Semana pasada: <b>{fmt(s.prevWeek)} ml</b>
        </p>
        <p className="text-sm text-slate-500">
          {s.prevWeek === 0 && s.thisWeek === 0 ? "Aún no hay datos para comparar." : diff === 0 ? "Vas igual que la semana pasada." : diff > 0 ? `Llevas ${fmt(diff)} ml más que la semana pasada (la semana aún no termina).` : `Llevas ${fmt(-diff)} ml menos que la semana pasada, pero todavía quedan días. Sin presión.`}
        </p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold capitalize text-[#0B3C5D]">Calendario · {MONTHS[Number(today.slice(5, 7)) - 1]}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500">
          {WD.map((w, i) => <span key={i}>{w}</span>)}
          {cal.map((c, i) => c ? (
            <div key={c.day} title={`${c.day}: ${fmt(c.ml)} ml`} className={`aspect-square rounded-lg text-[11px] leading-none flex items-center justify-center ${c.future ? "bg-transparent text-slate-300" : lvl[c.level]} ${c.level >= 2 ? "text-white" : "text-slate-600"} ${c.day === today ? "ring-2 ring-[#0B3C5D]" : ""}`}>{Number(c.day.slice(8))}</div>
          ) : <span key={`e${i}`} />)}
        </div>
        <p className="mt-2 text-xs text-slate-500">Más oscuro = más cerca de tu objetivo. Los días sin color simplemente no tienen registros.</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold text-[#0B3C5D]">Logros de constancia</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.code} className={`rounded-2xl p-3 text-sm ${earned.has(a.code) ? "bg-sky-50 ring-1 ring-sky-200" : "bg-slate-50 text-slate-400"}`}>
              <span className={`text-2xl ${earned.has(a.code) ? "" : "grayscale opacity-50"}`} aria-hidden>{a.icon}</span>
              <p className="font-semibold">{a.label}</p><p className="text-xs">{earned.has(a.code) ? "¡Conseguido!" : a.hint}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Los logros premian tu constancia, nunca beber de más.</p>
      </section>
    </div>
  )
}
