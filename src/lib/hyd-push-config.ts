import type { PushConfig } from "@/lib/webpush"

/** Lee la configuración VAPID del entorno. Devuelve null si falta algo (los avisos quedan desactivados, la app sigue funcionando). */
export function pushConfig(): PushConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return null
  return { publicKey, privateKey, subject }
}
