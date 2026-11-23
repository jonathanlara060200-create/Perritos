"""Bocetos de la Etapa 1: 3 conceptos de tótem 20 cm para Ajolote de Bolsillo.
Dibuja en mm reales (1 unidad SVG = 1 mm) con QR reales a 1.5 mm/módulo."""
import segno, math, pathlib

OUT = pathlib.Path(__file__).parent
MOD = 1.5          # mm por módulo QR
QZ = 4             # módulos de zona silenciosa
# Colores de filamento (aprox. en pantalla)
C = dict(rosa="#F6B7C9", azul="#9FCBEA", morado="#9B7BC4", amarillo="#F7E39A",
         negro="#222222", blanco="#FFFFFF", beige="#E9D8BC", gris="#9A9A9A")
URL_WEB = "https://ajolotedebolsillo.mitiendanube.com"
URL_WA = "https://wa.me/523111675907"
URL_IG = "https://instagram.com/ajolote_de_bolsillo"
STROKE = 'stroke="#555" stroke-width="0.6"'


def qr(data, x, y):
    """Teja blanca con zona silenciosa + módulos negros. Devuelve (svg, lado_mm)."""
    q = segno.make(data, error="m", boost_error=False)
    m = q.matrix
    n = len(m)
    side = (n + 2 * QZ) * MOD
    s = [f'<rect x="{x}" y="{y}" width="{side}" height="{side}" rx="2" fill="{C["blanco"]}" {STROKE}/>']
    for r, row in enumerate(m):
        for c_, v in enumerate(row):
            if v:
                s.append(f'<rect x="{x+(c_+QZ)*MOD:.2f}" y="{y+(r+QZ)*MOD:.2f}" width="{MOD+0.02}" height="{MOD+0.02}" fill="{C["negro"]}"/>')
    return "".join(s), side


def axolotl(cx, cy, s=1.0, hands=True, gill_color=None):
    """Ajolote simplificado (redibujo imprimible del logo). cx,cy = centro de la cabeza."""
    g = gill_color or "#EE8FB0"
    out = []
    # branquias: 3 por lado
    for side in (-1, 1):
        for i, ang in enumerate((-35, -5, 25)):
            a = math.radians(ang)
            x0 = cx + side * 26 * s
            y0 = cy - 4 * s + i * 7 * s
            x1 = x0 + side * 20 * s * math.cos(a)
            y1 = y0 + 20 * s * math.sin(a) - 6 * s
            out.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{g}" stroke-width="{7*s}" stroke-linecap="round"/>')
    out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{32*s}" ry="{25*s}" fill="{C["rosa"]}" {STROKE}/>')
    for side in (-1, 1):
        ex = cx + side * 13 * s
        out.append(f'<circle cx="{ex}" cy="{cy-2*s}" r="{5*s}" fill="{C["negro"]}"/>')
        out.append(f'<circle cx="{ex+1.6*s}" cy="{cy-3.8*s}" r="{1.8*s}" fill="{C["blanco"]}"/>')
        out.append(f'<ellipse cx="{cx+side*21*s}" cy="{cy+6*s}" rx="{4*s}" ry="{2.4*s}" fill="#EE8FB0"/>')
    out.append(f'<path d="M{cx-5*s},{cy+6*s} q{2.5*s},{4*s} {5*s},0 q{2.5*s},{4*s} {5*s},0" fill="none" stroke="{C["negro"]}" stroke-width="{1.2*s}" stroke-linecap="round"/>')
    if hands:
        for side in (-1, 1):
            out.append(f'<ellipse cx="{cx+side*20*s}" cy="{cy+27*s}" rx="{8*s}" ry="{6*s}" fill="{C["rosa"]}" {STROKE}/>')
    return "".join(out)


def icon(kind, x, y, size, bg, fg=C["blanco"]):
    """Bloque de color con icono en relieve."""
    s = size
    o = [f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{s*0.22}" fill="{bg}" {STROKE}/>']
    cx, cy = x + s / 2, y + s / 2
    w = max(1.2, s * 0.09)
    if kind == "ig":
        o.append(f'<rect x="{x+s*.2}" y="{y+s*.2}" width="{s*.6}" height="{s*.6}" rx="{s*.17}" fill="none" stroke="{fg}" stroke-width="{w}"/>')
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{s*.15}" fill="none" stroke="{fg}" stroke-width="{w}"/>')
        o.append(f'<circle cx="{x+s*.67}" cy="{y+s*.33}" r="{w*.7}" fill="{fg}"/>')
    elif kind == "wa":
        o.append(f'<circle cx="{cx}" cy="{cy-s*.02}" r="{s*.28}" fill="none" stroke="{fg}" stroke-width="{w}"/>')
        o.append(f'<path d="M{cx-s*.2},{cy+s*.2} l{-s*.1},{s*.12} l{s*.16},{-s*.04}" fill="{fg}" stroke="{fg}" stroke-width="{w*.6}"/>')
        o.append(f'<path d="M{cx-s*.1},{cy-s*.1} q0,{s*.2} {s*.2},{s*.2}" fill="none" stroke="{fg}" stroke-width="{w*1.2}" stroke-linecap="round"/>')
    elif kind == "web":
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{s*.3}" fill="none" stroke="{fg}" stroke-width="{w}"/>')
        o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{s*.13}" ry="{s*.3}" fill="none" stroke="{fg}" stroke-width="{w}"/>')
        o.append(f'<line x1="{cx-s*.3}" y1="{cy}" x2="{cx+s*.3}" y2="{cy}" stroke="{fg}" stroke-width="{w}"/>')
    elif kind == "fb":
        o.append(f'<text x="{cx}" y="{cy+s*.28}" font-size="{s*.75}" font-weight="900" text-anchor="middle" fill="{fg}" font-family="Arial">f</text>')
    elif kind == "nfc":
        for r in (.12, .24, .36):
            o.append(f'<path d="M{cx-s*r*.8},{cy+s*.15-s*r*.6} a{s*r},{s*r} 0 0 1 {s*r*1.6},0" fill="none" stroke="{fg}" stroke-width="{w}" stroke-linecap="round"/>')
    return "".join(o)


def text(x, y, t, size, fill, weight=800, anchor="middle"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" font-family="Fredoka, Nunito, Arial Rounded MT Bold, Arial" stroke="#555" stroke-width="0.25" paint-order="stroke">{t}</text>'


def bubbles(pts, fill=C["blanco"]):
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" fill-opacity="0.95" {STROKE}/><circle cx="{x-r*.35}" cy="{y-r*.35}" r="{r*.22}" fill="{C["azul"]}"/>' for x, y, r in pts)


def dim(x1, y1, x2, y2, label, off=0):
    """Cota simple."""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#c0392b" stroke-width="0.4" marker-start="url(#ar)" marker-end="url(#ar)"/>'
            f'<text x="{(x1+x2)/2+off}" y="{(y1+y2)/2}" font-size="5" fill="#c0392b" font-family="Arial" text-anchor="middle">{label}</text>')


# Origen: centro de la base en x=0; el mostrador está en y=0 y la altura crece hacia arriba (y negativo en SVG).
def base(w, h, color, label=True, icons=None):
    o = [f'<rect x="{-w/2}" y="{-h}" width="{w}" height="{h}" rx="3" fill="{color}" {STROKE}/>']
    if label:
        o.append(f'<text x="0" y="{-h/2+1.6}" font-size="4.2" font-weight="700" fill="{C["blanco"]}" text-anchor="middle" font-family="Arial" stroke="#555" stroke-width="0.15" paint-order="stroke">ACERCA TU CELULAR</text>')
    return "".join(o)


# ---------------- Concepto A: "El Bolsillo" ----------------
def concepto_a():
    o = []
    o.append(base(150, 14, C["azul"]))
    # panel trasero: mezclilla con costuras amarillas
    top = -186
    o.append(f'<path d="M-70,-14 L-70,{top+10} Q-70,{top} -60,{top} L60,{top} Q70,{top} 70,{top+10} L70,-14 Z" fill="{C["azul"]}" {STROKE}/>')
    o.append(f'<path d="M-65,-18 L-65,{top+12} Q-65,{top+5} -58,{top+5} L58,{top+5} Q65,{top+5} 65,{top+12} L65,-18" fill="none" stroke="{C["amarillo"]}" stroke-width="1.2" stroke-dasharray="4 2.5"/>')
    # bolsillo frontal (pieza en capa), forma de bolsillo de jeans
    pt = -142
    pocket = f'M-61,{pt} L61,{pt} L61,-40 L0,-22 L-61,-40 Z'
    # ajolote asomándose (pieza encima del bolsillo; sobresale arriba)
    o.append(axolotl(0, pt - 12, 1.15))
    o.append(f'<path d="{pocket}" fill="#8BBFE3" {STROKE}/>')
    o.append(f'<path d="M-56,{pt+5} L56,{pt+5} L56,-43 L0,-27 L-56,-43 Z" fill="none" stroke="{C["amarillo"]}" stroke-width="1.2" stroke-dasharray="4 2.5"/>')
    # manitas encima del borde del bolsillo
    for sd in (-1, 1):
        o.append(f'<ellipse cx="{sd*23}" cy="{pt+1}" rx="9" ry="6" fill="{C["rosa"]}" {STROKE}/>')
    o.append(text(0, pt + 17, "Ajolote", 13, C["blanco"]))
    o.append(text(0, pt + 30, "de Bolsillo", 10, C["blanco"]))
    s1, w1 = qr(URL_WEB, -56, pt + 37)
    s2, w2 = qr(URL_WA, 56 - 49.5, pt + 37 + 3)
    o += [s1, s2]
    o.append(text(-56 + w1 / 2, pt + 37 + w1 + 6, "TIENDA", 4.5, C["negro"], 700))
    o.append(text(56 - w2 / 2, pt + 40 + w2 + 6, "WHATSAPP", 4.5, C["negro"], 700))
    # iconos laterales en el panel trasero (columna derecha) y burbujas
    o.append(bubbles([(-78, -120, 7), (-85, -100, 5), (-77, -84, 4), (-83, -150, 4.5)]))
    # elemento lateral: alga/planta morada derecha
    o.append(f'<path d="M74,-14 C66,-50 86,-70 74,-110 C88,-80 90,-40 82,-14 Z" fill="{C["morado"]}" {STROKE}/>')
    o.append(f'<path d="M66,-14 C62,-40 70,-55 65,-80 C76,-60 74,-35 72,-14 Z" fill="#B49AD6" {STROKE}/>')
    o.append(icon("ig", -40, -11 - 9 - 0, 0) if False else "")
    return "".join(o), (-100, -210, 200, 220)


# ---------------- Concepto B: "La Pecera" ----------------
def concepto_b():
    o = []
    # base ancha tipo escalón con QR al frente (vista frontal: se ven de canto, los dibujamos como franja)
    o.append(base(160, 20, C["blanco"], label=False))
    for i, k in enumerate(("ig", "wa", "web", "fb")):
        o.append(icon(k, -45 + i * 24, -17, 14, [C["morado"], C["rosa"], C["azul"], C["morado"]][i]))
    # pecera redonda
    cy, R = -100, 74
    o.append(f'<circle cx="0" cy="{cy}" r="{R}" fill="{C["azul"]}" {STROKE}/>')
    o.append(f'<circle cx="0" cy="{cy}" r="{R-6}" fill="none" stroke="{C["blanco"]}" stroke-width="2.2"/>')
    # ondas inferiores
    o.append(f'<clipPath id="pb"><circle cx="0" cy="{cy}" r="{R-8}"/></clipPath>')
    o.append(f'<path clip-path="url(#pb)" d="M-80,-55 q10,-8 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 L80,-20 L-80,-20 Z" fill="#7FB4DD"/>')
    o.append(axolotl(0, cy - 22, 1.0))
    o.append(text(0, cy + 27, "Ajolote", 15, C["blanco"]))
    o.append(text(0, cy + 41, "de Bolsillo", 11, C["blanco"]))
    # burbujas que escapan de la pecera (sobresalen arriba-derecha)
    o.append(bubbles([(60, cy - 68, 7), (72, cy - 82, 5), (66, cy - 94, 3.5), (50, cy - 84, 3)]))
    # algas laterales
    o.append(f'<path d="M-72,-18 C-84,-50 -66,-70 -80,-105 C-62,-80 -62,-50 -64,-18 Z" fill="{C["morado"]}" {STROKE}/>')
    note = text(0, -40, "QR en la base ↓", 5, C["blanco"], 600)
    return "".join(o), (-100, -210, 200, 220)


def concepto_b_base_top():
    """Vista superior de la base de B mostrando los 2 QR."""
    o = [f'<rect x="-80" y="0" width="160" height="70" rx="4" fill="{C["blanco"]}" {STROKE}/>',
         f'<rect x="-50" y="2" width="100" height="6" fill="{C["azul"]}" {STROKE}/>']
    s1, w1 = qr(URL_WEB, -76, 12)
    s2, w2 = qr(URL_WA, 76 - 49.5, 15)
    o += [s1, s2]
    return "".join(o), (-85, -5, 170, 80)


# ---------------- Concepto C: "El Abrazo" ----------------
def concepto_c():
    o = []
    o.append(base(150, 14, C["rosa"]))
    # ajolote grande detrás: cola asomando a la derecha
    o.append(f'<path d="M58,-30 C90,-30 96,-60 84,-78 C80,-55 70,-45 55,-44 Z" fill="{C["rosa"]}" {STROKE}/>')
    # cabeza grande arriba con branquias anchas (elementos laterales que sobresalen)
    o.append(axolotl(0, -162, 1.3, hands=False, gill_color=C["morado"]))
    # panel frontal blanco
    o.append(f'<rect x="-60" y="-152" width="120" height="134" rx="10" fill="{C["blanco"]}" {STROKE}/>')
    # manitas abrazando el panel
    for sd in (-1, 1):
        o.append(f'<ellipse cx="{sd*58}" cy="-110" rx="9" ry="12" fill="{C["rosa"]}" {STROKE}/>')
    o.append(text(0, -138, "Ajolote de Bolsillo", 11, C["morado"]))
    s1, w1 = qr(URL_WEB, -57, -131)
    s2, w2 = qr(URL_WA, 57 - 49.5, -128)
    o += [s1, s2]
    for i, k in enumerate(("ig", "wa", "web", "fb")):
        o.append(icon(k, -44 + i * 23, -60 + 0 + 26 - 0 + 0, 13, [C["morado"], C["rosa"], C["azul"], C["morado"]][i]) if False else "")
    o.append(text(-57 + w1 / 2, -131 + w1 + 5, "TIENDA", 4.5, C["negro"], 700))
    o.append(text(57 - w2 / 2, -128 + w2 + 5, "WHATSAPP", 4.5, C["negro"], 700))
    for i, k in enumerate(("ig", "wa", "web", "fb")):
        o.append(icon(k, -45 + i * 24, -54 + 0, 0.1) if False else "")
    row_y = -55 + 12
    for i, k in enumerate(("ig", "wa", "web", "fb")):
        o.append(icon(k, -40 + i * 21, row_y - 12, 16, [C["morado"], C["rosa"], C["azul"], C["morado"]][i]))
    o.append(text(0, -21, "@ajolote_de_bolsillo", 6, C["morado"], 700))
    return "".join(o), (-100, -210, 200, 220)


def svg_wrap(body, vb, w_px):
    x, y, w, h = vb
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w_px}" height="{w_px*h/w:.0f}">'
            '<defs><marker id="ar" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#c0392b"/></marker></defs>'
            f'{body}</svg>')


def main():
    a, va = concepto_a()
    b, vb = concepto_b()
    bt, vbt = concepto_b_base_top()
    c, vc = concepto_c()
    # cotas de altura (200 mm) en cada concepto
    a += dim(-94, 0, -94, -200, "200", 0)
    b += dim(-94, 0, -94, -200, "200", 0)
    c += dim(-94, 0, -94, -200, "200", 0)
    cards = [("A · El Bolsillo", "El ajolote se asoma de un bolsillo de mezclilla con costuras amarillas. Burbujas y alga como elementos laterales.", svg_wrap(a, va, 420)),
             ("B · La Pecera", "Pecera redonda con olas; las burbujas escapan por arriba. Los 2 QR van en la base (vista superior abajo).", svg_wrap(b, vb, 420) + '<div class="sub">Base vista desde arriba</div>' + svg_wrap(bt, vbt, 300)),
             ("C · El Abrazo", "Ajolote grande detrás del panel: las branquias y la cola sobresalen, las manitas abrazan el panel.", svg_wrap(c, vc, 420))]
    html = ['<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap" rel="stylesheet">',
            '<style>body{margin:0;background:#f4f1ec;font-family:Fredoka,Arial,sans-serif;color:#333}h1{text-align:center;margin:18px 0 4px}p.l{text-align:center;margin:0 0 10px;color:#666}',
            '.row{display:flex;gap:16px;justify-content:center;padding:0 16px 20px}.card{background:#fff;border-radius:14px;padding:12px 14px;width:440px;box-shadow:0 2px 8px #0001}',
            '.card h2{margin:4px 0}.card p{margin:4px 0 8px;font-size:14px;color:#555}.sub{font-size:13px;color:#777;margin-top:6px}</style></head><body>',
            '<h1>Ajolote de Bolsillo · tótem 20 cm · 3 conceptos</h1><p class="l">Vista frontal a escala (mm reales). QR reales a 1.5 mm/módulo con zona silenciosa de 4 módulos.</p><div class="row">']
    for t, d, s in cards:
        html.append(f'<div class="card"><h2>{t}</h2><p>{d}</p>{s}</div>')
    html.append('</div></body></html>')
    (OUT / "bocetos.html").write_text("".join(html), encoding="utf-8")


if __name__ == "__main__":
    main()
