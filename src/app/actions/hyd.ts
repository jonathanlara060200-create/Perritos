"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { go } from "@/lib/flash"
import { safeNext, siteUrl, str } from "@/lib/utils"

const emailSchema = z.string().trim().email("Escribe un correo válido.").max(160)
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72)
const intIn = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/* ---------- Cuenta ---------- */

export async function hydSignUp(fd: FormData) {
  const next = safeNext(fd.get("next")) || "/hidratacion/dashboard"
  const email = emailSchema.safeParse(fd.get("email"))
  const password = passwordSchema.safeParse(fd.get("password"))
  const fullName = str(fd.get("full_name"))
  if (!fullName) go("/hidratacion/registro", "error", "Escribe tu nombre.")
  if (!email.success) go("/hidratacion/registro", "error", email.error.issues[0].message)
  if (!password.success) go("/hidratacion/registro", "error", password.error.issues[0].message)

  const bottle = intIn(fd.get("bottle_ml"), 100, 5000) ?? 950
  const goalRaw = fd.get("goal") === "custom" ? fd.get("goal_custom") : fd.get("goal")
  const goal = intIn(goalRaw, 500, 10000) ?? 2000

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      data: { full_name: fullName.slice(0, 120), hyd: { bottle_ml: bottle, daily_goal_ml: goal } },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) go("/hidratacion/registro", "error", "No pudimos crear tu cuenta. ¿Ya tienes una con este correo?")
  if (data.session) redirect(next)
  go("/hidratacion/login", "ok", "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.")
}

export async function hydSignIn(fd: FormData) {
  const next = safeNext(fd.get("next")) || "/hidratacion/dashboard"
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
  const back = `/hidratacion/nfc/${encodeURIComponent(code)}`
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
