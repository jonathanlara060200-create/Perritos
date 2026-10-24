// Siluetas y charms dibujados como SVG simple. Cuando tengas tus propias siluetas se reemplazan aquí.

/** Formas en una caja de 100×100. */
export function ShapeArt({ id, fill }: { id: string; fill: string }) {
  switch (id) {
    case 'corazon':
      return <path d="M50 92 C12 62 4 40 4 27 C4 13 15 5 28 5 C38 5 46 10 50 19 C54 10 62 5 72 5 C85 5 96 13 96 27 C96 40 88 62 50 92 Z" fill={fill} />
    case 'hueso':
      return (
        <g fill={fill}>
          <rect x="22" y="36" width="56" height="28" rx="6" />
          <circle cx="20" cy="34" r="13" />
          <circle cx="20" cy="66" r="13" />
          <circle cx="80" cy="34" r="13" />
          <circle cx="80" cy="66" r="13" />
        </g>
      )
    case 'huella':
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="66" rx="24" ry="20" />
          <ellipse cx="22" cy="42" rx="10" ry="13" transform="rotate(-20 22 42)" />
          <ellipse cx="40" cy="26" rx="10" ry="14" transform="rotate(-6 40 26)" />
          <ellipse cx="60" cy="26" rx="10" ry="14" transform="rotate(6 60 26)" />
          <ellipse cx="78" cy="42" rx="10" ry="13" transform="rotate(20 78 42)" />
        </g>
      )
    case 'nube':
      return (
        <g fill={fill}>
          <rect x="12" y="46" width="76" height="34" rx="17" />
          <circle cx="36" cy="46" r="20" />
          <circle cx="60" cy="40" r="25" />
          <circle cx="76" cy="54" r="15" />
        </g>
      )
    case 'mascota':
      return (
        <g fill={fill}>
          <circle cx="50" cy="56" r="33" />
          <ellipse cx="22" cy="38" rx="12" ry="22" transform="rotate(14 22 38)" />
          <ellipse cx="78" cy="38" rx="12" ry="22" transform="rotate(-14 78 38)" />
        </g>
      )
    default:
      return <circle cx="50" cy="50" r="45" fill={fill} />
  }
}

/** Charms en una caja de 24×24. */
export function CharmArt({ id, fill }: { id: string; fill: string }) {
  switch (id) {
    case 'corazon':
      return <path d="M12 21 C3 14 2 9 2 7 C2 4 4 2 7 2 C9 2 11 3 12 5 C13 3 15 2 17 2 C20 2 22 4 22 7 C22 9 21 14 12 21Z" fill={fill} />
    case 'estrella':
      return <path d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 7-6.2-3.4-6.2 3.4 1.3-7L2 9.4l7-.9z" fill={fill} />
    case 'luna':
      return <path d="M20 14.5A9 9 0 0 1 9.5 4 9 9 0 1 0 20 14.5z" fill={fill} />
    case 'rayo':
      return <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill={fill} />
    case 'hueso':
      return (
        <g fill={fill}>
          <rect x="6" y="9.5" width="12" height="5" rx="2" />
          <circle cx="5" cy="9" r="3" />
          <circle cx="5" cy="15" r="3" />
          <circle cx="19" cy="9" r="3" />
          <circle cx="19" cy="15" r="3" />
        </g>
      )
    case 'huella':
      return (
        <g fill={fill}>
          <ellipse cx="12" cy="16" rx="5" ry="4.2" />
          <circle cx="5.5" cy="10.5" r="2.2" />
          <circle cx="9.5" cy="6.5" r="2.2" />
          <circle cx="14.5" cy="6.5" r="2.2" />
          <circle cx="18.5" cy="10.5" r="2.2" />
        </g>
      )
    case 'flor':
      return (
        <g fill={fill}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="12" cy="6.5" rx="3.6" ry="5" transform={`rotate(${a} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="2.4" fill="#fff" opacity=".75" />
        </g>
      )
    default:
      return null
  }
}
