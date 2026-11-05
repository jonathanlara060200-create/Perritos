"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { go } from "@/lib/flash"
import { safeNext, siteUrl, str } from "@/lib/utils"
import { pushConfig } from "@/lib/hyd-push-config"
import { sendPush } from "@/lib/webpush"

const emailSchema = z.string().trim().email("Escribe un correo válido.").max(160)
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72)
const intIn = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

const timeIn = (v: FormDataEntryValue | null) => {
  const t = typeof v === "string" ? v.trim() : ""
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null
}
const validTz = (tz: string) => {
  try { new Intl.DateTimeFormat("es-MX", { timeZone: tz }); return true } catch { return false }
}

/** Solo se permite volver a páginas de hidratación (evita redirigir al sitio de mascotas u otro lado). */
function hydNext(v: FormDataEntryValue | null) {
  const n = safeNext(v, "/hidratacion/dashboard")
  return n === "/hidratacion" || n.startsWith("/hidratacion/") ? n : "/hidratacion/dashboard"
}

/* ---------- Cuenta ---------- */

export async function hydSignUp(fd: FormData) {
  const next = hydNext(fd.get("next"))
  const email = emailSchema.safeParse(fd.get("email"))
  const password = passwordSchema.safeParse(fd.get("password"))
  const fullName = str(fd.get("full_name"))
  if (!fullName) go("/hidratacion/registro", "error", "Escribe tu nombre.")
  if (!email.success) go("/hidratacion/registro", "error", email.error.issues[0].message)
  if (!password.success) go("/hidratacion/registro", "error", password.error.issues[0].message)

  const bottle = intIn(fd.get("bottle_ml"), 100, 5000) ?? 950
  const goalRaw = fd.get("goal") === "custom" ? fd.get("goal_custom") : fd.get("goal")
  const goal = intIn(goalRaw, 500, 10000) ?? 2000

  const wake = timeIn(fd.get("wake_time")) ?? "07:00"
  const sleep = timeIn(fd.get("sleep_time")) ?? "23:00"
  const reminders = fd.get("reminders") === "on"

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      data: { full_name: fullName.slice(0, 120), hyd: { bottle_ml: bottle, daily_goal_ml: goal, wake_time: wake, sleep_time: sleep, reminders } },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) go("/hidratacion/registro", "error", "No pudimos crear tu cuenta. ¿Ya tienes una con este correo?")
  if (data.session) redirect(next)
  go("/hidratacion/login", "ok", "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.")
}

export async function hydSignIn(fd: FormData) {
  const next = hydNext(fd.get("next"))
  const email = emailSchema.safeParse(fd.get("email"))
  const password = String(fd.get("password") ?? "")
  if (!email.success || !password) go("/hidratacion/login", "error", "Escribe tu correo y contraseña.")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password })
  if (error) go(`/hidratacion/login?next=${encodeURIComponent(next)}`, "error", "Correo o contraseña incorrectos.")
  redirect(next)
}

export async function hydSignOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/hidratacion")
}

/* ---------- Registros de agua ---------- */

export type LogResult =
  | { ok: true; total: number; achievements: string[] }
  | { ok: false; error: string }

/** Se llama desde el botón de registro rápido. Nunca limita la cantidad a la capacidad del termo. */
export async function logWaterAction(
  amount: number,
  source: "quick" | "bottle" | "manual" | "nfc" = "manual",
  deviceCode?: string,
): Promise<LogResult> {
  const ml = Math.round(Number(amount))
  if (!Number.isFinite(ml) || ml < 1 || ml > 10000) return { ok: false, error: "Escribe una cantidad entre 1 y 10,000 ml." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("hyd_log_water", {
    p_amount: ml,
    p_source: source,
    p_device_code: deviceCode ?? null,
  })
  if (error) return { ok: false, error: "No pudimos guardar el registro. Intenta de nuevo." }
  revalidatePath("/hidratacion", "layout")
  const r = data as { today_total_ml: number; new_achievements: string[] }
  return { ok: true, total: r.today_total_ml, achievements: r.new_achievements ?? [] }
}

export async function updateLog(fd: FormData) {
  const id = z.string().uuid().safeParse(fd.get("id"))
  const ml = intIn(fd.get("amount_ml"), 1, 10000)
  if (!id.success || !ml) go("/hidratacion/historial", "error", "Cantidad no válida (1 a 10,000 ml).")
  const supabase = await createClient()
  const { error } = await supabase.from("hyd_logs").update({ amount_ml: ml }).eq("id", id.data)
  if (error) go("/hidratacion/historial", "error", "No pudimos actualizar el registro.")
  revalidatePath("/hidratacion", "layout")
  go("/hidratacion/historial", "ok", "Registro actualizado.")
}

export async function deleteLog(fd: FormData) {
  const id = z.string().uuid().safeParse(fd.get("id"))
  if (!id.success) go("/hidratacion/historial", "error", "Registro no válido.")
  const supabase = await createClient()
  const { error } = await supabase.from("hyd_logs").delete().eq("id", id.data)
  if (error) go("/hidratacion/historial", "error", "No pudimos eliminar el registro.")
  revalidatePath("/hidratacion", "layout")
  go("/hidratacion/historial", "ok", "Registro eliminado.")
}

/* ---------- Llavero NFC ---------- */

export async function claimDevice(fd: FormData) {
  const code = str(fd.get("code"))
  const claim = str(fd.get("claim_code"))
  const back = `/hidratacion/nfc/${encodeURIComponent(code ?? "")}`
  if (!code || !claim) go(back, "error", "Escribe el código de activación.")
  const supabase = await createClient()
  const { data } = await supabase.rpc("hyd_claim_device", { p_code: code, p_claim_code: claim })
  const msg: Record<string, string> = {
    invalid_code: "Ese código de activación no es correcto.",
    device_locked: "Demasiados intentos. Escríbenos para ayudarte.",
    device_not_claimable: "Este llavero ya fue activado.",
    invalid_device: "No encontramos este llavero.",
    not_authenticated: "Inicia sesión para continuar.",
  }
  if (data !== "ok") go(back, "error", msg[String(data)] ?? "No pudimos activar el llavero.")
  redirect(`/hidratacion/dashboard?nfc=${encodeURIComponent(code.toUpperCase())}`)
}

/* ---------- Admin: llaveros ---------- */

export async function createDeviceAction(label: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("hyd_admin_create_device", { p_label: label.slice(0, 80) || null })
  if (error) return { ok: false as const, error: "No tienes permiso o ocurrió un error." }
  revalidatePath("/admin/hidratacion")
  const r = data as { code: string; claim_code: string }
  return { ok: true as const, code: r.code, claim_code: r.claim_code, url: `${siteUrl()}/hidratacion/nfc/${r.code}` }
}

export async function setDeviceStatus(fd: FormData) {
  const id = z.string().uuid().safeParse(fd.get("id"))
  const status = z.enum(["available", "active", "disabled"]).safeParse(fd.get("status"))
  if (!id.success || !status.success) go("/admin/hidratacion", "error", "Datos no válidos.")
  const supabase = await createClient()
  const { error } = await supabase.from("hyd_devices").update({ status: status.data }).eq("id", id.data)
  if (error) go("/admin/hidratacion", "error", "No se pudo cambiar el estado.")
  revalidatePath("/admin/hidratacion")
  go("/admin/hidratacion", "ok", "Estado actualizado.")
}


/* ---------- Perfil ---------- */

export async function saveProfile(fd: FormData) {
  const bottle = intIn(fd.get("bottle_ml"), 100, 5000)
  const goalRaw = fd.get("goal") === "custom" ? fd.get("goal_custom") : fd.get("goal")
  const goal = intIn(goalRaw, 500, 10000)
  const wake = timeIn(fd.get("wake_time"))
  const sleep = timeIn(fd.get("sleep_time"))
  const tz = str(fd.get("timezone")) ?? "America/Mexico_City"
  const name = str(fd.get("full_name"))
  if (!bottle) go("/hidratacion/perfil", "error", "La capacidad del termo debe estar entre 100 y 5,000 ml.")
  if (!goal) go("/hidratacion/perfil", "error", "El objetivo debe estar entre 500 y 10,000 ml.")
  if (!wake || !sleep) go("/hidratacion/perfil", "error", "Revisa tus horarios.")
  if (!validTz(tz)) go("/hidratacion/perfil", "error", "Zona horaria no válida.")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/hidratacion/login")
  const { error } = await supabase
    .from("hyd_profiles")
    .update({ bottle_ml: bottle, daily_goal_ml: goal, wake_time: wake, sleep_time: sleep, timezone: tz, does_sport: fd.get("does_sport") === "on" })
    .eq("user_id", user.id)
  if (error) go("/hidratacion/perfil", "error", "No pudimos guardar tu perfil.")
  if (name) await supabase.auth.updateUser({ data: { full_name: name.slice(0, 120) } })
  revalidatePath("/hidratacion", "layout")
  go("/hidratacion/perfil", "ok", "Perfil actualizado.")
}

export async function releaseDevice(fd: FormData) {
  const id = z.string().uuid().safeParse(fd.get("id"))
  if (!id.success) go("/hidratacion/perfil", "error", "Llavero no válido.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("hyd_release_device", { p_device_id: id.data })
  if (error) go("/hidratacion/perfil", "error", "No pudimos desvincular el llavero.")
  revalidatePath("/hidratacion", "layout")
  go("/hidratacion/perfil", "ok", "Llavero desvinculado de tu cuenta.")
}

/* ---------- Recordatorios ---------- */

export async function saveReminderPrefs(fd: FormData) {
  const t = (k: string, d: string) => timeIn(fd.get(k)) ?? d
  const days = [1, 2, 3, 4, 5, 6, 7].filter((n) => fd.get(`d${n}`) === "on")
  const every = intIn(fd.get("every_hours"), 1, 8) ?? 3
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/hidratacion/login")
  const { error } = await supabase.from("hyd_reminder_prefs").upsert({
    user_id: user.id,
    enabled: fd.get("enabled") === "on",
    morning_on: fd.get("morning_on") === "on",
    morning_time: t("morning_time", "07:00"),
    day_on: fd.get("day_on") === "on",
    first_time: t("first_time", "10:00"),
    every_hours: every,
    workout_on: fd.get("workout_on") === "on",
    workout_time: t("workout_time", "18:00"),
    night_on: fd.get("night_on") === "on",
    night_time: t("night_time", "21:30"),
    days: days.length ? days : [1, 2, 3, 4, 5, 6, 7],
  })
  if (error) go("/hidratacion/recordatorios", "error", "No pudimos guardar tus preferencias.")
  revalidatePath("/hidratacion/recordatorios")
  go("/hidratacion/recordatorios", "ok", "Preferencias guardadas.")
}

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const ok =
    typeof sub?.endpoint === "string" && sub.endpoint.startsWith("https://") && sub.endpoint.length < 1000 &&
    typeof sub.p256dh === "string" && sub.p256dh.length < 200 && typeof sub.auth === "string" && sub.auth.length < 100
  if (!ok) return { ok: false as const, error: "Suscripción no válida." }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Inicia sesión." }
  await supabase.rpc("hyd_ensure_profile")
  const { error } = await supabase
    .from("hyd_push_subscriptions")
    .upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint" })
  if (error) return { ok: false as const, error: "No pudimos guardar este dispositivo." }
  await supabase.from("hyd_reminder_prefs").update({ enabled: true }).eq("user_id", user.id)
  revalidatePath("/hidratacion/recordatorios")
  return { ok: true as const }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  await supabase.from("hyd_push_subscriptions").delete().eq("endpoint", endpoint)
  revalidatePath("/hidratacion/recordatorios")
  return { ok: true as const }
}

export async function sendTestPush() {
  const cfg = pushConfig()
  if (!cfg) return { ok: false as const, error: "El envío de avisos aún no está configurado en el servidor." }
  const supabase = await createClient()
  const { data } = await supabase.from("hyd_push_subscriptions").select("endpoint,p256dh,auth")
  if (!data?.length) return { ok: false as const, error: "Primero activa los avisos en este dispositivo." }
  let sent = 0
  for (const s of data) {
    const r = await sendPush(s, { title: "💧 Hidratación", body: "¡Todo listo! Así se verán tus recordatorios.", url: "/hidratacion/dashboard", tag: "test" }, cfg)
    if (r.ok) sent++
    else if (r.gone) await supabase.from("hyd_push_subscriptions").delete().eq("endpoint", s.endpoint)
  }
  return sent ? { ok: true as const, sent } : { ok: false as const, error: "No se pudo entregar la notificación. Vuelve a activar los avisos." }
}
