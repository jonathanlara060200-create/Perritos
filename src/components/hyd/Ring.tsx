export function Ring({ pct, total, goal }: { pct: number; total: number; goal: number }) {
  const r = 84
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative mx-auto h-60 w-60" role="img" aria-label={`${pct}% de tu objetivo de ${goal} mililitros`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#DCEBF7" strokeWidth="14" />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke="#1E7FD8" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)}
          className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tracking-tight text-[#0B3C5D]">{pct}%</span>
        <span className="mt-1 text-sm text-slate-500">{new Intl.NumberFormat("es-MX").format(total)} de {new Intl.NumberFormat("es-MX").format(goal)} ml</span>
      </div>
    </div>
  )
}
