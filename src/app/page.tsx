import Link from 'next/link'
import { AxoMark, Logo } from '@/components/Logo'
import { createPublicClient } from '@/lib/supabase/public'
import { formatMoney } from '@/lib/utils'

export const revalidate = 300

type Product = { id: string; name: string; description: string | null; base_price: number; currency: string; includes_dtf_uv: boolean }

async function getProducts(): Promise<Product[]> {
  try {
    const { data } = await createPublicClient()
      .from('products')
      .select('id, name, description, base_price, currency, includes_dtf_uv')
      .eq('is_active', true)
      .order('base_price')
    return (data as Product[]) ?? []
  } catch {
    return []
  }
}

const STEPS = [
  { icon: '📸', title: 'Cuéntanos de tu mascota', text: 'Sube su foto y su información. Tú decides qué se muestra.' },
  { icon: '🧩', title: 'Hacemos su silueta', text: 'Imprimimos en 3D una placa con su silueta, con NFC y QR.' },
  { icon: '📍', title: 'Si se pierde, vuelve a casa', text: 'Quien la encuentre toca o escanea, ve tu contacto y reporta dónde está. Sin apps ni cuentas.' },
]

export default async function Home() {
  const products = await getProducts()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-axo-100">Entrar</Link>
          <Link href="/register" className="btn-primary btn-sm">Crear cuenta</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-8 text-center md:pt-16">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-axo-100">
          <AxoMark size={64} />
        </div>
        <h1 className="mx-auto max-w-2xl text-4xl leading-tight md:text-5xl">
          Su identidad <span className="text-axo-500">también lo acompaña</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink/70">
          La identidad física y digital de tu mascota: una placa con su propia silueta conectada a un perfil que te ayuda a encontrarla.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="btn-primary w-full sm:w-auto">Registrar a mi mascota</Link>
          <Link href="/login" className="btn-outline w-full sm:w-auto">Ya tengo cuenta</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-6 text-center text-2xl">Así funciona</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="card text-center">
              <div className="mb-3 text-4xl">{s.icon}</div>
              <h3 className="mb-1 text-lg">{s.title}</h3>
              <p className="muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {products.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="mb-6 text-center text-2xl">Elige tu AJolote ID</h2>
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            {products.map((p) => (
              <div key={p.id} className="card">
                <h3 className="text-xl">{p.name}</h3>
                <p className="my-1 text-3xl font-extrabold text-axo-500">{formatMoney(p.base_price, p.currency)}</p>
                <p className="muted">{p.description}</p>
                {p.includes_dtf_uv && <span className="chip mt-3">✨ Imagen personalizada</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="card bg-axo-50 text-center">
          <h2 className="text-2xl">Tu privacidad primero</h2>
          <p className="muted mx-auto mt-2 max-w-lg">
            Tú eliges qué información aparece cuando alguien escanea la placa. Nunca mostramos tu dirección y no guardamos datos personales de quien la encuentra.
          </p>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-ink/60">
        <p>AJolote ID · una creación de Ajolote de Bolsillo 🦎</p>
      </footer>
    </div>
  )
}
