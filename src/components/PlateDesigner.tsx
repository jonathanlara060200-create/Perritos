'use client'

import { useMemo, useState } from 'react'
import { ShapeArt } from '@/components/plate-shapes'
import { PLATE_FONT_FAMILY } from '@/lib/plate-fonts'
import { FONTS, SHAPES, SIZES, labelOf } from '@/lib/plate'
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
  const [shape, setShape] = useState<string>('normal')
  const [size, setSize] = useState<string>('M')
  const [font, setFont] = useState<string>('fredoka')
  const [name, setName] = useState('')

  const variant = product?.variants.find((v) => v.id === variantId) ?? product?.variants[0]
  const color = variant?.color_hex ?? '#F4B8C8'
  const ink = textColorFor(color)
  const scale = size === 'S' ? 0.78 : size === 'L' ? 1 : 0.89
  const shown = (name.trim() || 'Nombre').slice(0, 14)
  // El nombre va sobre el hueso, en la parte baja de la silueta.
  const fontSize = Math.max(6, Math.min(14 * scale, (52 * scale) / (Math.max(shown.length, 4) * 0.55)))
  const nameY = 66 + 36.5 * scale
  const price = product ? Number(product.base_price) + Number(variant?.price_delta ?? 0) : 0
  const summary = useMemo(
    () => [labelOf(SHAPES, shape), labelOf(SIZES, size), variant?.color_name, labelOf(FONTS, font)].join(' · '),
    [shape, size, variant, font],
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

      {/* Vista previa */}
      <section className="card sticky top-16 z-10 space-y-2 !p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide text-ink/60">Tu placa</p>
        <svg viewBox="0 0 140 140" className="mx-auto h-52 w-52" role="img" aria-label={`Vista previa: ${summary}`}>
          <g transform={`translate(${70 - 50 * scale} ${66 - 50 * scale}) scale(${scale})`}>
            <ShapeArt id={shape} fill={color} ink={ink} />
          </g>
          <text
            x="70"
            y={nameY + fontSize * 0.34}
            textAnchor="middle"
            fontSize={fontSize}
            fill={ink}
            style={{ fontFamily: PLATE_FONT_FAMILY[font] }}
          >
            {shown}
          </text>
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
        <h2 className="text-xl">Silueta</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={shape === s.id}
              onClick={() => setShape(s.id)}
              className={cn('flex flex-col items-center gap-1 rounded-3xl border-2 p-3 text-center transition', shape === s.id ? chipOn : chipOff)}
            >
              <svg viewBox="-4 -6 108 110" className="h-24 w-24" aria-hidden="true">
                <ShapeArt id={s.id} fill={color} ink={ink} />
              </svg>
              <span className="font-extrabold">{s.label}</span>
            </button>
          ))}
        </div>
        <p className="muted">{SHAPES.find((s) => s.id === shape)?.hint}</p>
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
    </div>
  )
}
