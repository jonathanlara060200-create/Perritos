import { releaseDevice, saveProfile } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { fmt, GOALS, requireHydUser } from "@/lib/hyd"

export const metadata = { title: "Perfil" }

const ZONES = ["America/Mexico_City", "America/Tijuana", "America/Hermosillo", "America/Mazatlan", "America/Cancun", "America/Bogota", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "America/New_York", "America/Los_Angeles", "Europe/Madrid"]

export default async function Perfil({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { supabase, user, profile } = await requireHydUser()
  const { data: devices } = await supabase.from("hyd_devices").select("id, code, label, status, claimed_at").eq("owner_id", user.id).order("claimed_at")
  const { data: p2 } = await supabase.from("hyd_profiles").select("does_sport").eq("user_id", user.id).maybeSingle()
  const isPreset = GOALS.includes(profile.daily_goal_ml)
  const zones = ZONES.includes(profile.timezone) ? ZONES : [profile.timezone, ...ZONES]
  const name = String(user.user_metadata?.full_name ?? "")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Tu perfil</h1>
      <Flash sp={sp} />
      <form action={saveProfile} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <div><label className="label" htmlFor="full_name">Nombre</label><input id="full_name" name="full_name" defaultValue={name} maxLength={120} className="input" /></div>
        <div><label className="label" htmlFor="bottle_ml">Capacidad de tu termo (ml)</label><input id="bottle_ml" name="bottle_ml" type="number" inputMode="numeric" min={100} max={5000} defaultValue={profile.bottle_ml} className="input" /></div>
        <fieldset>
          <legend className="label">Objetivo diario</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <label key={g} className="cursor-pointer rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100 has-[:checked]:bg-[#1E7FD8] has-[:checked]:text-white">
                <input type="radio" name="goal" value={g} defaultChecked={profile.daily_goal_ml === g} className="sr-only" />{fmt(g)} ml
              </label>
            ))}
            <label className="cursor-pointer rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100 has-[:checked]:bg-[#1E7FD8] has-[:checked]:text-white">
              <input type="radio" name="goal" value="custom" defaultChecked={!isPreset} className="sr-only" />Personalizado
            </label>
          </div>
          <input name="goal_custom" type="number" inputMode="numeric" min={500} max={10000} defaultValue={isPreset ? "" : profile.daily_goal_ml} placeholder="ml (si eliges personalizado)" className="input mt-2" />
          <p className="mt-1 text-xs text-slate-500">Es una meta personal, no una indicación médica. Si tienes dudas sobre cuánto beber, consulta a un profesional de la salud.</p>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="wake_time">Despierto a las</label><input id="wake_time" name="wake_time" type="time" defaultValue={profile.wake_time.slice(0, 5)} className="input" /></div>
          <div><label className="label" htmlFor="sleep_time">Duermo a las</label><input id="sleep_time" name="sleep_time" type="time" defaultValue={profile.sleep_time.slice(0, 5)} className="input" /></div>
        </div>
        <div>
          <label className="label" htmlFor="timezone">Zona horaria</label>
          <select id="timezone" name="timezone" defaultValue={profile.timezone} className="input">{zones.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}</select>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="does_sport" defaultChecked={!!p2?.does_sport} className="mt-1" />
          <span>Hago actividad física con frecuencia (solo se usa para sugerencias generales).</span>
        </label>
        <button className="w-full rounded-2xl bg-[#1E7FD8] py-3 font-bold text-white">Guardar cambios</button>
      </form>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
        <h2 className="font-bold text-[#0B3C5D]">Mis llaveros NFC</h2>
        {!devices?.length && <p className="mt-2 text-sm text-slate-500">Aún no tienes llaveros vinculados. Escanea tu llavero con el celular para activarlo.</p>}
        <ul className="mt-2 divide-y divide-sky-50">
          {(devices ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span><b>{d.label || "Llavero"}</b> <span className="text-slate-500">· {d.code}</span>{d.status !== "active" && <em className="ml-1 text-slate-500">({d.status})</em>}</span>
              <form action={releaseDevice}><input type="hidden" name="id" value={d.id} /><button className="text-red-600">Desvincular</button></form>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Puedes vincular varios llaveros a la misma cuenta.</p>
      </section>
    </div>
  )
}
