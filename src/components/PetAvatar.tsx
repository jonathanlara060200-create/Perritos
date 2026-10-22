import { cn, photoUrl } from '@/lib/utils'

export function PetAvatar({
  path,
  name,
  className,
}: {
  path?: string | null
  name: string
  className?: string
}) {
  const url = photoUrl(path)
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto de ${name}`} loading="lazy" className={cn('object-cover', className)} />
  }
  return (
    <div className={cn('flex items-center justify-center bg-axo-100 text-4xl', className)} aria-label={`Sin foto de ${name}`}>
      🐾
    </div>
  )
}
