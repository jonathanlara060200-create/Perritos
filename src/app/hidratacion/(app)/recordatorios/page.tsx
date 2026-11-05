import { saveReminderPrefs } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { PushToggle } from "@/components/hyd/PushToggle"
import { dayKey, requireHydUser, timeLabel } from "@/lib/hyd"

export const metadata = { title: "Recordatorios" }
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const KIND: Record<string, string> = { morning: "Mañana", day: "Durante el día", workout: "Actividad física", night: "Resumen nocturno", test: "Prueba" }

export default async function Recordatorios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { supabase, user, profile } = await requireHydUser()
  const [{ data: prefs }, { data: subs }, { data: log }] = await Promise.all([
    supabase.from("hyd_reminder_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("hyd_push_subscriptions").select("endpoint").eq("user_id", user.id),
    supabase.from("hyd_notification_log").select("id, kind, body, sent_at").eq("user_id", user.id).order("sent_at", { ascending: false }).limit(8),
  ])
  const p = prefs ?? { enabled: false, morning_on: true, morning_time: "07:00", day_on: true, first_time: "10:00", every_hours: 3, workout_on: false, workout_time: "18:00", night_on: true, night_time: "21:30", days: [1, 2, 3, 4, 5, 6, 7] }
  const t = (v: string) => v.slice(0, 5)
  const tz = profile.timezone
  const configured = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Recordatorios</h1>
      <Flash sp={sp} />
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} configured={configured} subscribedEndpoints={(subs ?? []).map((s) => s.endpoint)} />

      <form action={saveReminderPrefs} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <label className="flex items-center gap-2 font-semibold text-[#0B3C5D]"><input type="checkbox" name="enabled" defaultChecked={p.enabled} /> Recibir recordatorios</label>
        <p className="-mt-2 text-xs text-slate-500">Son pocos y suaves: nunca más de 8 al día, y no insistimos si ya cumpliste tu objetivo o acabas de tomar agua.</p>

        <fieldset className="space-y-2"><legend className="label">Días de la semana</legend>
          <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => (
            <label key={d} className="cursor-pointer rounded-xl bg-sky-50 px-3 py-1.5 text-sm ring-1 ring-sky-100 has-[:checked]:bg-[#1E7FD8] has-[:checked]:text-white">
              <input type="checkbox" name={`d${i + 1}`} defaultChecked={(p.days as number[]).includes(i + 1)} className="sr-only" />{d}
            </label>))}</div>
        </fieldset>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" name="morning_on" defaultChecked={p.morning_on} /> Buenos días, a las</label><input type="time" name="morning_time" defaultValue={t(p.morning_time)} className="input w-auto" /></div>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" name="day_on" defaultChecked={p.day_on} /> Durante el día, desde las</label><input type="time" name="first_time" defaultValue={t(p.first_time)} className="input w-auto" /><span>cada</span>
            <select name="every_hours" defaultValue={p.every_hours} className="input w-auto">{[1, 2, 3, 4, 5, 6, 8].map((h) => <option key={h} value={h}>{h} {h === 1 ? "hora" : "horas"}</option>)}</select></div>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" name="workout_on" defaultChecked={p.workout_on} /> Después de entrenar, a las</label><input type="time" name="workout_time" defaultValue={t(p.workout_time)} className="input w-auto" /></div>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" name="night_on" defaultChecked={p.night_on} /> Resumen nocturno, a las</label><input type="time" name="night_time" defaultValue={t(p.night_time)} className="input w-auto" /></div>
        </div>
        <button className="w-full rounded-2xl bg-[#1E7FD8] py-3 font-bold text-white">Guardar preferencias</button>
        <p className="text-xs text-slate-500">Horarios en tu zona: {tz.replace("_", " ")}. Los recordatorios se revisan cada ~15 minutos, así que pueden llegar con un pequeño retraso.</p>
      </form>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold text-[#0B3C5D]">Últimos avisos enviados</h2>
        {!log?.length && <p className="mt-2 text-sm text-slate-500">Todavía no se ha enviado ninguno.</p>}
        <ul className="mt-2 divide-y divide-sky-50 text-sm">
          {(log ?? []).map((l) => (
            <li key={l.id} className="py-2"><span className="text-xs text-slate-500">{dayKey(l.sent_at, tz)} · {timeLabel(l.sent_at, tz)} · {KIND[l.kind] ?? l.kind}</span><p>{l.body}</p></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
