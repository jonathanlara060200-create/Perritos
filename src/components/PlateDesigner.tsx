'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PLATE_FONT_FAMILY, PLATE_FONT_FIT, MIN_COMFORT_SIZE } from '@/lib/plate-fonts'
import { DESIGN_SPECS, plateArtMarkup, type DesignSpec, type PlateColors, type ZoneKey } from '@/lib/plate-art'
import { FILAMENTS, FONTS, MAX_NAME_LENGTH, SHAPES, SUGGESTED_PALETTES, filamentOf, type Palette } from '@/lib/plate'
import { cn, formatMoney } from '@/lib/utils'

export type DesignerProduct = {
  id: string
  name: string
  description: string | null
  base_price: number
  currency: string
  variants: { id: string; color_name: string; color_hex: string; price_delta: number }[]
}

const chipOn = 'border-axo-500 bg-axo-50'
const chipOff = 'border-axo-100 bg-white'

/** Muestra circular de un filamento (placa o letras). */
function Swatch({ hex, label, selected, disabled, onPick, hint }: { hex: string; label: string; selected: boolean; disabled?: boolean; onPick: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label + (disabled ? ` (${hint ?? 'no disponible'})` : '')}
      title={disabled ? hint : undefined}
      className={cn('flex w-[4.5rem] flex-col items-center gap-1.5 rounded-2xl p-1 text-center transition', disabled && 'cursor-not-allowed opacity-35')}
    >
      <span className={cn('rounded-full border-[3px] p-1', selected ? 'border-ink' : 'border-transparent')}>
        <span className="block h-11 w-11 rounded-full border border-black/10" style={{ background: hex }} />
      </span>
      <span className={cn('text-[11px] leading-tight', selected ? 'font-extrabold' : 'font-semibold')}>{label}</span>
    </button>
  )
}

/** Vista previa de la placa: mismo arte que se fabrica, con el nombre ajustado a su zona. */
function PlateStage({ shape, colors, letterHex, name, font, onFit }: { shape: string; colors: PlateColors; letterHex: string; name: string; font: string; onFit: (tooSmall: boolean) => void }) {
  const spec = DESIGN_SPECS[shape]
  const fit = PLATE_FONT_FIT[font]
  const family = PLATE_FONT_FAMILY[font]
  const area = spec.area
  const maxSize = fit.maxSize * (area.h / 7)
  const probe = useRef<SVGTextElement>(null)
  const estimate = Math.min(maxSize, area.w / (Math.max(name.length, 1) * 0.66))
  const [size, setSize] = useState(estimate)

  useLayoutEffect(() => {
    let alive = true
    const measure = () => {
      const el = probe.current
      if (!alive || !el) return
      const w = el.getBBox().width
      const next = w > 0 ? Math.min(maxSize, (10 * area.w) / w) : estimate
      setSize(next)
      onFit(next < MIN_COMFORT_SIZE * (area.h / 7))
    }
    measure()
    // Cuando termina de cargar la tipografía, el ancho real cambia: se vuelve a medir.
    document.fonts?.load(`700 20px ${family}`, name || 'Nombre').then(measure).catch(() => {})
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, font, shape])

  const floor = MIN_COMFORT_SIZE * (area.h / 7)
  const shown = size < floor ? floor : size
  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-56 w-56" role="img" aria-label={`Vista previa de la placa de ${name}`}>
      <g dangerouslySetInnerHTML={{ __html: plateArtMarkup(shape, colors) }} />
      {/* medición invisible a tamaño fijo */}
      <text ref={probe} x="50" y="0" fontSize="10" style={{ fontFamily: family, visibility: 'hidden' }}>{name}</text>
      <text
        x={area.cx}
        y={area.cy + (shown * fit.cap) / 2}
        textAnchor="middle"
        fontSize={shown}
        fill={letterHex}
        stroke="#000000"
        strokeOpacity=".22"
        strokeWidth=".35"
        paintOrder="stroke"
        style={{ fontFamily: family }}
      >
        {name}
      </text>
    </svg>
  )
}

/** Configurador con vista previa en vivo. Manda sus elecciones como campos ocultos del formulario. */
export function PlateDesigner({ products }: { products: DesignerProduct[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const product = products.find((p) => p.id === productId) ?? products[0]

  // Solo los 4 filamentos: cualquier otra variante del catálogo no se ofrece.
  const plateOptions = useMemo(
    () =>
      (product?.variants ?? []).flatMap((v) => {
        const f = filamentOf(v.color_name)
        return f ? [{ variant: v, filament: f }] : []
      }),
    [product],
  )

  const [variantId, setVariantId] = useState(plateOptions[0]?.variant.id ?? '')
  const [shape, setShape] = useState<string>(SHAPES[0].id)
  const size = 'M' // tamaño único (aprox. 5 × 7 cm)
  const [font, setFont] = useState<string>('redondeada')
  const [zone2, setZone2] = useState<string>('Rosa bajito')
  const [letters, setLetters] = useState<string>('Morado')
  const [name, setName] = useState('')
  const [tooSmall, setTooSmall] = useState(false)

  const current = plateOptions.find((o) => o.variant.id === variantId) ?? plateOptions[0]
  const spec: DesignSpec = DESIGN_SPECS[shape]
  const letterFil = filamentOf(letters)!
  const shown = (name.trim() || 'Nombre').slice(0, MAX_NAME_LENGTH)
  const price = product && current ? Number(product.base_price) + Number(current.variant.price_delta) : 0
  const shapeInfo = SHAPES.find((s) => s.id === shape)

  if (!product || !current) return <p className="muted">Por ahora no hay productos disponibles.</p>

  // Nombre del filamento elegido en cada zona.
  const zoneName: Record<ZoneKey, string> = { z1: current.filament.name, z2: zone2 }
  const zoneHex = (k: ZoneKey) => filamentOf(zoneName[k])!.hex
  const colors: PlateColors = { z1: zoneHex('z1'), z2: zoneHex('z2') }
  const summary = [`${shapeInfo?.letter} · ${shapeInfo?.label}`, spec.zones.map((z) => zoneName[z.key]).join(' + '), `letras ${letterFil.name}`].join(' · ')

  // Las letras nunca pueden ser del mismo filamento que la zona donde van (no se distinguirían).
  const lettersBase = zoneName[spec.lettersOn]
  const fixLetters = (base: string, current: string) => (current === base ? FILAMENTS.find((f) => f.name !== base)!.name : current)

  const setZone = (key: ZoneKey, value: string) => {
    if (key === 'z2') setZone2(value)
    if (key === spec.lettersOn) setLetters((l) => fixLetters(value, l))
  }
  const pickPlate = (opt: (typeof plateOptions)[number]) => {
    setVariantId(opt.variant.id)
    if (spec.lettersOn === 'z1') setLetters((l) => fixLetters(opt.filament.name, l))
  }
  const pickProduct = (id: string) => {
    setProductId(id)
    const p = products.find((x) => x.id === id)
    const first = p?.variants.find((v) => filamentOf(v.color_name))
    if (p && !p.variants.some((v) => v.id === variantId) && first) setVariantId(first.id)
  }
  const applyPalette = (pal: Palette) => {
    const opt = plateOptions.find((o) => o.filament.name === pal.z1)
    if (opt) setVariantId(opt.variant.id)
    setZone2(pal.z2)
    setLetters(pal.letters)
  }
  // Solo se sugieren paletas cuyo color principal existe como variante de este producto.
  const palettes = SUGGESTED_PALETTES.filter((p) => plateOptions.some((o) => o.filament.name === p.z1))
  const swatchOptions = (key: ZoneKey) =>
    key === 'z1'
      ? plateOptions.map((o) => ({ name: o.filament.name, hex: o.filament.hex, label: o.filament.label.replace(' pastel', ''), onPick: () => pickPlate(o) }))
      : FILAMENTS.map((f) => ({ name: f.name, hex: f.hex, label: f.label.replace(' pastel', ''), onPick: () => setZone(key, f.name) }))

  return (
    <div className="space-y-4">
      <input type="hidden" name="variant_id" value={current.variant.id} />
      <input type="hidden" name="silhouette" value={shape} />
      <input type="hidden" name="size_code" value={size} />
      <input type="hidden" name="font" value={font} />
      <input type="hidden" name="letter_color" value={letters} />
      <input type="hidden" name="zone_2" value={zone2} />

      {/* Vista previa */}
      <section className="card sticky top-16 z-10 space-y-1 !p-4">
        <p className="text-center text-xs font-extrabold uppercase tracking-wider text-ink/60">Tu placa · vista previa</p>
        <PlateStage shape={shape} colors={colors} letterHex={letterFil.hex} name={shown} font={font} onFit={setTooSmall} />
        <p className="text-center text-xs font-bold">{summary}</p>
        <p className="text-center text-2xl font-extrabold text-axo-500">{formatMoney(price, product.currency)}</p>
      </section>

      {products.length > 1 && (
        <section className="card space-y-3">
          <h2 className="text-xl">Modelo</h2>
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickProduct(p.id)}
              aria-pressed={p.id === productId}
              className={cn('w-full rounded-3xl border-2 p-4 text-left', p.id === productId ? chipOn : chipOff)}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-lg font-extrabold">{p.name}</span>
                  <span className="muted block">{p.description}</span>
                </span>
                <span className="shrink-0 text-xl font-extrabold text-axo-500">{formatMoney(p.base_price, p.currency)}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-xl">1 · Elige el diseño</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={shape === s.id}
              onClick={() => {
                setShape(s.id)
                setLetters((l) => fixLetters(s.id === shape ? lettersBase : zoneName[DESIGN_SPECS[s.id].lettersOn], l))
              }}
              className={cn('flex flex-col items-center gap-1 rounded-3xl border-2 p-2 text-center transition', shape === s.id ? chipOn : chipOff)}
            >
              <svg viewBox="0 0 100 100" className="h-24 w-full" aria-hidden="true">
                <g dangerouslySetInnerHTML={{ __html: plateArtMarkup(s.id, colors) }} />
              </svg>
              <span className="text-xs font-extrabold leading-tight">{s.letter} · {s.label}</span>
            </button>
          ))}
        </div>
        <p className="muted">{shapeInfo?.hint}</p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl">2 · Colores</h2>
        <p className="muted">Cada parte se imprime en uno de tus 4 filamentos.</p>
        {spec.zones.map((z) => (
          <div key={z.key} className="space-y-1">
            <p className="text-sm font-extrabold">{z.label}</p>
            <div className="flex justify-between gap-1">
              {swatchOptions(z.key).map((o) => (
                <Swatch key={o.name} hex={o.hex} label={o.label} selected={zoneName[z.key] === o.name} onPick={o.onPick} />
              ))}
            </div>
          </div>
        ))}
        {plateOptions.some((o) => Number(o.variant.price_delta) !== 0) && <p className="muted">Algunos colores principales tienen un costo extra; el precio de arriba ya lo incluye.</p>}

        <p className="text-sm font-extrabold">Combinaciones sugeridas</p>
        <div className="flex flex-wrap gap-2.5">
          {palettes.map((p, i) => {
            const active = zoneName.z1 === p.z1 && zone2 === p.z2 && letters === p.letters
            const dots = [p.z1, p.z2]
            return (
              <button
                key={i}
                type="button"
                onClick={() => applyPalette(p)}
                aria-pressed={active}
                aria-label={`Combinación ${i + 1}: ${dots.join(', ')}, letras ${p.letters}`}
                className={cn('flex items-center gap-1 rounded-full border-2 bg-white px-2.5 py-1.5 transition', active ? 'border-ink' : 'border-black/10')}
              >
                {dots.map((d, j) => (
                  <span key={j} className="h-5 w-5 rounded-full border border-black/10" style={{ background: filamentOf(d)!.hex }} />
                ))}
                <span className="ml-1 text-base font-extrabold" style={{ color: filamentOf(p.letters)!.hex, fontFamily: PLATE_FONT_FAMILY.redondeada, WebkitTextStroke: '0.4px rgba(0,0,0,.3)' }}>Ab</span>
              </button>
            )
          })}
        </div>
        <p className="muted">Solo mostramos los 4 filamentos con los que fabricamos.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">3 · Nombre y color de letras</h2>
        <input
          name="engraved_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Si lo dejas vacío usamos el nombre de tu mascota"
          className="input"
          aria-describedby="name-count"
        />
        <p id="name-count" className={cn('muted', tooSmall && '!font-bold !text-axo-600')}>
          {name.length} / {MAX_NAME_LENGTH} letras{tooSmall ? ' · Con este tamaño de letra el nombre queda muy chico; prueba una tipografía más angosta o un nombre más corto.' : ''}
        </p>

        <p className="text-sm font-extrabold">Color de las letras</p>
        <div className="flex justify-between gap-1">
          {FILAMENTS.map((f) => (
            <Swatch
              key={f.name}
              hex={f.hex}
              label={f.label.replace(' pastel', '')}
              selected={letters === f.name}
              disabled={f.name === lettersBase}
              hint="igual que el fondo del nombre; no se distinguiría"
              onPick={() => setLetters(f.name)}
            />
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">4 · Tipografía</h2>
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={font === f.id}
              onClick={() => setFont(f.id)}
              className={cn('flex flex-col items-center rounded-3xl border-2 px-2 py-2.5 transition', font === f.id ? chipOn : chipOff, i === FONTS.length - 1 && 'col-span-2')}
            >
              <span className="text-2xl leading-tight" style={{ fontFamily: PLATE_FONT_FAMILY[f.id] }}>{shown === 'Nombre' ? 'Luna' : shown}</span>
              <span className="text-[11px] font-bold opacity-70">{f.label}</span>
            </button>
          ))}
        </div>
        <p className="muted">{FONTS.find((f) => f.id === font)?.hint} Todas son gruesas y de trazo continuo para que el relieve no se rompa.</p>
      </section>

      <p className="muted text-center">Tamaño aproximado de la placa: unos 5 × 7 centímetros.</p>
    </div>
  )
}
