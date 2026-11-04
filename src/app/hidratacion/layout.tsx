import Link from "next/link"

export const metadata = {
  title: { default: "Hidratación", template: "%s · Hidratación AJolote" },
  description: "Registra tu agua, sigue tu progreso y mejora tus hábitos. Se abre con un escaneo de tu llavero NFC.",
}

export default function HidratacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF4FB] to-white text-slate-800">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
        <Link href="/hidratacion" className="text-lg font-extrabold text-[#0B3C5D]">💧 Hidratación</Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">AJolote de Bolsillo</Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-24">{children}</main>
    </div>
  )
}
