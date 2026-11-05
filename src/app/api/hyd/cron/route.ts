import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/public"
import { pushConfig } from "@/lib/hyd-push-config"
import { sendPush, type PushSub } from "@/lib/webpush"

export const dynamic = "force-dynamic"

/**
 * Lo llama un programador externo cada ~15 min con `Authorization: Bearer <CRON_SECRET>`.
 * El secreto NO se compara aquí: la función SQL hyd_cron_due lo verifica contra su hash
 * (webhook_secrets.name = 'hyd_cron'), igual que el webhook de pagos. No usa service_role.
 */
async function run(req: Request) {
  const secret = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]
  if (!secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const cfg = pushConfig()
  if (!cfg) return NextResponse.json({ error: "push_not_configured" }, { status: 503 })

  const db = createPublicClient()
  const { data, error } = await db.rpc("hyd_cron_due", { p_secret: secret, p_window_min: 30 })
  if (error) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let sent = 0, failed = 0, dropped = 0
  const rows = (data ?? []) as { o_user_id: string; o_kind: string; o_title: string; o_body: string; o_subs: PushSub[] | null }[]
  for (const r of rows) {
    for (const sub of r.o_subs ?? []) {
      const res = await sendPush(sub, { title: r.o_title, body: r.o_body, url: "/hidratacion/dashboard", tag: `hyd-${r.o_kind}` }, cfg)
      if (res.ok) sent++
      else {
        failed++
        if (res.gone) { await db.rpc("hyd_cron_drop_sub", { p_secret: secret, p_endpoint: sub.endpoint }); dropped++ }
      }
    }
  }
  return NextResponse.json({ due: rows.length, sent, failed, dropped })
}

export const POST = run
export const GET = run
