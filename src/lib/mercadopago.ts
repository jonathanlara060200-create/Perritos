// Cliente mínimo de Mercado Pago (Checkout Pro). Sin SDK: solo fetch, funciona en Cloudflare Workers.
const API = 'https://api.mercadopago.com'

export const mpEnabled = () => !!process.env.MP_ACCESS_TOKEN

function headers() {
  return { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
}

export async function createPreference(input: {
  orderId: string
  orderNumber: number
  title: string
  amount: number
  currency: string
  payerEmail?: string | null
  siteUrl: string
}): Promise<string> {
  const back = `${input.siteUrl}/orders/${input.orderId}`
  const res = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: { ...headers(), 'X-Idempotency-Key': `order-${input.orderId}-${Date.now()}` },
    body: JSON.stringify({
      items: [{ id: input.orderId, title: input.title, quantity: 1, unit_price: Number(input.amount), currency_id: input.currency || 'MXN' }],
      external_reference: input.orderId,
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      back_urls: { success: `${back}?mp=ok`, pending: `${back}?mp=pending`, failure: `${back}?mp=fail` },
      auto_return: 'approved',
      notification_url: `${input.siteUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'AJOLOTE ID',
    }),
  })
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`)
  const json = (await res.json()) as { init_point?: string }
  if (!json.init_point) throw new Error('Mercado Pago no devolvió el link de pago')
  return json.init_point
}

export type MpPayment = {
  id: number
  status: string
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  payment_type_id?: string
}

export async function getPayment(id: string): Promise<MpPayment | null> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: headers() })
  if (!res.ok) return null
  return (await res.json()) as MpPayment
}
