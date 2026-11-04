import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

const STEPS = [
  { icon: "📲", title: "Escanea tu llavero NFC", text: "Acércalo a tu celular. Se abre tu página, sin descargar ninguna app." },
  { icon: "💧", title: "Registra tu consumo de agua", text: "Un toque para tu termo de 950 ml, o la cantidad que realmente tomaste." },
  { icon: "📈", title: "Consulta tu progreso", text: "Mira tu día, tu semana y tus rachas, y mejora tus hábitos a tu ritmo." },
]

export default async function Landing() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return (
    <>
      <section className="pt-6 pb-8">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0B3C5D]">Tu hidratación comienza con un escaneo.</h1>
        <p className="mt-4 text-lg text-slate-600">
          Un pequeño hábito puede hacer una gran diferencia. Escanea tu llavero, registra tu consumo de agua y lleva el control de tu hidratación desde cualquier lugar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link href="/hidratacion/dashboard" className="rounded-2xl bg-[#1E7FD8] px-6 py-3 font-bold text-white">Ir a mi panel</Link>
          ) : (
            <>
              <Link href="/hidratacion/registro" className="rounded-2xl bg-[#1E7FD8] px-6 py-3 font-bold text-white">Crear mi cuenta</Link>
              <Link href="/hidratacion/login" className="rounded-2xl bg-white px-6 py-3 font-bold text-[#0B3C5D] ring-1 ring-sky-200">Iniciar sesión</Link>
            </>
          )}
        </div>
      </section>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
            <span className="text-3xl" aria-hidden>{s.icon}</span>
            <div>
              <h2 className="font-bold text-[#0B3C5D]">{i + 1}. {s.title}</h2>
              <p className="mt-1 text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-slate-500">
        El llavero es un acceso rápido: no mide el agua por sí solo. Tú decides cuánto registrar. Esta herramienta no sustituye el consejo de un profesional de la salud.
      </p>
    </>
  )
}
