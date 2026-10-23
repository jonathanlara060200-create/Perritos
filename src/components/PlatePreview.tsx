import QRCode from 'qrcode'

type Props = { name: string; tagCode: string; url: string; color?: string }

/** Representación visual de la placa (frente y reverso). La silueta real se diseña a partir de la foto. */
export function PlatePreview({ name, tagCode, url, color = '#F4B8C8' }: Props) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const modules = qr.modules as unknown as { size: number; data: ArrayLike<number> }
  const size = modules.size
  const data = modules.data
  const cell = 64 / size
  const rects: React.ReactNode[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        rects.push(<rect key={`${r}-${c}`} x={28 + c * cell} y={16 + r * cell} width={cell + 0.05} height={cell + 0.05} fill="#371A16" />)
      }
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <figure>
        <svg viewBox="0 0 120 120" className="w-full" role="img" aria-label={`Frente de la placa de ${name}`}>
          <rect x="8" y="8" width="104" height="104" rx="38" fill={color} />
          <circle cx="60" cy="14" r="5" fill="#F2F7FD" />
          <text x="60" y="62" textAnchor="middle" fontSize="11" fill="#371A16" opacity=".55" fontWeight="700">silueta de</text>
          <text x="60" y="80" textAnchor="middle" fontSize="16" fill="#371A16" fontWeight="800">{name.slice(0, 12).toUpperCase()}</text>
          <text x="60" y="100" textAnchor="middle" fontSize="12">🐾</text>
        </svg>
        <figcaption className="muted text-center">Frente</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 120 120" className="w-full" role="img" aria-label={`Reverso de la placa ${tagCode}`}>
          <rect x="8" y="8" width="104" height="104" rx="38" fill={color} />
          <rect x="24" y="12" width="72" height="72" rx="8" fill="#F2F7FD" />
          {rects}
          <text x="60" y="96" textAnchor="middle" fontSize="8" fill="#371A16" fontWeight="800">{tagCode}</text>
          <text x="60" y="106" textAnchor="middle" fontSize="6" fill="#371A16" fontWeight="700">TAP / ESCANEA</text>
        </svg>
        <figcaption className="muted text-center">Reverso</figcaption>
      </figure>
    </div>
  )
}
