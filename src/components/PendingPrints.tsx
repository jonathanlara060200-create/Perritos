import { colorHex, readableOn, type PendingGroup } from '@/lib/clickers'

/** Una pieza por letra; el numerito es cuántas de esa letra hay que imprimir. */
function Tile({ ch, count, bg, fg }: { ch: string; count: number; bg: string; fg: string }) {
  return (
    <span
      className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-black/15 text-xl font-extrabold"
      style={{ background: bg, color: fg, boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.12)' }}
      title={`${ch} × ${count}`}
    >
      {ch}
      {count > 1 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </span>
  )
}

function Swatch({ label, hex }: { label: string; hex: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold">
      <span className="inline-block h-5 w-5 rounded-full border border-black/15" style={{ background: hex ?? '#E5E7EB' }} />
      {label}
    </span>
  )
}

function Who({ who }: { who: { label: string; n: number }[] }) {
  return (
    <p className="muted">
      Para:{' '}
      {who.map((w, i) => (
        <span key={w.label}>
          {i > 0 && ', '}
          {w.label} <b>×{w.n}</b>
        </span>
      ))}
    </p>
  )
}

function Block({ title, hint, empty, children }: { title: string; hint: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="muted">{hint}</p>
      </div>
      {empty ? <p className="rounded-2xl bg-mint p-3 text-sm font-bold text-emerald-900">Todo listo ✓</p> : children}
    </div>
  )
}

export function PendingPrints({ bases, keys, letters }: { bases: PendingGroup[]; keys: PendingGroup[]; letters: PendingGroup[] }) {
  return (
    <div className="space-y-6">
      <Block title="Bases por imprimir" hint="Una base por cada letra del nombre, en este color." empty={bases.length === 0}>
        <div className="grid gap-3 sm:grid-cols-2">
          {bases.map((g) => {
            const hex = colorHex(g.label) ?? '#E5E7EB'
            return (
              <div key={g.label} className="space-y-3 rounded-2xl bg-axo-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Swatch label={g.label} hex={colorHex(g.label)} />
                  <b className="text-lg">{g.n} {g.n === 1 ? 'base' : 'bases'}</b>
                </div>
                <div className="flex flex-wrap gap-1.5" aria-hidden>
                  {Array.from({ length: Math.min(g.n, 60) }, (_, i) => (
                    <span key={i} className="h-5 w-5 rounded-md border border-black/15" style={{ background: hex, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' }} />
                  ))}
                </div>
                <Who who={g.who} />
              </div>
            )
          })}
        </div>
      </Block>

      <Block title="Teclas por imprimir" hint="Cada recuadro es una tecla del color que dice; el numerito es cuántas de esa letra." empty={keys.length === 0}>
        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((g) => {
            const hex = colorHex(g.label)
            return (
              <div key={g.label} className="space-y-3 rounded-2xl bg-axo-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Swatch label={g.label} hex={hex} />
                  <b className="text-lg">{g.n} pzas</b>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.letters.map(([ch, n]) => (
                    <Tile key={ch} ch={ch} count={n} bg={hex ?? '#F3F4F6'} fg={hex ? readableOn(hex) : '#374151'} />
                  ))}
                </div>
                <Who who={g.who} />
              </div>
            )
          })}
        </div>
      </Block>

      <Block title="Letras por imprimir" hint="Las letras van en el color que dice; el fondo del recuadro solo ayuda a verlas." empty={letters.length === 0}>
        <div className="grid gap-3 sm:grid-cols-2">
          {letters.map((g) => {
            const hex = colorHex(g.label)
            return (
              <div key={g.label} className="space-y-3 rounded-2xl bg-axo-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Swatch label={g.label} hex={hex} />
                  <b className="text-lg">{g.n} pzas</b>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.letters.map(([ch, n]) => (
                    <Tile key={ch} ch={ch} count={n} bg={hex ? readableOn(hex) : '#F3F4F6'} fg={hex ?? '#374151'} />
                  ))}
                </div>
                <Who who={g.who} />
              </div>
            )
          })}
        </div>
      </Block>
    </div>
  )
}
