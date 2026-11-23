"""Tótem "El Bolsillo" (Ajolote de Bolsillo), modelo paramétrico en build123d.

Convenciones
- Piezas planas (pilar, bolsillo, ajolote, manitas, burbujas, alga) se modelan en "vista frontal":
  X = derecha, Y = altura sobre el mostrador, Z = hacia el frente. Así quedan listas para imprimirse
  acostadas con la cara al frente hacia arriba.
- Base y botones se modelan ya parados (Z = arriba).
- Cada pieza es una lista de cuerpos (color, sólido). Los colores van en las capas de arriba.

Uso:  python3 totems/modelo/totem_bolsillo.py   → genera totems/salida/<nombre_pieza>/
"""
from __future__ import annotations

import json
import math
import pathlib

import segno
import yaml
from build123d import (Align, Axis, Box, Circle, Cylinder, Ellipse, Location, Part, Plane, Polygon,
                       Pos, Rectangle, RectangleRounded, Rot, SlotCenterToCenter, Sketch, Text,
                       chamfer, export_stl, extrude, import_svg, mirror, offset, scale)

ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = yaml.safe_load(open(ROOT / "config" / "totem_ajolote.yaml", encoding="utf-8"))
NEG = yaml.safe_load(open(ROOT / "config" / "negocio.yaml", encoding="utf-8"))
VENDOR = ROOT / "vendor"
FONT = str(VENDOR / "fonts" / "Fredoka-700.ttf")
FONT_SB = str(VENDOR / "fonts" / "Fredoka-600.ttf")
TOL = CFG["tolerancia"]
COL = CFG["colores"]
CC = (Align.CENTER, Align.CENTER)

# ---------------------------------------------------------------- geometría general (mm)
PIL_W, PIL_Y0, PIL_Y1, PIL_T = 166.0, 4.0, 190.0, 5.0      # pilar
BASE_TOP, SLOT_DEPTH = 12.0, 8.0
POCKET_T = 3.2                                               # bolsillo y cabeza (mismo plano)
POCKET = [(-53, 156), (73, 156), (73, 44), (10, 26), (-53, 44)]
HEAD_C, HEAD_RX, HEAD_RY, HEAD_CUT = (10.0, 172.0), 33.0, 26.0, 156.4
HANDS_X, HAND_Y = (-10.0, 30.0), 155.0
BUBBLES = [(-70, 148, 9), (-74, 124, 6.5), (-66, 106, 5), (-71, 84, 8), (-64, 64, 5.5), (-73, 44, 4.5)]
RELIEF, CAP = 0.6, 0.6
PEG_D, PEG_H, HOLE_DEPTH = 4.0, 1.8, 2.0


# ---------------------------------------------------------------- utilidades 2D
def fuse(items):
    items = [i for i in items if i is not None]
    if not items:
        return None
    out = items[0]
    for it in items[1:]:
        out = out + it
    return out


def lin(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def rounded_poly(pts, r, n=8):
    """Polígono con esquinas redondeadas (radio r) muestreando arcos."""
    out = []
    k = len(pts)
    for i in range(k):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % k]
        v1 = (p0[0] - p1[0], p0[1] - p1[1]); v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1 = (v1[0] / l1, v1[1] / l1); u2 = (v2[0] / l2, v2[1] / l2)
        ang = math.acos(max(-1, min(1, u1[0] * u2[0] + u1[1] * u2[1])))
        d = r / math.tan(ang / 2)
        a = (p1[0] + u1[0] * d, p1[1] + u1[1] * d)
        b = (p1[0] + u2[0] * d, p1[1] + u2[1] * d)
        for t in lin(0, 1, n):  # curva cuadrática a→p1→b (aprox. de arco)
            out.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * p1[0] + t * t * b[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * p1[1] + t * t * b[1]))
    return Polygon(*out, align=None)


def wire_points(sk, n=500):
    w = sk.faces()[0].outer_wire()
    return [(p.X, p.Y) for p in (w.position_at(i / n) for i in range(n))]


def dashes(pts, closed=True, width=1.2, dash=4.0, gap=2.5):
    """Costura punteada a lo largo de una polilínea."""
    segs = list(zip(pts, pts[1:] + ([pts[0]] if closed else [])))
    period, pos, out = dash + gap, 0.0, []
    for (x0, y0), (x1, y1) in segs:
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 1e-6:
            continue
        ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
        t = 0.0
        while t < L - 1e-9:
            ph = (pos + t) % period
            if ph < dash:
                run = min(dash - ph, L - t)
                if run > 0.8:
                    c = (x0 + (x1 - x0) * (t + run / 2) / L, y0 + (y1 - y0) * (t + run / 2) / L)
                    out.append(Pos(*c) * Rot(0, 0, ang) * Rectangle(run, width))
                t += run
            else:
                t += min(period - ph, L - t)
        pos += L
    return fuse(out)


def text(s, size, x, y, font=FONT):
    return Pos(x, y) * Text(s, font_size=size, font_path=font, align=CC)


def icon(name, size, x, y):
    faces = import_svg(VENDOR / "icons" / f"{name}.svg")
    sk = Sketch() + list(faces)
    bb = sk.bounding_box()
    sk = scale(sk, by=size / max(bb.size.X, bb.size.Y))
    bb = sk.bounding_box()
    return Pos(x - bb.center().X, y - bb.center().Y) * sk


def slab(sk, z0, h):
    return Pos(0, 0, z0) * extrude(sk, amount=h, dir=(0, 0, 1))


def holes(points, d, depth):
    return fuse([Pos(x, y, -0.01) * Cylinder(d / 2, depth + 0.01, align=(Align.CENTER, Align.CENTER, Align.MIN))
                 for x, y in points])


def pegs(points, d, h, z0):
    return fuse([Pos(x, y, z0) * Cylinder(d / 2, h, align=(Align.CENTER, Align.CENTER, Align.MIN))
                 for x, y in points])


# ---------------------------------------------------------------- QR
def qr_block(data, x0, ytop, label):
    mod, qz = CFG["qr_modulo_mm"], CFG["qr_zona_silenciosa"]
    m = segno.make(data, error=CFG["qr_correccion"], boost_error=False).matrix
    n = len(m)
    side = (n + 2 * qz) * mod
    lab_h = 8.0
    tile = Pos(x0 + side / 2, ytop - (side + lab_h) / 2) * RectangleRounded(side, side + lab_h, 2.0)
    rects = []
    for r, row in enumerate(m):
        c = 0
        while c < n:
            if row[c]:
                c2 = c
                while c2 < n and row[c2]:
                    c2 += 1
                w = (c2 - c) * mod
                rects.append(Pos(x0 + (qz + c) * mod + w / 2, ytop - (qz + r) * mod - mod / 2)
                             * Rectangle(w, mod + 0.02))
                c = c2
            else:
                c += 1
    mods = fuse(rects)
    lab = text(label, 5.5, x0 + side / 2, ytop - side - lab_h / 2 + 1.0)
    return tile, mods, lab, side


# ---------------------------------------------------------------- piezas 2D compartidas
def pillar_2d():
    cx, cy = 0, (PIL_Y0 + PIL_Y1) / 2
    return (Pos(cx, cy) * RectangleRounded(PIL_W, PIL_Y1 - PIL_Y0, 14)
            + Pos(0, PIL_Y0 + 30) * Rectangle(PIL_W, 60))


def pocket_2d():
    return rounded_poly(POCKET, 4.0)


def head_2d():
    hx, hy = HEAD_C
    head = Pos(hx, hy) * Ellipse(HEAD_RX, HEAD_RY)
    keep = Pos(hx, HEAD_CUT + 30) * Rectangle(200, 60)
    return head & keep


GILLS = [  # (lado, y raíz, ángulo°, largo)
    (s, y, a, l) for s in (-1, 1) for (y, a, l) in ((184, 30, 24), (175, 9, 26), (167, -6, 21))
]


def gill_shapes():
    hx, _ = HEAD_C
    outer, inner = [], []
    for s, y, a, l in GILLS:
        ang = a if s > 0 else 180 - a
        rx = hx + s * (HEAD_RX - 7)
        c = (rx + math.cos(math.radians(ang)) * l / 2, y + math.sin(math.radians(ang)) * l / 2)
        outer.append(Pos(*c) * Rot(0, 0, ang) * SlotCenterToCenter(l, 10))
        # flecos: 3 bolitas en el borde de arriba
        for t in (0.15, 0.5, 0.85):
            px = rx + math.cos(math.radians(ang)) * l * t
            py = y + math.sin(math.radians(ang)) * l * t
            nx, ny = -math.sin(math.radians(ang)) * s, math.cos(math.radians(ang)) * s
            if ny < 0:
                nx, ny = -nx, -ny
            outer.append(Pos(px + nx * 4.2, py + ny * 4.2) * Circle(3.0))
        ci = (rx + math.cos(math.radians(ang)) * (l / 2 + 3), y + math.sin(math.radians(ang)) * (l / 2 + 3))
        inner.append(Pos(*ci) * Rot(0, 0, ang) * SlotCenterToCenter(l - 10, 3.6))
    keep = Pos(hx, HEAD_CUT + 60) * Rectangle(300, 120)
    return fuse(outer) & keep, fuse(inner) & keep


def hand_2d(x):
    return (Pos(x, HAND_Y) * Ellipse(9.5, 6.8)
            + fuse([Pos(x + dx, HAND_Y + 5.6) * Circle(3.4) for dx in (-5.5, 0, 5.5)]))


def alga_2d():
    def blade(x_base, y0, y1, w0, amp, phase):
        left, right = [], []
        for y in lin(y0, y1, 40):
            t = (y - y0) / (y1 - y0)
            xc = x_base + amp * math.sin((y - y0) / 11 + phase)
            w = w0 * (1 - 0.72 * t) + 1.5
            left.append((xc - w / 2, y)); right.append((xc + w / 2, y))
        tip = left[-1][0] / 2 + right[-1][0] / 2, y1
        return Polygon(*(left + right[::-1]), align=None) + Pos(*tip) * Circle((right[-1][0] - left[-1][0]) / 2)
    stem = Pos(80.5, 32) * RectangleRounded(13, 34, 5)          # zona de pernos, queda tapada por las hojas
    b1 = blade(83, 15, 108, 17, 3.0, 0.0)
    b2 = blade(90, 15, 82, 13, 2.5, math.pi)
    b3 = blade(79, 15, 62, 12, 1.5, math.pi / 2)
    return (stem + b1 + b2 + b3) & (Pos(73.6 + 50, 100) * Rectangle(100, 200))


# pernos del pilar (dónde entra cada pieza)
PEGS_POCKET = [(-42, 140), (62, 140), (-42, 54), (62, 54)]
PEGS_HEAD = [(-6, 172), (26, 172)]
PEGS_BUBBLES = [(x, y) for x, y, _ in BUBBLES]
PEGS_ALGA = [(79.5, 24), (79.5, 44)]
ALGA_PEG_D = 3.0
HAND_PEG_D = 3.0


# ---------------------------------------------------------------- piezas
def pieza_pilar():
    base2d = pillar_2d()
    # costura perimetral (sin pasar por donde van montadas otras piezas ni dentro de la ranura)
    stitch_path = wire_points(offset(base2d, -5))
    keep_out = fuse([offset(pocket_2d(), 0.8), offset(head_2d(), 0.8), offset(alga_2d(), 0.8),
                     fuse([Pos(x, y) * Circle(r + 0.8) for x, y, r in BUBBLES]),
                     Pos(0, 0) * Rectangle(400, 2 * (BASE_TOP + 3))])
    st = dashes(stitch_path) - keep_out
    # espalda: texto incrustado, en espejo (se lee viéndolo por detrás)
    lines = CFG["espalda"]
    y = 140.0
    back = []
    back.append(icon("instagram", 14, 0, y + 12))
    for ln in lines:
        back.append(text(ln["texto"], ln["mm"], 0, y - ln["mm"] * 0.55))
        y -= ln["mm"] * 1.55
    back2d = mirror(fuse(back), about=Plane.YZ)
    body = slab(base2d, 0, PIL_T) - slab(back2d, -0.01, CAP + 0.01)
    body = body + pegs(PEGS_POCKET + PEGS_HEAD + PEGS_BUBBLES, PEG_D, PEG_H, PIL_T)
    body = body + pegs(PEGS_ALGA, ALGA_PEG_D, PEG_H, PIL_T)
    return [(COL["pilar"], body), (COL["costuras"], slab(st, PIL_T, RELIEF)),
            (COL["espalda_texto"], slab(back2d, 0, CAP))]


def pieza_bolsillo():
    p2 = pocket_2d()
    t = CFG["texto"]
    l1 = text(t["linea1"], t["linea1_mm"], 10, 139)
    l2 = text(t["linea2"], t["linea2_mm"], 10, 119)
    qrs = CFG["qr"]
    tiles, mods, labs, sides = [], [], [], []
    # dos QR lado a lado, centrados en el bolsillo
    tmp = [qr_block(q["url"], 0, 0, q["etiqueta"])[3] for q in qrs]
    gap = 6.0
    x = 10 - (sum(tmp) + gap * (len(tmp) - 1)) / 2
    for q, s in zip(qrs, tmp):
        tile, m, lab, side = qr_block(q["url"], x, 110, q["etiqueta"])
        tiles.append(tile); mods.append(m); labs.append(lab); sides.append(side)
        x += s + gap
    tiles2d = fuse(tiles)
    hands2d = fuse([hand_2d(x) for x in HANDS_X])
    hem = dashes([(-49, 150), (69, 150)], closed=False)
    st = fuse([dashes(wire_points(offset(p2, -3.5))), hem])
    st = st - fuse([offset(tiles2d, 1.2), offset(l1 + l2, 1.2), offset(hands2d, 0.8)])
    st = st & p2
    body = slab(p2, 0, POCKET_T) - holes(PEGS_POCKET, PEG_D + 2 * TOL, HOLE_DEPTH)
    body = body + pegs([(x, 152) for x in HANDS_X], HAND_PEG_D, 1.4, POCKET_T)
    return [(COL["bolsillo"], body), (COL["costuras"], slab(st, POCKET_T, RELIEF)),
            (COL["bolsillo_texto"], slab(l1 + l2, POCKET_T, 1.0)),
            (COL["qr_fondo"], slab(tiles2d, POCKET_T, RELIEF)),
            (COL["qr_modulos"], slab(fuse(mods) + fuse(labs), POCKET_T + RELIEF, RELIEF))], sides


def pieza_ajolote():
    hx, hy = HEAD_C
    head = head_2d()
    gills, inner = gill_shapes()
    gills_only = gills - head
    under = POCKET_T - CAP
    rosa = slab(head, 0, POCKET_T) + slab(gills_only, 0, under) + slab(inner - head, under, CAP)
    rosa = rosa - holes(PEGS_HEAD, PEG_D + 2 * TOL, HOLE_DEPTH)
    morado = slab(gills_only - inner, under, CAP)
    eyes = fuse([Pos(hx + s * 13, hy + 2) * Circle(5.5) for s in (-1, 1)])
    shine = fuse([Pos(hx + s * 13 + 1.8, hy + 4) * Circle(1.9) for s in (-1, 1)])
    mouth_pts = [(hx - 6 + 12 * i / 40, hy - 8 - 2.2 * abs(math.sin(math.pi * 2 * i / 40))) for i in range(41)]
    mouth = fuse([Pos(x, y) * Circle(0.75) for x, y in mouth_pts])
    negro = slab(eyes + mouth, POCKET_T, RELIEF)
    blanco = slab(shine, POCKET_T + RELIEF, 0.4)
    return [(COL["ajolote"], rosa), (COL["branquias"], morado), (COL["ojos"], negro), (COL["brillos"], blanco)]


def pieza_manita(x):
    h2 = hand_2d(x)
    lines = fuse([Pos(x + dx, HAND_Y + 4.5) * Rectangle(1.0, 5.0) for dx in (-2.75, 2.75)])
    body = slab(h2, 0, 3.0) - holes([(x, 152)], HAND_PEG_D + 2 * TOL, 1.6)
    return [(COL["ajolote"], body), (COL["ojos"], slab(lines, 3.0, 0.4))]


def pieza_burbujas():
    out = []
    for x, y, r in BUBBLES:
        d = Pos(x, y) * Circle(r)
        shine = (Pos(x, y) * Circle(r * 0.72)) - (Pos(x + r * 0.18, y - r * 0.18) * Circle(r * 0.72))
        b = slab(d, 0, POCKET_T) - holes([(x, y)], PEG_D + 2 * TOL, HOLE_DEPTH)
        b = b - slab(shine, POCKET_T - 0.6, 0.61)
        out.append(b)
    return [(COL["burbujas"], fuse(out))]


def pieza_alga():
    a = alga_2d()
    vein_pts = [(82 + 3.0 * math.sin((y - 15) / 11), y) for y in lin(28, 100, 34)]
    vein = fuse([Pos(x, y) * Circle(0.7) for x, y in vein_pts]) & a
    body = slab(a, 0, POCKET_T) - holes(PEGS_ALGA, ALGA_PEG_D + 2 * TOL, HOLE_DEPTH)
    body = body - slab(vein, POCKET_T - 0.6, 0.61)
    return [(COL["alga"], body)]


def pieza_base():
    w, d = 190.0, 74.0
    y_front = -(d - 13.2)
    b2 = Pos(0, (13.2 + y_front) / 2) * RectangleRounded(w, d, 12)
    body = slab(b2, 0, BASE_TOP)
    slot = Pos(0, PIL_T / 2, BASE_TOP - SLOT_DEPTH) * Box(PIL_W + 2 * TOL, PIL_T + 2 * TOL, SLOT_DEPTH + 1,
                                                       align=(Align.CENTER, Align.CENTER, Align.MIN))
    body = body - slot
    bd, dep = CFG["boton_diametro"], CFG["hueco_boton_profundo"]
    for x in BUTTON_X:
        body = body - Pos(x, BUTTON_Y, BASE_TOP - dep) * Cylinder(bd / 2 + TOL, dep + 1, align=(Align.CENTER, Align.CENTER, Align.MIN))
        body = body - Pos(x, BUTTON_Y, -1) * Cylinder(3, BASE_TOP + 2, align=(Align.CENTER, Align.CENTER, Align.MIN))
    lab = text(CFG["base_texto"], 7, 0, y_front + 7.5)
    return [(COL["base"], body), (COL["base_texto"], slab(lab, BASE_TOP, RELIEF))]


BUTTON_X = (-52.0, 0.0, 52.0)
BUTTON_Y = -30.0


def pieza_boton(cfg):
    bd, bh = CFG["boton_diametro"], CFG["boton_alto"]
    cav_d = CFG["tag_nfc_diametro"] + 0.6
    body = Cylinder(bd / 2, bh, align=(Align.CENTER, Align.CENTER, Align.MIN))
    body = chamfer(body.edges().group_by(Axis.Z)[-1], 0.8)
    body = body - Pos(0, 0, -0.01) * Cylinder(cav_d / 2, bh - 1.2 + 0.01, align=(Align.CENTER, Align.CENTER, Align.MIN))
    ic = icon(cfg["icono"], 17, 0, 0)
    return [(cfg["color"], body), (COL["icono_boton"], slab(ic, bh, RELIEF))]


# ---------------------------------------------------------------- ensamble
def stand(part, back_y):
    """Pieza en vista frontal → parada, con su espalda en y = back_y (el frente mira a -Y)."""
    return Pos(0, back_y, 0) * Rot(90, 0, 0) * part


def construir():
    pocket, qr_sides = pieza_bolsillo()
    piezas = {
        "1_pilar": dict(placa=1, cuerpos=pieza_pilar(), back=PIL_T, plana=True),
        "2_bolsillo": dict(placa=2, cuerpos=pocket, back=0.0, plana=True),
        "3_ajolote": dict(placa=3, cuerpos=pieza_ajolote(), back=0.0, plana=True),
        "3_manita_izq": dict(placa=3, cuerpos=pieza_manita(HANDS_X[0]), back=-POCKET_T, plana=True),
        "3_manita_der": dict(placa=3, cuerpos=pieza_manita(HANDS_X[1]), back=-POCKET_T, plana=True),
        "3_burbujas": dict(placa=3, cuerpos=pieza_burbujas(), back=0.0, plana=True),
        "3_alga": dict(placa=3, cuerpos=pieza_alga(), back=0.0, plana=True),
        "4_base": dict(placa=4, cuerpos=pieza_base(), plana=False),
    }
    for i, b in enumerate(CFG["botones_nfc"]):
        piezas[f"5_boton_{b['icono']}"] = dict(placa=5, cuerpos=pieza_boton(b), plana=False,
                                                 pos=(BUTTON_X[i], BUTTON_Y, BASE_TOP - CFG["hueco_boton_profundo"]))
    return piezas, qr_sides


def main():
    piezas, qr_sides = construir()
    out = ROOT / "salida" / CFG["nombre_pieza"]
    (out / "stl").mkdir(parents=True, exist_ok=True)
    (out / "ensamble").mkdir(parents=True, exist_ok=True)
    manifest, resumen = [], {}
    for nombre, p in piezas.items():
        vistos = {}
        for color, solid in p["cuerpos"]:
            if solid is None:
                continue
            vistos[color] = vistos.get(color, 0) + 1
            fn = f"{nombre}__{color}.stl" if vistos[color] == 1 else f"{nombre}__{color}_{vistos[color]}.stl"
            print("exportando", fn, flush=True)
            export_stl(solid, str(out / "stl" / fn), tolerance=0.02, angular_tolerance=0.15)
            if p["plana"]:
                placed = stand(solid, p["back"])
            else:
                placed = Pos(*p.get("pos", (0, 0, 0))) * solid
            export_stl(placed, str(out / "ensamble" / fn), tolerance=0.02, angular_tolerance=0.15)
            bb = solid.bounding_box()
            manifest.append(dict(archivo=f"ensamble/{fn}", pieza=nombre, color=color,
                                 hex=NEG["filamentos_pla"][color]))
            r = resumen.setdefault(nombre, dict(placa=p["placa"], colores=[], volumen_mm3=0.0,
                                                caja_mm=None))
            r["colores"].append(color)
            r["volumen_mm3"] += solid.volume
        # caja total de la pieza (impresión)
        bbs = [s.bounding_box() for _, s in p["cuerpos"] if s is not None]
        lo = [min(getattr(b.min, a) for b in bbs) for a in "XYZ"]
        hi = [max(getattr(b.max, a) for b in bbs) for a in "XYZ"]
        resumen[nombre]["caja_mm"] = [round(h - l, 1) for l, h in zip(lo, hi)]
        resumen[nombre]["min_mm"] = [round(v, 1) for v in lo]
        resumen[nombre]["max_mm"] = [round(v, 1) for v in hi]
    json.dump(manifest, open(out / "manifest.json", "w"), indent=1, ensure_ascii=False)
    json.dump(dict(piezas=resumen, qr_lados_mm=qr_sides), open(out / "resumen.json", "w"), indent=1,
              ensure_ascii=False)
    print(json.dumps(resumen, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
