import Link from 'next/link'

export function AxoMark({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className="rounded-xl border-2 border-ink/80 object-cover"
      style={{ width: size, height: size }}
    />
  )
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-extrabold">
      <AxoMark />
      <span className="text-lg leading-none">
        AJolote <span className="text-axo-500">ID</span>
      </span>
    </Link>
  )
}
