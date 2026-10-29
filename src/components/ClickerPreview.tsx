import { colorHex, readableOn } from '@/lib/clickers'

/** Puntito de color con el nombre al lado. Si no conocemos el color, solo muestra el nombre. */
export function ColorDot({ name, label }: { name?: string | null; label: string }) {
  const hex = colorHex(name)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {label && <span className="text-ink/60">{label}:</span>}
      {hex && <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/15" style={{ background: hex }} />}
      <b>{name || '—'}</b>
    </span>
  )
}

/** Vista previa del control: base de color con una tecla por letra. */
export function ClickerPreview({
  name,
  base,
  keyColor,
  letterColor,
}: {
  name?: string | null
  base?: string | null
  keyColor?: string | null
  letterColor?: string | null
}) {
  const letters = [...(name ?? '')].filter((c) => c.trim() !== '')
  if (letters.length === 0) return null
  const baseHex = colorHex(base) ?? '#E5E7EB'
  const keyHex = colorHex(keyColor)
  const letterHex = colorHex(letterColor)
  const textColor = letterHex ?? (keyHex ? readableOn(keyHex) : '#374151')

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-black/10 p-1.5 shadow-sm"
      style={{ background: baseHex }}
      role="img"
      aria-label={`Vista previa del control ${name}`}
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/15 text-lg font-extrabold uppercase"
          style={{ background: keyHex ?? '#F3F4F6', color: textColor, boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.12)' }}
        >
          {ch}
        </span>
      ))}
    </div>
  )
}
