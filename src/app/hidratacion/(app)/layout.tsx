import Link from "next/link"
import { hydSignOut } from "@/app/actions/hyd"
import { requireHydUser } from "@/lib/hyd"

const NAV = [
  { href: "/hidratacion/dashboard", label: "Hoy", icon: "💧" },
  { href: "/hidratacion/historial", label: "Historial", icon: "🕒" },
  { href: "/hidratacion/estadisticas", label: "Estadísticas", icon: "📈" },
  { href: "/hidratacion/recordatorios", label: "Avisos", icon: "🔔" },
  { href: "/hidratacion/perfil", label: "Perfil", icon: "⚙️" },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireHydUser()
  return (
    <>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-sky-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Navegación de hidratación">
        <ul className="mx-auto flex max-w-xl justify-around">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="flex flex-col items-center px-2 py-2 text-xs text-slate-600">
                <span className="text-xl" aria-hidden>{n.icon}</span>{n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <form action={hydSignOut} className="mt-8 text-center"><button className="text-sm text-slate-500 underline">Cerrar sesión</button></form>
    </>
  )
}
