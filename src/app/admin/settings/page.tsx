import { saveSettings } from '@/app/actions/admin'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Ajustes · Admin' }

export default async function AdminSettings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('app_settings').select('key, value')
  const cfg = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]))

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl">Ajustes</h1>
      <Flash sp={sp} />
      <form action={saveSettings} className="card space-y-4">
        <div>
          <label className="label" htmlFor="payment_instructions">Instrucciones de pago</label>
          <textarea id="payment_instructions" name="payment_instructions" rows={5} defaultValue={cfg.payment_instructions ?? ''} className="input" />
          <p className="muted mt-1">Se muestran al cliente en su pedido mientras esté pendiente de pago. Aquí puedes poner tu CLABE o datos de transferencia.</p>
        </div>
        <div>
          <label className="label" htmlFor="support_whatsapp">WhatsApp de atención</label>
          <input id="support_whatsapp" name="support_whatsapp" inputMode="tel" defaultValue={cfg.support_whatsapp ?? ''} placeholder="5233XXXXXXXX (con 52)" className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Guardar ajustes</SubmitButton>
      </form>
      <p className="muted">Estos ajustes son públicos para quien tenga un pedido: no pongas aquí contraseñas ni datos que no quieras que vea un cliente.</p>
    </div>
  )
}
