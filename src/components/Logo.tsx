import Link from 'next/link'

export function AxoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g stroke="#E25C80" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M10 18 L3 13M9 24 L1 22M10 30 L3 33" />
        <path d="M38 18 L45 13M39 24 L47 22M38 30 L45 33" />
      </g>
      <ellipse cx="24" cy="25" rx="15" ry="14" fill="#FBC4D3" stroke="#E25C80" strokeWidth="2.5" />
      <circle cx="18" cy="23" r="1.8" fill="#3B2F3A" />
      <circle cx="30" cy="23" r="1.8" fill="#3B2F3A" />
      <path d="M20 29 Q24 33 28 29" stroke="#3B2F3A" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
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
