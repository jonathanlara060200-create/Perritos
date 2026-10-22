import { Logo } from '@/components/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Logo />
        <p className="muted mt-2">Su identidad también lo acompaña.</p>
      </div>
      <div className="card">{children}</div>
    </main>
  )
}
