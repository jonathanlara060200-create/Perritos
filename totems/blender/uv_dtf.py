"""Archivos para mandar a imprimir las calcomanías UV DTF de las placas QR.

Uso: python3 totems/blender/uv_dtf.py
Lee las medidas de los huecos del modelo (totem/medidas_modelo.json) y genera en uv_dtf/:
- placa_<etiqueta>.svg / .pdf : diseño a tamaño real (mm), fondo blanco, QR y etiqueta en curvas
- linea_de_corte.svg / .pdf    : contorno de corte de las dos placas (0.3 mm más chico que el hueco)
"""
import json
import pathlib

import segno
import yaml
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = pathlib.Path(__file__).parent
OUT = HERE / "uv_dtf"; OUT.mkdir(exist_ok=True)
MED = json.load(open(HERE / "totem" / "medidas_modelo.json"))
CFG = yaml.safe_load(open(HERE.parent / "config" / "totem_ajolote.yaml", encoding="utf-8"))
URLS = {q["etiqueta"]: q["url"] for q in CFG["qr"]}
FONT = TTFont(HERE.parent / "vendor" / "fonts" / "Fredoka-700.ttf")
HOLGURA = 0.3        # la calcomanía es 0.3 mm más chica por lado que el hueco
QZ = 2               # zona silenciosa (módulos) dentro de la placa blanca


def texto_en_curvas(txt, alto_mm, cx, cy):
    """Texto convertido a curvas SVG (no depende de que el proveedor tenga la fuente)."""
    gs = FONT.getGlyphSet(); cmap = FONT.getBestCmap(); upm = FONT["head"].unitsPerEm
    cap = FONT["OS/2"].sCapHeight or upm * 0.7
    k = alto_mm / cap
    ancho = sum(gs[cmap[ord(ch)]].width for ch in txt) * k
    x = cx - ancho / 2
    d = []
    for ch in txt:
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        g.draw(TransformPen(pen, (k, 0, 0, -k, x, cy + alto_mm / 2)))
        d.append(pen.getCommands()); x += g.width * k
    return " ".join(d)


def placa(info):
    w, h, r = info["ancho"] - 2 * HOLGURA, info["alto"] - 2 * HOLGURA, info["radio"] - HOLGURA
    etiqueta_h = 4.2
    m = segno.make(URLS[info["etiqueta"]], error="m", boost_error=False).matrix
    n = len(m)
    zona_qr = min(w - 2.0, h - etiqueta_h - 4.5)          # cuadro disponible para el QR
    mod = zona_qr / (n + 2 * QZ)
    lado = mod * n
    qx = (w - lado) / 2; qy = (zona_qr - lado) / 2 + 1.0
    # QR como un solo trazo continuo (sin uniones entre módulos)
    import io, re
    buf = io.BytesIO()
    segno.make(URLS[info["etiqueta"]], error="m", boost_error=False).save(buf, kind="svg", border=0, scale=1, xmldecl=False,
                                                                       svgns=False, nl=False)
    path = re.search(r"<path[^>]*/>", buf.getvalue().decode()).group(0)
    qr_svg = f'<g transform="translate({qx:.3f} {qy:.3f}) scale({mod:.4f})">{path}</g>'
    lab = texto_en_curvas(info["etiqueta"], etiqueta_h, w / 2, h - 1.6 - etiqueta_h / 2)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.2f}mm" height="{h:.2f}mm" viewBox="0 0 {w:.3f} {h:.3f}">'
           f'<rect width="{w:.3f}" height="{h:.3f}" rx="{r:.3f}" fill="#ffffff"/>'
           f'{qr_svg}<path fill="#111111" d="{lab}"/></svg>')
    return svg, w, h, r, mod


def main():
    cortes = []
    xoff = 0.0
    resumen = []
    for info in MED["huecos_uv_dtf"]:
        svg, w, h, r, mod = placa(info)
        nombre = f"placa_{info['etiqueta'].lower()}"
        (OUT / f"{nombre}.svg").write_text(svg, encoding="utf-8")
        cortes.append(f'<rect x="{xoff + 2:.3f}" y="2" width="{w:.3f}" height="{h:.3f}" rx="{r:.3f}" fill="none" stroke="#ff0000" stroke-width="0.1"/>')
        resumen.append(dict(placa=nombre, ancho_mm=round(w, 2), alto_mm=round(h, 2), radio_mm=round(r, 2), modulo_qr_mm=round(mod, 2),
                            hueco_mm=[info["ancho"], info["alto"]], profundidad_hueco_mm=info["profundidad"]))
        xoff += w + 6
    W = xoff + 2; H = max(r["alto_mm"] for r in resumen) + 4
    (OUT / "linea_de_corte.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.2f}mm" height="{H:.2f}mm" viewBox="0 0 {W:.3f} {H:.3f}">{"".join(cortes)}</svg>',
        encoding="utf-8")
    try:
        import cairosvg
        for f in OUT.glob("*.svg"):
            cairosvg.svg2pdf(url=str(f), write_to=str(f.with_suffix(".pdf")))
    except Exception as e:  # PDF opcional
        print("sin PDF:", e)
    json.dump(resumen, open(OUT / "medidas.json", "w"), indent=1, ensure_ascii=False)
    print(json.dumps(resumen, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
