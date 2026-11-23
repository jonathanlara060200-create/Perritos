// Worker propio: el de OpenNext (la app) + un "scheduled" para los recordatorios de hidratación.
// Cloudflare lo despierta cada 15 min (ver "triggers" en wrangler.jsonc) y este llama a /api/hyd/cron
// por dentro, sin salir a internet y sin gastar minutos de GitHub Actions.
// Requiere el secreto HYD_CRON_SECRET en Cloudflare (Settings → Variables and Secrets).
// @ts-ignore: .open-next/worker.js existe después del build
import { default as handler } from './.open-next/worker.js'

export default {
  fetch: handler.fetch,

  async scheduled(event, env, ctx) {
    if (!env.HYD_CRON_SECRET) {
      console.log('hyd cron: falta HYD_CRON_SECRET, no se envían recordatorios')
      return
    }
    const base = (env.NEXT_PUBLIC_SITE_URL || 'https://localhost').replace(/\/$/, '')
    const req = new Request(`${base}/api/hyd/cron`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.HYD_CRON_SECRET}` },
    })
    const res = await handler.fetch(req, env, ctx)
    console.log('hyd cron:', res.status, await res.text())
  },
}

// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'
