#!/usr/bin/env python3
"""
Generador de placas AJolote ID: imagen de Gemini -> modelo 3D multicolor listo para imprimir.

Uso:
    python placa.py lucas.png --alto 50
    python placa.py lucas.png --alto 45 --nfc 20 --salida mis_placas/lucas

Qué hace:
  1. Detecta los colores planos de la imagen (máx. 4, uno por ranura del CFS).
  2. Quita el fondo blanco y detecta el agujero de la argolla (lo deja redondo perfecto).
  3. Engrosa las líneas negras que serían muy delgadas para la boquilla de 0.4 mm.
  4. Arma el 3D por capas:
       - Base del color del contorno (negro) con el hueco del NFC sellado adentro.
       - "Tapa" de color de 1 mm encima (cada zona en su color).
       - Las líneas negras y el nombre suben 0.4 mm más (relieve que se siente).
  5. Exporta un .3mf (una pieza por color) + STL por color + vista previa + instrucciones.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
import manifold3d as m3d
import trimesh
from shapely import affinity
from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.ops import unary_union
from skimage.morphology import skeletonize

# ---------------------------------------------------------------- Ajustes de impresión (mm)
BASE = 2.0          # base sólida del color del contorno
TAPA = 1.0          # capa de colores encima de la base (5 capas de 0.2)
RELIEVE = 0.4       # lo negro (líneas y nombre) sube esto extra
NFC_Z0 = 0.6        # el hueco del NFC empieza aquí...
NFC_Z1 = 1.4        # ...y termina aquí -> PAUSA a esta altura para meter el sticker
NFC_TOL = 0.6       # holgura del hueco sobre el diámetro del sticker
NFC_PARED = 1.2     # pared mínima alrededor del NFC
LINEA_MIN = 0.5     # grosor mínimo de línea negra (1 pasada de boquilla 0.4; Arachne la imprime)
ZONA_MIN = 0.5      # zonas de color más angostas que esto se vuelven negras
AGUJERO_MIN = 4.5   # diámetro mínimo del agujero de la argolla
PARED_ARGOLLA = 2.2 # pared mínima alrededor del agujero


def lab(bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(bgr.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)


def nombre_color(bgr) -> str:
    b, g, r = [int(x) for x in bgr]
    L, A, B = lab(np.array([[b, g, r]]))[0]
    L = L * 100 / 255
    A -= 128
    B -= 128
    chroma = math.hypot(A, B)
    if L < 25:
        return "negro"
    if chroma < 12:
        return "blanco" if L > 85 else "gris"
    hue = (math.degrees(math.atan2(B, A)) + 360) % 360
    if 20 <= hue < 100 and L > 55 and chroma < 35:
        return "beige"
    if hue < 20 or hue >= 340:
        return "rosa" if L > 60 else "rojo"
    if hue < 75:
        return "naranja" if chroma > 45 else "cafe"
    if hue < 110:
        return "amarillo"
    if hue < 200:
        return "verde"
    if hue < 290:
        return "azul"
    return "morado"


# ---------------------------------------------------------------- 1. Colores
def detectar_paleta(img: np.ndarray, max_colores: int) -> np.ndarray:
    """Colores 'puros' (sin bordes antialias) agrupados con k-means; se unen los muy parecidos."""
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    var = cv2.blur(gris * gris, (5, 5)) - cv2.blur(gris, (5, 5)) ** 2
    puros = img[var < 30].reshape(-1, 3)
    if len(puros) > 200_000:
        puros = puros[np.random.default_rng(0).choice(len(puros), 200_000, replace=False)]
    datos = lab(puros)
    k = min(10, len(np.unique(puros, axis=0)))
    _, etiquetas, centros = cv2.kmeans(
        datos, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 4, cv2.KMEANS_PP_CENTERS
    )
    cuenta = np.bincount(etiquetas.ravel(), minlength=k)
    orden = np.argsort(-cuenta)
    paleta: list[tuple[np.ndarray, int]] = []
    for i in orden:
        if cuenta[i] < 0.0005 * len(datos):  # 0.05%: detalles chicos como la lengua
            continue
        c = centros[i]
        cerca = next((j for j, (p, _) in enumerate(paleta) if np.linalg.norm(p - c) < 28), None)
        if cerca is None:
            paleta.append((c, cuenta[i]))
        else:
            p, n = paleta[cerca]
            paleta[cerca] = ((p * n + c * cuenta[i]) / (n + cuenta[i]), n + cuenta[i])
    paleta.sort(key=lambda x: -x[1])
    paleta_lab = np.array([p for p, _ in paleta[: max_colores + 0]], np.float32)
    # Lab -> BGR para mostrar
    return paleta_lab


def clasificar(img: np.ndarray, paleta_lab: np.ndarray) -> np.ndarray:
    datos = lab(img.reshape(-1, 3))
    d = ((datos[:, None, :] - paleta_lab[None, :, :]) ** 2).sum(-1)
    etiqueta = d.argmin(1).reshape(img.shape[:2]).astype(np.uint8)
    # Filtro de moda: limpia el ruido de los bordes antialias
    votos = np.stack([cv2.blur((etiqueta == i).astype(np.float32), (5, 5)) for i in range(len(paleta_lab))])
    return votos.argmax(0).astype(np.uint8)


# ---------------------------------------------------------------- 2. Máscaras -> polígonos en mm
def a_poligonos(mascara: np.ndarray, mm_por_px: float, alto_px: int) -> MultiPolygon | Polygon:
    contornos, jer = cv2.findContours(mascara.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if jer is None:
        return Polygon()
    jer = jer[0]
    polis = []

    def mm(c):
        c = c.reshape(-1, 2).astype(np.float64)
        return [(x * mm_por_px, (alto_px - y) * mm_por_px) for x, y in c]

    for i, c in enumerate(contornos):
        if jer[i][3] != -1 or len(c) < 4:
            continue
        huecos = []
        h = jer[i][2]
        while h != -1:
            if len(contornos[h]) >= 4:
                huecos.append(mm(contornos[h]))
            h = jer[h][0]
        p = Polygon(mm(c), huecos).buffer(0)
        if not p.is_empty:
            polis.append(p)
    return unary_union(polis).simplify(0.02)


def ancho_linea_mm(mascara: np.ndarray, mm_por_px: float) -> float:
    if mascara.sum() == 0:
        return 0.0
    dist = cv2.distanceTransform(mascara.astype(np.uint8), cv2.DIST_L2, 5)
    esq = skeletonize(mascara > 0)
    vals = dist[esq]
    vals = vals[vals > 0]
    return float(np.percentile(vals, 20) * 2 * mm_por_px) if len(vals) else 0.0


def solo_grandes(g, area_min: float):
    if g.is_empty:
        return g
    partes = list(g.geoms) if hasattr(g, "geoms") else [g]
    return unary_union([p for p in partes if p.area >= area_min])


# ---------------------------------------------------------------- 3. Geometría 3D
def cross_section(g) -> m3d.CrossSection:
    anillos = []
    for p in (g.geoms if hasattr(g, "geoms") else [g]):
        if p.is_empty:
            continue
        p = p.buffer(0)
        for q in (p.geoms if hasattr(p, "geoms") else [p]):
            ext = list(q.exterior.coords)[:-1]
            if Polygon(ext).exterior.is_ccw is False:
                ext = ext[::-1]
            anillos.append(ext)
            for h in q.interiors:
                hc = list(h.coords)[:-1]
                if Polygon(hc).exterior.is_ccw:
                    hc = hc[::-1]
                anillos.append(hc)
    return m3d.CrossSection(anillos, m3d.FillRule.EvenOdd)


def extruir(g, z0: float, alto: float) -> m3d.Manifold:
    return m3d.Manifold.extrude(cross_section(g), alto).translate((0, 0, z0))


def a_trimesh(man: m3d.Manifold) -> trimesh.Trimesh:
    mesh = man.to_mesh()
    return trimesh.Trimesh(np.asarray(mesh.vert_properties)[:, :3], np.asarray(mesh.tri_verts), process=True)


# ---------------------------------------------------------------- Principal
def main() -> int:
    ap = argparse.ArgumentParser(description="Imagen de Gemini -> placa 3D multicolor (3MF/STL)")
    ap.add_argument("imagen")
    ap.add_argument("--alto", type=float, default=60, help="alto total de la placa en mm (def. 60)")
    ap.add_argument("--nfc", type=float, default=20, help="diámetro del sticker NFC en mm; 0 = sin NFC (def. 20)")
    ap.add_argument("--max-colores", type=int, default=4, help="máximo de colores, incluye el negro (def. 4 = CFS)")
    ap.add_argument("--salida", help="carpeta de salida (def. junto a la imagen)")
    a = ap.parse_args()

    ruta = Path(a.imagen)
    img = cv2.imread(str(ruta), cv2.IMREAD_COLOR)
    if img is None:
        print(f"No pude abrir {ruta}")
        return 1
    salida = Path(a.salida) if a.salida else ruta.with_suffix("")
    salida.mkdir(parents=True, exist_ok=True)
    avisos: list[str] = []

    # Escala: ~25 px por mm para contornos suaves
    alto_px0 = img.shape[0]
    factor = max(1.0, 25 * a.alto / alto_px0)
    # (el alto real se recalcula con la silueta; primero trabajamos en px)
    if factor > 1:
        img = cv2.resize(img, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC)
    H, W = img.shape[:2]

    # 1. Paleta + fondo (=color que más toca el borde)
    paleta_lab = detectar_paleta(img, a.max_colores + 1)  # +1: el fondo blanco no cuenta como filamento
    etiqueta = clasificar(img, paleta_lab)
    borde = np.concatenate([etiqueta[0], etiqueta[-1], etiqueta[:, 0], etiqueta[:, -1]])
    i_fondo = int(np.bincount(borde, minlength=len(paleta_lab)).argmax())
    i_negro = int(np.argmin(paleta_lab[:, 0]))

    mascara_fondo_color = (etiqueta == i_fondo).astype(np.uint8)
    n, comp = cv2.connectedComponents(mascara_fondo_color, connectivity=4)
    ids_borde = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]]))) - {0}
    fondo = np.isin(comp, list(ids_borde))
    pieza = ~fondo
    pieza = cv2.morphologyEx(pieza.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)

    ys, xs = np.nonzero(pieza)
    alto_pieza_px = ys.max() - ys.min() + 1
    mm_px = a.alto / alto_pieza_px

    # 2. Agujero de la argolla: zona encerrada del color del fondo, redonda, de 2.5 a 14 mm
    agujeros = []
    for i in range(1, n):
        if i in ids_borde:
            continue
        m = (comp == i).astype(np.uint8)
        area = m.sum()
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        per = cv2.arcLength(cs[0], True)
        circ = 4 * math.pi * area / (per * per) if per else 0
        diam = 2 * math.sqrt(area / math.pi) * mm_px
        if circ > 0.75 and 1.0 <= diam <= 14:
            (cx, cy), _ = cv2.minEnclosingCircle(cs[0])
            agujeros.append((cx, cy, diam))
    if not agujeros:
        avisos.append("No encontré el agujero de la argolla. Revisa que la imagen tenga una argolla con hoyo redondo.")

    # 3. Polígonos por color (en mm)
    nombres = {}
    for i in range(len(paleta_lab)):
        bgr = cv2.cvtColor(paleta_lab[i].reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_LAB2BGR)[0, 0]
        nombres[i] = (nombre_color(bgr), "#%02X%02X%02X" % (bgr[2], bgr[1], bgr[0]))

    silueta = a_poligonos(pieza, mm_px, H).buffer(0.05).buffer(-0.05)
    for cx, cy, d in agujeros:
        d_final = max(d, AGUJERO_MIN)
        if d < AGUJERO_MIN:
            avisos.append(f"El agujero de la argolla medía {d:.1f} mm; lo agrandé a {AGUJERO_MIN} mm.")
        centro = Point(cx * mm_px, (H - cy) * mm_px)
        # refuerzo: anillo con pared mínima, unido a la silueta (si el dibujo la trae delgada)
        silueta = silueta.union(centro.buffer(d_final / 2 + PARED_ARGOLLA, 96))
        silueta = silueta.difference(centro.buffer(d_final / 2, 96))
    silueta = solo_grandes(silueta, 1.0)

    # Ancho original de las líneas negras
    ancho_antes = ancho_linea_mm((etiqueta == i_negro) & pieza, mm_px)

    # Zonas de color: se abren (quita astillas) y se encogen para engrosar lo negro
    engrosar = max(0.0, (LINEA_MIN - ancho_antes) / 2) if ancho_antes else 0.0
    zonas = {}
    for i in range(len(paleta_lab)):
        if i == i_negro:
            continue
        m = (etiqueta == i) & pieza
        if i == i_fondo:
            # el blanco encerrado (hueso, brillos) sí es material
            m &= ~fondo
        g = a_poligonos(m, mm_px, H)
        g = g.buffer(-(ZONA_MIN / 2 + engrosar)).buffer(ZONA_MIN / 2).intersection(silueta)
        g = solo_grandes(g, 0.6)
        if not g.is_empty and g.area > 0.5:
            zonas[i] = g
    union_zonas = unary_union(list(zonas.values())) if zonas else Polygon()
    negro = silueta.difference(union_zonas)

    # Si sobran colores (más de los que caben en el CFS), el más chico se vuelve el color más parecido
    while len(zonas) + 1 > a.max_colores:
        chico = min(zonas, key=lambda k: zonas[k].area)
        otros = [k for k in zonas if k != chico]
        dest = min(otros, key=lambda k: np.linalg.norm(paleta_lab[k] - paleta_lab[chico])) if otros else None
        avisos.append(f"Demasiados colores: '{nombres[chico][0]}' se imprime como '{nombres[dest][0] if dest is not None else 'negro'}'.")
        if dest is None:
            negro = negro.union(zonas.pop(chico))
        else:
            zonas[dest] = zonas[dest].union(zonas.pop(chico))

    # Medidas finales
    minx, miny, maxx, maxy = silueta.bounds
    ancho_mm, alto_mm = maxx - minx, maxy - miny
    ancho_despues = ancho_antes + 2 * engrosar
    if ancho_antes and ancho_antes < LINEA_MIN:
        avisos.append(
            f"Las líneas negras medían ~{ancho_antes:.2f} mm; las engrosé a ~{ancho_despues:.2f} mm para que salgan con boquilla de 0.4."
        )

    # 4. NFC: el punto más "adentro" de la pieza
    nfc = None
    if a.nfc > 0:
        esc = 10  # px por mm para buscar el centro
        mx = np.zeros((int(alto_mm * esc) + 4, int(ancho_mm * esc) + 4), np.uint8)
        sil_px = affinity.affine_transform(silueta, [esc, 0, 0, -esc, -minx * esc + 2, maxy * esc + 2])
        for p in (sil_px.geoms if hasattr(sil_px, "geoms") else [sil_px]):
            cv2.fillPoly(mx, [np.array(p.exterior.coords, np.int32)], 1)
            for h in p.interiors:
                cv2.fillPoly(mx, [np.array(h.coords, np.int32)], 0)
        dist = cv2.distanceTransform(mx, cv2.DIST_L2, 5)
        r_nec = (a.nfc + NFC_TOL) / 2 + NFC_PARED
        ok = dist >= r_nec * esc
        if ok.any():
            # entre los lugares donde cabe, el más cercano al centro de masa (cuelga mejor)
            c = silueta.centroid
            yy, xx = np.nonzero(ok)
            px = xx / esc + minx - 2 / esc
            py = maxy + 2 / esc - yy / esc
            k = np.argmin((px - c.x) ** 2 + (py - c.y) ** 2)
            nfc = (float(px[k]), float(py[k]))
        else:
            maxr = dist.max() / esc
            alto_min = math.ceil(a.alto * r_nec / maxr)
            avisos.append(
                f"El NFC de {a.nfc:.0f} mm NO cabe (espacio máximo Ø {max(0, 2 * (maxr - NFC_PARED) - NFC_TOL):.1f} mm). "
                f"Opciones: --alto {alto_min} (o más), o un NFC más chico (--nfc 20 / --nfc 15)."
            )

    # Inclinación al colgar
    if agujeros:
        cx, cy, _ = agujeros[0]
        ax_, ay_ = cx * mm_px, (H - cy) * mm_px
        c = silueta.centroid
        incl = math.degrees(math.atan2(c.x - ax_, ay_ - c.y))
        if abs(incl) > 5:
            avisos.append(f"Va a colgar inclinada ~{incl:.0f}°: la argolla no está arriba del centro de la placa.")
    else:
        incl = None

    # 5. 3D
    base = extruir(silueta, 0, BASE)
    if nfc:
        r = (a.nfc + NFC_TOL) / 2
        cil = m3d.Manifold.cylinder(NFC_Z1 - NFC_Z0, r, r, 128).translate((nfc[0], nfc[1], NFC_Z0))
        base = base - cil
    piezas = {}
    color_negro = nombres[i_negro]
    # Base + líneas negras = una sola pieza (mismo filamento)
    piezas[f"1_{color_negro[0]}"] = (base + extruir(negro, BASE, TAPA + RELIEVE), color_negro[1])
    for n_, (i, g) in enumerate(sorted(zonas.items(), key=lambda kv: -kv[1].area), start=2):
        nom, hexa = nombres[i]
        piezas[f"{n_}_{nom}"] = (extruir(g, BASE, TAPA), hexa)

    # Centrar en la cama
    dx, dy = -(minx + maxx) / 2, -(miny + maxy) / 2
    escena = trimesh.Scene()
    for nombre, (man, hexa) in piezas.items():
        t = a_trimesh(man.translate((dx, dy, 0)))
        rgb = [int(hexa[i : i + 2], 16) for i in (1, 3, 5)]
        t.visual.face_colors = rgb + [255]
        t.export(salida / f"{nombre}.stl")
        escena.add_geometry(t, node_name=nombre, geom_name=nombre)
    escena.export(salida / "placa.3mf")

    peso = sum(a_trimesh(m).volume for m, _ in piezas.values()) / 1000 * 1.24
    capa_pausa = round(NFC_Z1 / 0.2) + 1  # la pausa va ANTES de esta capa
    info = {
        "tamano_mm": [round(ancho_mm, 1), round(alto_mm, 1), BASE + TAPA + RELIEVE],
        "peso_aprox_g": round(peso, 1),
        "colores": {k: v for k, v in [(n.split("_", 1)[1], h) for n, (_, h) in piezas.items()]},
        "linea_negra_mm": round(ancho_despues, 2),
        "nfc": None if not nfc else {"diametro": a.nfc, "pausa_en_mm": NFC_Z1, "pausa_antes_de_capa": capa_pausa},
        "inclinacion_grados": None if incl is None else round(incl, 1),
        "avisos": avisos,
    }
    (salida / "info.json").write_text(json.dumps(info, ensure_ascii=False, indent=2))

    instr = [
        f"PLACA LISTA: {salida}",
        f"  Tamaño: {ancho_mm:.1f} x {alto_mm:.1f} x {BASE + TAPA + RELIEVE:.1f} mm  ·  ~{peso:.1f} g",
        "",
        "COLORES (asigna cada pieza a su ranura del CFS):",
    ]
    for nombre, (_, hexa) in piezas.items():
        instr.append(f"  - {nombre:28s} {hexa}")
    instr += [
        "",
        "EN CREALITY PRINT:",
        "  1. Abre placa.3mf. Si pregunta 'cargar como un objeto con varias partes', di que SÍ.",
        "  2. Asigna a cada parte su filamento (los nombres dicen el color).",
        "  3. Altura de capa 0.2 mm (primera capa 0.2). 3 paredes, relleno 15-20%.",
    ]
    if nfc:
        instr.append(
            f"  4. PAUSA para el NFC: ya rebanado, en la barra de capas ve a la capa {capa_pausa} ({capa_pausa * 0.2:.1f} mm), "
            "clic derecho en el '+' -> 'Agregar pausa'. La impresora se detiene antes de esa capa."
        )
        instr.append(f"     Cuando pause, pon el sticker NFC de {a.nfc:.0f} mm en el hueco (plano, sin doblar) y reanuda: queda sellado adentro.")
    instr.append("  5. Torre de purga activada (viene por defecto en multicolor). Los cambios de color solo ocurren arriba de 2 mm.")
    if avisos:
        instr += ["", "AVISOS:"] + [f"  ⚠ {x}" for x in avisos]
    texto = "\n".join(instr)
    (salida / "INSTRUCCIONES.txt").write_text(texto, encoding="utf-8")
    print(texto)

    capas2d = [(negro, BASE + TAPA + RELIEVE, color_negro[1])] + [
        (g, BASE + TAPA, nombres[i][1]) for i, g in zonas.items()
    ]
    vista_previa(silueta, capas2d, nfc, a.nfc, salida / "vista_previa.png")
    return 0


def vista_previa(silueta, capas2d, nfc, nfc_d, ruta: Path):
    """Imagen de cómo se verá: colores + sombreado del relieve + círculo punteado donde va el NFC."""
    esc = 20  # px por mm
    minx, miny, maxx, maxy = silueta.bounds
    w, h = int((maxx - minx) * esc) + 40, int((maxy - miny) * esc) + 40
    T = [esc, 0, 0, -esc, -minx * esc + 20, maxy * esc + 20]

    def mascara(g):
        m = np.zeros((h, w), np.uint8)
        g = affinity.affine_transform(g, T)
        for p in (g.geoms if hasattr(g, "geoms") else [g]):
            if p.is_empty:
                continue
            cv2.fillPoly(m, [np.round(np.array(p.exterior.coords)).astype(np.int32)], 1)
            for q in p.interiors:
                cv2.fillPoly(m, [np.round(np.array(q.coords)).astype(np.int32)], 0)
        return m.astype(bool)

    color = np.full((h, w, 3), 255, np.uint8)
    altura = np.zeros((h, w), np.float32)
    altura[mascara(silueta)] = BASE
    for g, z, hexa in capas2d:
        m = mascara(g)
        color[m] = tuple(int(hexa[k : k + 2], 16) for k in (5, 3, 1))
        altura[m] = z
    # sombreado tipo relieve (luz desde arriba a la izquierda)
    gy, gx = np.gradient(cv2.GaussianBlur(altura, (0, 0), 1.2))
    sombra = np.clip(1 + (gx * -0.9 + gy * -0.9) * 1.2, 0.45, 1.35)[..., None]
    img = np.clip(color.astype(np.float32) * sombra, 0, 255).astype(np.uint8)
    img[altura == 0] = (255, 255, 255)
    if nfc:
        c = (int((nfc[0] - minx) * esc + 20), int((maxy - nfc[1]) * esc + 20))
        r = int(nfc_d / 2 * esc)
        for k in range(0, 360, 12):
            cv2.ellipse(img, c, (r, r), 0, k, k + 6, (40, 40, 230), 3, cv2.LINE_AA)
    cv2.imwrite(str(ruta), img)


if __name__ == "__main__":
    sys.exit(main())
