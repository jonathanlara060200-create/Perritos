import Link from "next/link"
import { hydSignIn } from "@/app/actions/hyd"
import { Flash } from "@/components/Flash"

export const metadata = { title: "Iniciar sesión" }

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const next = sp.next ?? "/hidratacion/dashboard"
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
      <h1 className="text-2xl font-extrabold text-[#0B3C5D]">Inicia sesión</h1>
      <Flash sp={sp} />
      <form action={hydSignIn} className="mt-4 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div><label className="label" htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
        <div><label className="label" htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
        <button className="w-full rounded-2xl bg-[#1E7FD8] py-3 font-bold text-white">Entrar</button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿Primera vez? <Link className="font-semibold text-[#1E7FD8]" href={`/hidratacion/registro?next=${encodeURIComponent(next)}`}>Crea tu cuenta</Link>
        {" · "}<Link className="font-semibold text-[#1E7FD8]" href="/forgot-password">Olvidé mi contraseña</Link>
      </p>
    </div>
  )
}
