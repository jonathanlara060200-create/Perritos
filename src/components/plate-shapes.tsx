// Siluetas de la placa dibujadas como SVG simple (caja de 100×100). Son marcadores de posición:
// cuando tengas tus siluetas definitivas se reemplazan aquí, una por id (personalizada, navidad, normal).

const HOLE = '#F2F7FD'

/** Perrito sentado sobre un hueso. El nombre se escribe sobre el hueso (centro x=50, y≈86). */
function Dog({ fill, ink, hat = false, question = false }: { fill: string; ink: string; hat?: boolean; question?: boolean }) {
  return (
    <g>
      {/* hueso (donde va el nombre) */}
      <g fill={fill}>
        <rect x="19" y="81" width="62" height="11" />
        <circle cx="19" cy="81.5" r="6" />
        <circle cx="19" cy="91.5" r="6" />
        <circle cx="81" cy="81.5" r="6" />
        <circle cx="81" cy="91.5" r="6" />
      </g>
      <rect x="19" y="81" width="62" height="11" fill="rgba(0,0,0,.08)" />

      {/* cola */}
      <path d="M72 68 C87 68 92 56 86 47" fill="none" stroke={fill} strokeWidth="6" strokeLinecap="round" />
      {/* muslos, cuerpo y patas */}
      <ellipse cx="31" cy="63" rx="10" ry="13" fill={fill} />
      <ellipse cx="69" cy="63" rx="10" ry="13" fill={fill} />
      <path d="M36 40 C31 52 30 62 33 72 L67 72 C70 62 69 52 64 40 Z" fill={fill} />
      <rect x="37" y="58" width="9" height="17" rx="4.5" fill={fill} />
      <rect x="54" y="58" width="9" height="17" rx="4.5" fill={fill} />
      <ellipse cx="41.5" cy="75" rx="7" ry="3.6" fill={fill} />
      <ellipse cx="58.5" cy="75" rx="7" ry="3.6" fill={fill} />
      {/* pecho claro */}
      <ellipse cx="50" cy="56" rx="9" ry="13" fill="rgba(255,255,255,.35)" />

      {/* orejas caídas */}
      <path d="M34 18 C24 12 16 22 18 37 C20 42 28 41 32 34 Z" fill={fill} />
      <path d="M66 18 C76 12 84 22 82 37 C80 42 72 41 68 34 Z" fill={fill} />
      <path d="M31 24 C25 22 21 28 22 36 C24 38 28 37 30 33 Z" fill="rgba(0,0,0,.16)" />
      <path d="M69 24 C75 22 79 28 78 36 C76 38 72 37 70 33 Z" fill="rgba(0,0,0,.16)" />
      {/* cabeza y cara */}
      <ellipse cx="50" cy="28" rx="18" ry="16" fill={fill} />
      <ellipse cx="50" cy="34" rx="9.5" ry="7.5" fill="rgba(255,255,255,.45)" />
      <circle cx="43" cy="26" r="2.3" fill={ink} />
      <circle cx="57" cy="26" r="2.3" fill={ink} />
      <ellipse cx="50" cy="32" rx="3.6" ry="2.6" fill={ink} />
      <path d="M50 34.5 L50 37 M45.5 38 C48 40.5 52 40.5 54.5 38" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />

      {question && (
        <text x="50" y="66" textAnchor="middle" fontSize="24" fontWeight="900" fill={ink} fontFamily="Arial, Helvetica, sans-serif">
          ?
        </text>
      )}

      {hat ? (
        <g>
          {/* gorro navideño */}
          <path d="M32 12.5 C32 5 40 0.5 50 0.5 C58 0.5 65 4 70 10 C65 8.5 61 8.5 58 9.5 C49 11.5 41 12 32 12.5 Z" fill="#D62839" />
          <rect x="29" y="10.5" width="42" height="8" rx="4" fill="#FFFFFF" stroke="rgba(0,0,0,.2)" strokeWidth=".8" />
          <circle cx="72.5" cy="8" r="4.8" fill="#FFFFFF" stroke="rgba(0,0,0,.2)" strokeWidth=".8" />
          <circle cx="72.5" cy="8" r="1.8" fill={HOLE} stroke="rgba(0,0,0,.15)" strokeWidth=".6" />
        </g>
      ) : (
        <circle cx="50" cy="16.5" r="2.7" fill={HOLE} stroke="rgba(0,0,0,.15)" strokeWidth=".6" />
      )}
    </g>
  )
}

/** Silueta por id, en una caja de 100×100. `ink` es el color de los detalles (ojos, nariz, signo). */
export function ShapeArt({ id, fill, ink = '#371A16' }: { id: string; fill: string; ink?: string }) {
  switch (id) {
    case 'personalizada':
      return <Dog fill={fill} ink={ink} question />
    case 'navidad':
      return <Dog fill={fill} ink={ink} hat />
    default:
      return <Dog fill={fill} ink={ink} />
  }
}
