"""Boceto: base con botones NFC intercambiables + despiece por placas (concepto A)."""
import pathlib
from bocetos import C, STROKE, icon, text, axolotl, bubbles, qr, URL_WEB, URL_WA, svg_wrap

OUT = pathlib.Path(__file__).parent
TOL = 0.2
PUCK_D = 32.0          # botón NFC
PUCK_H = 8.0
SOCKET_DEPTH = 4.0
TAG_D = 25.0
BASE_W, BASE_D, BASE_H = 160, 70, 12
PUCKS = [(-48, "ig", C["morado"]), (0, "wa", C["rosa"]), (48, "web", C["azul"])]


def lbl(x, y, t, size=4.2, fill="#444", anchor="middle", w=600):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{anchor}" font-family="Arial">{t}</text>'


def base_top():
    """Vista superior de la base (y hacia abajo = hacia el cliente)."""
    o = [f'<path d="M{-BASE_W/2},0 H{BASE_W/2} V{BASE_D-22} '
         + "".join(f'A{PUCK_D/2+6},{PUCK_D/2+6} 0 0 1 {x - (PUCK_D/2+6) if i else 0},{BASE_D-22} ' for i, (x, _, _) in enumerate([]))
         + f'Q{BASE_W/2},{BASE_D} {BASE_W/2-12},{BASE_D} H{-BASE_W/2+12} Q{-BASE_W/2},{BASE_D} {-BASE_W/2},{BASE_D-22} Z" fill="{C["azul"]}" {STROKE}/>']
    # ranura del pilar
    o.append(f'<rect x="-71" y="8" width="142" height="5.4" fill="#5E8FB5" {STROKE}/>')
    o.append(lbl(0, 6, "ranura del pilar (5 mm + 0.2 holgura por lado)", 3.6))
    for x, k, col in PUCKS:
        cy = 38
        o.append(f'<circle cx="{x}" cy="{cy}" r="{PUCK_D/2+TOL+3}" fill="none" stroke="{C["blanco"]}" stroke-width="1" stroke-dasharray="2 1.5"/>')
        o.append(f'<circle cx="{x}" cy="{cy}" r="{PUCK_D/2}" fill="{col}" {STROKE}/>')
        o.append(icon(k, x - 11, cy - 11, 22, col))
    o.append(f'<text x="0" y="{BASE_D-7}" font-size="6" font-weight="800" fill="{C["blanco"]}" text-anchor="middle" font-family="Fredoka, Arial" stroke="#555" stroke-width="0.2" paint-order="stroke">ACERCA TU CELULAR AL BOTÓN</text>')
    o.append(lbl(0, BASE_D + 8, f"Base {BASE_W} × {BASE_D} mm · 3 botones Ø{PUCK_D:.0f} mm", 4.5, "#c0392b"))
    return "".join(o), (-90, -2, 180, BASE_D + 14)


def puck_section():
    """Corte de un botón dentro de su hueco, escala 3:1."""
    s = 3.0
    o = []
    bw = 60 * s  # tramo de base mostrado
    # base con hueco
    gx = 0
    o.append(f'<rect x="{-bw/2}" y="0" width="{bw}" height="{BASE_H*s}" fill="{C["azul"]}" {STROKE}/>')
    sock_w = (PUCK_D + 2 * TOL) * s
    o.append(f'<rect x="{-sock_w/2}" y="0" width="{sock_w}" height="{SOCKET_DEPTH*s}" fill="#fff"/>')
    # agujero para expulsar
    o.append(f'<rect x="{-3*s}" y="{SOCKET_DEPTH*s}" width="{6*s}" height="{(BASE_H-SOCKET_DEPTH)*s}" fill="#fff" {STROKE}/>')
    # botón (hueco por dentro para el tag)
    pw = PUCK_D * s
    top = -(PUCK_H - SOCKET_DEPTH) * s
    o.append(f'<rect x="{-pw/2}" y="{top}" width="{pw}" height="{PUCK_H*s}" rx="{2*s}" fill="{C["morado"]}" {STROKE}/>')
    cav_w = (TAG_D + 2 * 0.3) * s
    o.append(f'<rect x="{-cav_w/2}" y="{top+1.2*s}" width="{cav_w}" height="{(PUCK_H-1.2)*s}" fill="#fff" {STROKE}/>')
    # tag NFC pegado al techo
    o.append(f'<rect x="{-TAG_D*s/2}" y="{top+1.2*s}" width="{TAG_D*s}" height="{0.6*s}" fill="#d4a017"/>')
    # icono en relieve
    o.append(f'<rect x="{-9*s}" y="{top-0.6*s}" width="{18*s}" height="{0.6*s}" fill="{C["blanco"]}" {STROKE}/>')
    # cotas / notas
    ny = top - 8
    notes = [
        (f"icono blanco en relieve 0.6 mm", -9 * s, top - 0.6 * s),
        (f"techo 1.2 mm → el tag queda a ~1.8 mm del celular", pw / 2 - 6, top + 1.5 * s),
        (f"tag NFC Ø{TAG_D:.0f} mm (adhesivo, va pegado al techo)", TAG_D * s / 2 - 4, top + 1.6 * s + 6),
        (f"hueco en la base: {SOCKET_DEPTH:.0f} mm, holgura {TOL} mm", sock_w / 2, SOCKET_DEPTH * s / 2),
        ("orificio para sacar el botón con una pluma", 3 * s, (BASE_H - 2) * s),
    ]
    for i, (t, x, y) in enumerate(notes):
        tx = bw / 2 + 12
        ty = top - 6 + i * 13
        o.append(f'<line x1="{x}" y1="{y}" x2="{tx-2}" y2="{ty-1.5}" stroke="#c0392b" stroke-width="0.5"/>')
        o.append(lbl(tx, ty, t, 5.2, "#333", "start"))
    o.append(lbl(-bw / 2, BASE_H * s + 10, f"Corte de un botón (escala 3:1) · botón Ø{PUCK_D:.0f} × {PUCK_H:.0f} mm, sobresale {PUCK_H-SOCKET_DEPTH:.0f} mm", 5.2, "#c0392b", "start"))
    return "".join(o), (-bw / 2 - 4, top - 18, bw + 200, BASE_H * s + top * -1 + 34)


def front_view():
    """Vista frontal del concepto A con la nueva base y botones."""
    o = []
    # pilar
    top = -186
    o.append(f'<path d="M-70,-12 L-70,{top+10} Q-70,{top} -60,{top} L60,{top} Q70,{top} 70,{top+10} L70,-12 Z" fill="{C["azul"]}" {STROKE}/>')
    o.append(f'<path d="M-65,-16 L-65,{top+12} Q-65,{top+5} -58,{top+5} L58,{top+5} Q65,{top+5} 65,{top+12} L65,-16" fill="none" stroke="{C["amarillo"]}" stroke-width="1.2" stroke-dasharray="4 2.5"/>')
    pt = -142
    o.append(axolotl(0, pt - 12, 1.15, gill_color=C["morado"]))
    o.append(f'<path d="M-61,{pt} L61,{pt} L61,-40 L0,-22 L-61,-40 Z" fill="#8BBFE3" {STROKE}/>')
    o.append(f'<path d="M-56,{pt+5} L56,{pt+5} L56,-43 L0,-27 L-56,-43 Z" fill="none" stroke="{C["amarillo"]}" stroke-width="1.2" stroke-dasharray="4 2.5"/>')
    for sd in (-1, 1):
        o.append(f'<ellipse cx="{sd*23}" cy="{pt+1}" rx="9" ry="6" fill="{C["rosa"]}" {STROKE}/>')
    o.append(text(0, pt + 17, "Ajolote", 13, C["blanco"]))
    o.append(text(0, pt + 30, "de Bolsillo", 10, C["blanco"]))
    s1, w1 = qr(URL_WEB, -56, pt + 37)
    s2, w2 = qr(URL_WA, 56 - 49.5, pt + 40)
    o += [s1, s2]
    o.append(bubbles([(-78, -120, 7), (-85, -100, 5), (-77, -84, 4), (-83, -150, 4.5)]))
    o.append(f'<path d="M74,-12 C66,-50 86,-70 74,-110 C88,-80 90,-40 82,-12 Z" fill="{C["morado"]}" {STROKE}/>')
    # base vista de frente (con los botones asomando)
    o.append(f'<rect x="-80" y="-12" width="160" height="12" rx="3" fill="{C["azul"]}" {STROKE}/>')
    for x, k, col in PUCKS:
        o.append(f'<rect x="{x-16}" y="-16" width="32" height="5" rx="1.5" fill="{col}" {STROKE}/>')
    return "".join(o), (-100, -205, 200, 212)


def plates():
    rows = [
        ("1", "Pilar (fondo de mezclilla)", "azul · amarillo", "Huecos guía de 1 mm para el bolsillo y pernos para ajolote, burbujas y alga", "≈140 × 186"),
        ("2", "Bolsillo con nombre y QR", "azul · amarillo · blanco · negro", "Se monta con pernos en el pilar", "≈122 × 120"),
        ("3", "Ajolote + burbujas + alga", "rosa · morado · negro · blanco", "3 tipos de pieza en una sola placa; cada una entra en su lugar del pilar", "≈130 × 80"),
        ("4", "Base", "azul · blanco", "Ranura para el pilar, 3 huecos de botón, texto en relieve", "160 × 70"),
        ("5", "Botones NFC (3 o más)", "rosa · morado · azul · blanco", "Intercambiables; tag NFC adentro", "Ø32 c/u"),
    ]
    h = ['<table><tr><th>Placa</th><th>Pieza(s)</th><th>Colores</th><th>Cómo encaja</th><th>Medida (mm)</th></tr>']
    for r in rows:
        h.append("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>")
    h.append("</table>")
    return "".join(h)


def main():
    a, va = base_top()
    b, vb = puck_section()
    f, vf = front_view()
    html = ['<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap" rel="stylesheet">',
            '<style>body{margin:0;background:#f4f1ec;font-family:Fredoka,Arial,sans-serif;color:#333}h1{text-align:center;margin:16px 0 6px}',
            '.row{display:flex;gap:16px;justify-content:center;padding:0 16px 14px;align-items:flex-start}.card{background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 2px 8px #0001}',
            'h2{margin:2px 0 8px;font-size:19px}table{border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid #eee;padding:6px 8px;text-align:left}th{background:#f7f3ee}</style></head><body>',
            '<h1>Concepto A · base con botones NFC intercambiables y despiece</h1><div class="row">',
            f'<div class="card"><h2>Vista frontal</h2>{svg_wrap(f, vf, 380)}</div>',
            f'<div class="card"><h2>Base vista desde arriba</h2>{svg_wrap(a, va, 520)}<h2 style="margin-top:14px">Botón NFC en corte</h2>{svg_wrap(b, vb, 520)}</div></div>',
            f'<div class="row"><div class="card"><h2>Despiece por placas (máx. 4 colores cada una)</h2>{plates()}</div></div></body></html>']
    (OUT / "base_nfc.html").write_text("".join(html), encoding="utf-8")


if __name__ == "__main__":
    main()
