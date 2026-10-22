import Link from 'next/link'

export default function PetNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl">🐾</div>
      <h1 className="text-2xl">Esta placa no está activa</h1>
      <p className="muted">
        Puede que el perfil haya sido desactivado o eliminado por su dueño. Si encontraste a una mascota, busca otros datos en su collar o llévala con un veterinario para revisar si tiene microchip.
      </p>
      <Link href="/" className="btn-soft">Conocer AJolote ID</Link>
    </main>
  )
}
