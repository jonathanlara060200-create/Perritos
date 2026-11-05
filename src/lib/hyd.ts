import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type HydProfile = {
  user_id: string
  bottle_ml: number
  daily_goal_ml: number
  wake_time: string
  sleep_time: string
  timezone: string
}
export type HydLog = { id: string; amount_ml: number; consumed_at: string; source: string }

export const QUICK_ML = [100, 150, 250, 350, 500, 750]
export const GOALS = [1500, 2000, 2500, 3000]

export const ACHIEVEMENTS: { code: string; label: string; icon: string; hint: string }[] = [
  { code: "first_log", label: "Primer registro", icon: "🌱", hint: "Registra tu primera toma." },
  { code: "goal_reached", label: "Objetivo del día", icon: "🎯", hint: "Llega a tu objetivo diario." },
  { code: "streak_3", label: "3 días seguidos", icon: "🔥", hint: "Registra 3 días consecutivos." },
  { code: "streak_7", label: "7 días de constancia", icon: "🏅", hint: "Registra 7 días consecutivos." },
  { code: "first_month", label: "Primer mes", icon: "🏆", hint: "Cumple un mes usando la plataforma." },
]

export const fmt = (n: number) => new Intl.NumberFormat("es-MX").format(n)

/** Fecha local (YYYY-MM-DD) de un instante en la zona horaria del usuario. */
export function dayKey(d: Date | string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d))
}
export function timeLabel(d: string, tz: string) {
  return new Intl.DateTimeFormat("es-MX", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(d))
}
export function dayLabel(key: string, tz: string) {
  const today = dayKey(new Date(), tz)
  const yesterday = dayKey(new Date(Date.now() - 24 * 3600 * 1000), tz)
  if (key === today) return "Hoy"
  if (key === yesterday) return "Ayer"
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(key + "T12:00:00Z"))
}

/** Mensajes motivacionales. Nunca empujan a beber de más. */
export function motivation(pct: number, entries: number) {
  if (entries === 0) return "Un vaso de agua es un buen comienzo. Registra tu primera toma cuando quieras."
  if (pct < 25) return "Buen inicio. Ve a tu ritmo, poco a poco."
  if (pct < 50) return "Vas avanzando. Mantén tu agua cerca."
  if (pct < 75) return "Ya pasaste la mitad. Sigue así."
  if (pct < 100) return "Casi llegas a tu objetivo."
  return "¡Objetivo cumplido! No necesitas beber más por hoy, salvo que tengas sed o hayas hecho ejercicio."
}

const clamp = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** Exige sesión y asegura que exista el perfil de hidratación (aplica lo elegido al registrarse). */
export async function requireHydUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/hidratacion/login")

  const read = () => supabase.from("hyd_profiles").select("*").eq("user_id", user.id).maybeSingle()
  let { data: profile } = await read()
  if (!profile) {
    await supabase.rpc("hyd_ensure_profile")
    const meta = (user.user_metadata?.hyd ?? {}) as Record<string, unknown>
    const patch: Record<string, number | string> = {}
    const hhmm = (v: unknown) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
    if (hhmm(meta.wake_time)) patch.wake_time = hhmm(meta.wake_time)!
    if (hhmm(meta.sleep_time)) patch.sleep_time = hhmm(meta.sleep_time)!
    if (meta.reminders === true) await supabase.from("hyd_reminder_prefs").update({ enabled: true }).eq("user_id", user.id)
    const bottle = clamp(meta.bottle_ml, 100, 5000)
    const goal = clamp(meta.daily_goal_ml, 500, 10000)
    if (bottle) patch.bottle_ml = bottle
    if (goal) patch.daily_goal_ml = goal
    if (Object.keys(patch).length) await supabase.from("hyd_profiles").update(patch).eq("user_id", user.id)
    ;({ data: profile } = await read())
  }
  if (!profile) redirect("/hidratacion/login")
  return { supabase, user, profile: profile as HydProfile }
}
