import { NextResponse, type NextRequest } from 'next/server'
import { getPayment } from '@/lib/mercadopago'
import { createPublicClient } from '@/lib/supabase/public'

// Mercado Pago avisa aquí cuando cambia un pago. No confiamos en el aviso: consultamos el pago
// directamente a Mercado Pago con nuestro token y solo entonces lo confirmamos en la base.
export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  let body: { type?: string; topic?: string; data?: { id?: string | number }; id?: string | number } = {}
  try {
    body = await req.json()
  } catch {
    /* algunos avisos vienen solo en la URL */
  }
  const type = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const id = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? body.id ?? '')
  if (type !== 'payment' || !id) return NextResponse.json({ ok: true, ignored: true })

  if (!process.env.MP_ACCESS_TOKEN || !process.env.MP_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
  }

  const payment = await getPayment(id)
  if (!payment) return NextResponse.json({ ok: false, error: 'payment_not_found' }, { status: 502 })
  if (payment.status !== 'approved' || !payment.external_reference) return NextResponse.json({ ok: true, status: payment.status })

  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('confirm_online_payment', {
    p_secret: process.env.MP_WEBHOOK_SECRET,
    p_order_id: payment.external_reference,
    p_provider: 'mercadopago',
    p_provider_ref: String(payment.id),
    p_amount: payment.transaction_amount,
    p_raw: { status: payment.status, type: payment.payment_type_id, currency: payment.currency_id },
  })
  if (error) return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
  return NextResponse.json({ ok: true, result: data })
}

// Diagnóstico: abre esta dirección en el navegador para ver si la app encuentra sus claves (no muestra los valores).
export async function GET() {
  return NextResponse.json({
    ok: true,
    configurado: {
      MP_ACCESS_TOKEN: !!process.env.MP_ACCESS_TOKEN,
      MP_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
      NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
    },
  })
}
