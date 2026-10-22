import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportForm } from '@/components/ReportForm'
import { createPublicClient } from '@/lib/supabase/public'
import { photoUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reportar ubicación', robots: { index: false, follow: false } }

export default async function ReportPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  // p_log=false: abrir esta pantalla no cuenta como un escaneo nuevo
  const { data } = await createPublicClient().rpc('get_public_pet', { p_public_id: publicId, p_log: false })
  const pet = data as { name: string; photo_path: string | null; is_lost: boolean; allow_location_reports: boolean } | null
  if (!pet) notFound()

  const photo = photoUrl(pet.photo_path)
  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-5 px-4 py-6">
      <Link href={`/pet/${publicId}`} className="text-sm font-bold text-axo-600">← Volver al perfil</Link>

      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`Foto de ${pet.name}`} className="h-20 w-20 rounded-3xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-axo-100 text-3xl">🐾</div>
        )}
        <div>
          <p className="muted">{pet.is_lost ? '🚨 Mascota perdida' : 'Reportar ubicación de'}</p>
          <h1 className="text-3xl">{pet.name}</h1>
        </div>
      </div>

      {pet.allow_location_reports ? (
        <ReportForm publicId={publicId} petName={pet.name} />
      ) : (
        <div className="card">
          <p className="font-bold">La familia desactivó los reportes de ubicación.</p>
          <Link href={`/pet/${publicId}`} className="btn-primary mt-3 w-full">Ver cómo contactarlos</Link>
        </div>
      )}
    </main>
  )
}
