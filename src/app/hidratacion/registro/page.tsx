import Link from "next/link"
import { hydSignUp } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"
import { GOALS } from "@/lib/hyd"

export const metadata = { title: "Crear cuenta" }

export default async function Registro({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Crea tu cuenta</h1>
      <Flash sp={sp} />
      <form action={hydSignUp} className="mt-4 space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/hidratacion/dashboard"} />
        <div><label className="label" htmlFor="full_name">Nombre</label><input id="full_name" name="full_name" autoComplete="name" required maxLength={120} className="input" /></div>
        <div><label className="label" htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
        <div><label className="label" htmlFor="password">Contraseña (mínimo 8 caracteres)</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className="input" /></div>
        <div>
          <label className="label" htmlFor="bottle_ml">Capacidad de tu termo (ml)</label>
          <input id="bottle_ml" name="bottle_ml" type="number" inputMode="numeric" min={100} max={5000} defaultValue={950} className="input" />
        </div>
        <fieldset>
          <legend className="label">Objetivo diario (podrás cambiarlo después)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <label key={g} className="cursor-pointer rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100 has-[:checked]:bg-[#1E7FD8] has-[:checked]:text-white">
                <input type="radio" name="goal" value={g} defaultChecked={g === 2000} className="sr-only" />{new Intl.NumberFormat("es-MX").format(g)} ml
              </label>
            ))}
            <label className="cursor-pointer rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100 has-[:checked]:bg-[#1E7FD8] has-[:checked]:text-white">
              <input type="radio" name="goal" value="custom" className="sr-only" />Personalizado
            </label>
          </div>
          <input name="goal_custom" type="number" inputMode="numeric" min={500} max={10000} placeholder="Si eliges personalizado, escribe los ml" className="input mt-2" />
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="wake_time">Normalmente despierto a las</label><input id="wake_time" name="wake_time" type="time" defaultValue="07:00" className="input" /></div>
          <div><label className="label" htmlFor="sleep_time">Normalmente duermo a las</label><input id="sleep_time" name="sleep_time" type="time" defaultValue="23:00" className="input" /></div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="reminders" defaultChecked className="mt-1" />
          <span>Quiero recibir recordatorios suaves (los activas con el permiso de tu navegador y puedes cambiarlos cuando quieras).</span>
        </label>
        <button className="w-full rounded-2xl bg-[#1E7FD8] py-3 font-bold text-white">Crear cuenta</button>
      </form>
      <p className="mt-4 text-sm text-slate-600">¿Ya tienes cuenta? <Link className="font-semibold text-[#1E7FD8]" href="/hidratacion/login">Inicia sesión</Link></p>
    </div>
  )
}
