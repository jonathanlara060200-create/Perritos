import { colorHex, readableOn, type PendingGroup } from '@/lib/clickers'

/** Una tecla tal como va a quedar: color de tecla con la letra en su color. El numerito es cuántas de esa letra. */
function KeyTile({ ch, count, keyHex, letterHex }: { ch: string; count: number; keyHex: string; letterHex: string }) {
  return (
    <span
      className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-black/15 text-xl font-extrabold"
      style={{
        background: keyHex,
        color: letterHex,
        textShadow: '0 1px 1px rgba(0,0,0,.4)',
        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.12)',
      }}
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

function Swatch({ label, hex, prefix }: { label: string; hex: string | null; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-extrabold">
      {prefix && <span className="font-bold text-ink/60">{prefix}</span>}
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

export function PendingPrints({ bases, keys }: { bases: PendingGroup[]; keys: PendingGroup[] }) {
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

      <Block
        title="Teclas con letra por imprimir"
        hint="La tecla y su letra salen en la misma impresión: color de tecla + color de letra. Cada recuadro es como va a quedar; el numerito es cuántas de esa letra."
        empty={keys.length === 0}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((g) => {
            const keyHex = colorHex(g.label)
            const letterHex = colorHex(g.letterColor)
            const same = !!keyHex && keyHex === letterHex
            return (
              <div key={`${g.label}|${g.letterColor}`} className="space-y-3 rounded-2xl bg-axo-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Swatch prefix="Tecla" label={g.label} hex={keyHex} />
                    <br />
                    <Swatch prefix="Letra" label={g.letterColor ?? 'Sin definir'} hex={letterHex} />
                  </div>
                  <b className="text-lg">{g.n} pzas</b>
                </div>
                {same && (
                  <p className="rounded-xl bg-red-50 p-2 text-sm font-bold text-red-700">
                    Tecla y letra del mismo color: la letra no se va a ver. Revisa el pedido.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {g.letters.map(([ch, n]) => (
                    <KeyTile
                      key={ch}
                      ch={ch}
                      count={n}
                      keyHex={keyHex ?? '#F3F4F6'}
                      letterHex={letterHex ?? (keyHex ? readableOn(keyHex) : '#374151')}
                    />
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
