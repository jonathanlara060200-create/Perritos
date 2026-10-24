'use client'

import { useMemo, useState } from 'react'
import { CharmArt, ShapeArt } from '@/components/plate-shapes'
import { PLATE_FONT_FAMILY } from '@/lib/plate-fonts'
import { CHARMS, FONTS, SHAPES, SIZES, labelOf } from '@/lib/plate'
import { cn, formatMoney } from '@/lib/utils'

export type DesignerProduct = {
  id: string
  name: string
  description: string | null
  base_price: number
  currency: string
  variants: { id: string; color_name: string; color_hex: string; price_delta: number }[]
}

function textColorFor(hex: string) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#371A16'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#371A16' : '#FFFFFF'
}

const chipBase = 'rounded-full border-2 px-3 py-2 text-sm font-bold transition'
const chipOn = 'border-axo-500 bg-axo-50'
const chipOff = 'border-axo-100 bg-white'

/** Personalizador con vista previa en vivo. Manda sus elecciones como campos ocultos del formulario. */
export function PlateDesigner({ products }: { products: DesignerProduct[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const product = products.find((p) => p.id === productId) ?? products[0]
  const [variantId, setVariantId] = useState(product?.variants[0]?.id ?? '')
  const [shape, setShape] = useState<string>('mascota')
  const [size, setSize] = useState<string>('M')
  const [font, setFont] = useState<string>('fredoka')
  const [charm, setCharm] = useState<string>('none')
  const [name, setName] = useState('')

  const variant = product?.variants.find((v) => v.id === variantId) ?? product?.variants[0]
  const color = variant?.color_hex ?? '#F4B8C8'
  const ink = textColorFor(color)
  const scale = size === 'S' ? 0.78 : size === 'L' ? 1 : 0.89
  const shown = (name.trim() || 'Nombre').slice(0, 14)
  const fontSize = Math.max(9, Math.min(20, 150 / Math.max(shown.length, 5)))
  const price = product ? Number(product.base_price) + Number(variant?.price_delta ?? 0) : 0
  const summary = useMemo(
    () => [labelOf(SHAPES, shape), labelOf(SIZES, size), variant?.color_name, labelOf(FONTS, font), charm === 'none' ? 'sin charm' : labelOf(CHARMS, charm)].join(' · '),
    [shape, size, variant, font, charm],
  )

  if (!product) return <p className="muted">Por ahora no hay productos disponibles.</p>

  const pickProduct = (id: string) => {
    setProductId(id)
    const p = products.find((x) => x.id === id)
    if (p && !p.variants.some((v) => v.id === variantId)) setVariantId(p.variants[0]?.id ?? '')
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="silhouette" value={shape} />
      <input type="hidden" name="size_code" value={size} />
      <input type="hidden" name="font" value={font} />
      <input type="hidden" name="charm" value={charm} />

      {/* Vista previa */}
      <section className="card sticky top-16 z-10 space-y-2 !p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide text-ink/60">Tu placa</p>
        <svg viewBox="0 0 140 140" className="mx-auto h-52 w-52" role="img" aria-label={`Vista previa: ${summary}`}>
          <g transform={`translate(${70 - 50 * scale} ${66 - 50 * scale}) scale(${scale})`}>
            <ShapeArt id={shape} fill={color} />
          </g>
          <circle cx="70" cy={66 - 50 * scale + 5} r="3.2" fill="#F2F7FD" stroke="rgba(0,0,0,.15)" />
          <text
            x="70"
            y={66 + fontSize * 0.34}
            textAnchor="middle"
            fontSize={fontSize}
            fill={ink}
            style={{ fontFamily: PLATE_FONT_FAMILY[font] }}
          >
            {shown}
          </text>
          {charm !== 'none' && (
            <g transform="translate(88 98)">
              <line x1="12" y1="-6" x2="12" y2="2" stroke="#9AA3AD" strokeWidth="1.5" />
              <circle cx="12" cy="-7" r="2" fill="none" stroke="#9AA3AD" strokeWidth="1.5" />
              <g transform="translate(0 2) scale(1)">
                <CharmArt id={charm} fill={textColorFor(color) === '#FFFFFF' ? '#FFFFFF' : '#371A16'} />
              </g>
            </g>
          )}
        </svg>
        <p className="text-center text-sm font-bold">{summary}</p>
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
        <h2 className="text-xl">Forma</h2>
        <div className="flex flex-wrap gap-2">
          {SHAPES.map((s) => (
            <button key={s.id} type="button" aria-pressed={shape === s.id} onClick={() => setShape(s.id)} className={cn(chipBase, shape === s.id ? chipOn : chipOff)}>
              {s.label}
            </button>
          ))}
        </div>
        {shape === 'mascota' && <p className="muted">Hacemos la silueta con la foto de tu mascota. En la vista previa se ve una silueta de ejemplo.</p>}
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">Talla</h2>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => setSize(s.id)} className={cn(chipBase, size === s.id ? chipOn : chipOff)}>
              {s.label} <span className="muted">· {s.mm} mm</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">Color</h2>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button key={v.id} type="button" aria-pressed={variantId === v.id} onClick={() => setVariantId(v.id)} className={cn(chipBase, 'flex items-center gap-2', variantId === v.id ? chipOn : chipOff)}>
              <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: v.color_hex }} />
              {v.color_name}
              {Number(v.price_delta) !== 0 && <span className="muted">+{formatMoney(v.price_delta, product.currency)}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">Nombre y tipografía</h2>
        <input
          name="engraved_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Si lo dejas vacío usamos el nombre de tu mascota"
          className="input"
        />
        <div className="flex flex-wrap gap-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={font === f.id}
              onClick={() => setFont(f.id)}
              className={cn(chipBase, 'text-base', font === f.id ? chipOn : chipOff)}
              style={{ fontFamily: PLATE_FONT_FAMILY[f.id] }}
            >
              {shown === 'Nombre' ? 'Nombre' : shown}
            </button>
          ))}
        </div>
        <p className="muted">Tipografía: {labelOf(FONTS, font)}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl">Charm</h2>
        <div className="flex flex-wrap gap-2">
          {CHARMS.map((c) => (
            <button key={c.id} type="button" aria-pressed={charm === c.id} onClick={() => setCharm(c.id)} className={cn(chipBase, 'flex items-center gap-2', charm === c.id ? chipOn : chipOff)}>
              {c.id !== 'none' && (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <CharmArt id={c.id} fill="#371A16" />
                </svg>
              )}
              {c.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
