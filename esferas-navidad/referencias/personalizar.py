#!/usr/bin/env python3
"""
Personaliza los 5 diseños de referencia (MakerWorld, con licencia comercial del
usuario) con cualquier nombre en Pacifico y los acomoda en planchas de 260x260.

    python3 personalizar.py                                   # 1 de cada diseño, nombres de ejemplo
    python3 personalizar.py --nombres "Ana,Luis,Ximena"       # reparte los diseños en ciclo
    python3 personalizar.py --nombres "Ana,Luis" --diseno copo_grande

Diseños: mono_pino, nombre_cruzado, ornamento_vertical, gorrito, copo_grande
Los 3MF originales van en ./originales/ (no se suben al repo).
"""
import argparse, os, re, subprocess, sys, tempfile, unicodedata
import numpy as np
import trimesh
from shapely.geometry import Polygon, MultiPolygon, box, LineString
from shapely.ops import unary_union
from shapely import affinity

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(0, os.path.dirname(AQUI))
from leer_3mf import leer
from render2d import dibujar

FUENTE = os.path.join(os.path.dirname(AQUI), "fuentes", "Pacifico-Regular.ttf")
ORIG = os.path.join(AQUI, "originales")
SALIDA = os.path.join(AQUI, "salida")
ROJO, BLANCO = "#C1121F", "#F4F1EA"
CAMA, BORDE, SEP = 260.0, 5.0, 5.0
TAM_MAX = 18.0   # tamaño de letra máximo (nombres muy cortos)
EJEMPLO = ["Ana", "Carlos", "Sofía", "Mateo", "Valentina"]

# role: base (se deja igual) | corte (capa base con el texto viejo fundido: se recorta y se
# funde el nombre nuevo) | texto (letras) | contorno (letras + margen d) | igual (decoración)
DISENOS = {
    "mono_pino": dict(archivo="pallinacustom.3mf", obj=0, colas=False, angulo=0,
                      partes={"1": ("base", BLANCO), "2": ("texto", ROJO)}),
    "nombre_cruzado": dict(archivo="Esferapersonalizada2.3mf", obj=0, colas=True, angulo=None,
                           cola_en_texto=True,
                           partes={"1": ("base", ROJO), "2": ("texto", ROJO)}),
    "ornamento_vertical": dict(archivo="ornamentos_gratidao_saude_paz_v5.3mf", obj=0, colas=True,
                               angulo=-90, alto_extra=1.25, solo=["1", "2", "3", "4", "5"],
                               partes={"1": ("corte", BLANCO), "2": ("corte", BLANCO),
                                       "3": ("igual", BLANCO), "4": ("igual", BLANCO),
                                       "5": ("texto", ROJO)}),
    "gorrito": dict(archivo="Esferaspersonalizables.3mf", obj=0, colas=True, angulo=None,
                    partes={"1": ("base", ROJO), "2": ("contorno", ROJO), "3": ("texto", BLANCO)}),
    "copo_grande": dict(archivo="Bolahielopersonalizable.3mf", obj=0, colas=False, angulo=0,
                        partes={"1": ("base", ROJO), "2": ("texto", BLANCO)}),
}


# ------------------------------------------------------------------ geometría 2D
def a_poligono(geom):
    if geom.is_empty:
        return geom
    return unary_union([g for g in getattr(geom, "geoms", [geom]) if g.area > 0.05])


def huella(malla):
    """Proyección XY de una malla (unión de caras que miran hacia arriba)."""
    sel = malla.face_normals[:, 2] > 0.5
    tris = malla.vertices[malla.faces[sel]][:, :, :2]
    return unary_union([Polygon(t).buffer(0.01) for t in tris if Polygon(t).area > 1e-6]).buffer(-0.01)


def corte_z(malla, z):
    s = malla.section(plane_origin=[0, 0, z], plane_normal=[0, 0, 1])
    if s is None:
        return Polygon()
    p2, _ = s.to_2D(to_2D=np.eye(4))
    return unary_union(p2.polygons_full).buffer(0)


def texto2d(nombre):
    """Nombre en Pacifico (tamaño 10, línea base en y=0) como polígonos shapely."""
    with tempfile.TemporaryDirectory() as d:
        sc = os.path.join(d, "t.scad")
        open(sc, "w", encoding="utf-8").write(
            f'use <{FUENTE}>\ntext("{nombre}", size=10, font="Pacifico");\n')
        svg = os.path.join(d, "t.svg")
        subprocess.run(["openscad", "-o", svg, sc], capture_output=True)
        s = open(svg).read()
    anillos = []
    for sub in re.split(r"(?=M )", re.search(r'd="(.*?)"', s, re.S).group(1)):
        pts = re.findall(r"(-?[\d.e+-]+),(-?[\d.e+-]+)", sub)
        if len(pts) >= 3:
            anillos.append(Polygon([(float(x), -float(y)) for x, y in pts]).buffer(0))
    g = Polygon()
    for a in anillos:          # par-impar: los huecos de las letras se restan solos
        g = g.symmetric_difference(a)
    return g.buffer(0)


def rect_orientado(geom, angulo=None):
    """centro, ángulo del eje largo, largo, alto del texto viejo."""
    if angulo is None:
        r = geom.minimum_rotated_rectangle
        c = list(r.exterior.coords)[:4]
        lados = [(np.hypot(c[i+1][0]-c[i][0], c[i+1][1]-c[i][1]),
                  np.degrees(np.arctan2(c[i+1][1]-c[i][1], c[i+1][0]-c[i][0]))) for i in range(2)]
        largo, ang = max(lados)
        ang = (ang + 90) % 180 - 90
    else:
        ang = angulo
    loc = affinity.rotate(geom, -ang, origin=geom.centroid)
    x0, y0, x1, y1 = loc.bounds
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cen = affinity.rotate(Polygon([(cx, cy), (cx + .1, cy), (cx, cy + .1)]), ang,
                          origin=geom.centroid).exterior.coords[0]
    return cen, ang, x1 - x0, y1 - y0


def ancho_aro(capa, exterior):
    """Ancho del aro: mayor w para el que la franja exterior está ~llena."""
    lo, hi = 0.8, 10.0
    for _ in range(25):
        w = (lo + hi) / 2
        anillo = exterior.difference(exterior.buffer(-w))
        ok = capa.intersection(anillo).area / anillo.area > 0.93
        lo, hi = (w, hi) if ok else (lo, w)
    return lo


def poner_nombre(nombre, viejo, angulo, exterior, colas, interior, alto_extra=1.0):
    """Nombre nuevo escalado y girado al lugar del texto viejo (+ colitas)."""
    cen, ang, L, H = rect_orientado(viejo, angulo)
    if colas:   # el nombre no debe montarse en el aro: cabe en la cuerda interior
        u = np.array([np.cos(np.radians(ang)), np.sin(np.radians(ang))])
        eje = LineString([tuple(np.array(cen) - 300 * u), tuple(np.array(cen) + 300 * u)])
        cuerda = eje.intersection(interior)
        segs = [g for g in getattr(cuerda, "geoms", [cuerda]) if g.distance(
            Polygon([(cen[0]-.1, cen[1]-.1), (cen[0]+.1, cen[1]-.1), (cen[0], cen[1]+.1)])) < 1]
        if segs:
            L = min(L, segs[0].length - 4)
    t = texto2d(nombre)
    x0, y0, x1, y1 = t.bounds
    s = min(L / (x1 - x0), H * alto_extra / (y1 - y0))
    s = min(s, TAM_MAX / 10)
    t = affinity.scale(t, s, s, origin=(0, 0))
    x0, y0, x1, y1 = t.bounds
    cola = Polygon()
    if colas:
        # barra a la altura de la unión de las letras cursivas, solo fuera del texto
        yb, gw = 0.06 * 10 * s, max(2.2, 0.16 * 10 * s)
        barra = box(-400, yb, 400, yb + gw)
        hueco = box(x0 + 4, -400, x1 - 4, 400)
        cola = barra.difference(hueco)
    def colocar(g):
        g = affinity.translate(g, -(x0 + x1) / 2, -(y0 + y1) / 2)
        g = affinity.rotate(g, ang, origin=(0, 0))
        return affinity.translate(g, cen[0], cen[1])
    t, cola = colocar(t), colocar(cola)
    if colas:
        # la cola se queda dentro de la silueta y no pisa el texto por dentro del aro
        cola = cola.intersection(exterior.buffer(-0.8))
        # quitar trocitos sueltos que no tocan ni el texto ni el aro
        cola = unary_union([g for g in getattr(cola, "geoms", [cola])
                            if g.distance(t) < 1.5])
    return t, cola, 10 * s


def unir_islas(geom, ancho=1.4):
    """Pega con un puentecito cada isla suelta (acentos, puntos de i, tilde de ñ)."""
    from shapely.ops import nearest_points
    geom = a_poligono(geom.buffer(0))
    partes = sorted(getattr(geom, "geoms", [geom]), key=lambda g: -g.area)
    if len(partes) < 2:
        return geom
    cuerpo = partes[0]
    for isla in partes[1:]:
        a, b = nearest_points(isla, cuerpo)
        puente = LineString([a, b]).buffer(ancho / 2, cap_style=1)
        cuerpo = unary_union([cuerpo, isla, puente])
    return cuerpo


def prisma(geom, z0, z1):
    geom = a_poligono(geom.buffer(0))
    piezas = []
    for g in getattr(geom, "geoms", [geom]):
        if g.area < 0.05:
            continue
        m = trimesh.creation.extrude_polygon(g, z1 - z0)
        m.apply_translation([0, 0, z0])
        piezas.append(m)
    return trimesh.util.concatenate(piezas)


def personalizar(diseno, nombre):
    cfg = DISENOS[diseno]
    e = leer(os.path.join(ORIG, cfg["archivo"]))[cfg["obj"]]
    partes = [p for p in e["partes"] if p["id"] in cfg["partes"]]
    if cfg.get("solo"):
        partes = [p for p in partes if p["id"] in cfg["solo"]]
    rol = {p["id"]: cfg["partes"][p["id"]][0] for p in partes}
    col = {p["id"]: cfg["partes"][p["id"]][1] for p in partes}
    # recentrar en el origen
    todo = trimesh.util.concatenate([p["malla"] for p in partes])
    c = (todo.bounds[0] + todo.bounds[1]) / 2
    for p in partes:
        p["malla"].apply_translation([-c[0], -c[1], -todo.bounds[0][2]])

    textos = [p for p in partes if rol[p["id"]] == "texto"]
    viejo = unary_union([huella(p["malla"]) for p in textos])
    capa_base = next(p for p in partes if rol[p["id"]] in ("base", "corte"))
    zb = capa_base["malla"].bounds
    base2d = corte_z(capa_base["malla"], (zb[0][2] + zb[1][2]) / 2)
    exterior = Polygon(max(getattr(base2d, "geoms", [base2d]), key=lambda g: g.area).exterior)
    w = ancho_aro(base2d, exterior)
    interior = exterior.buffer(-w)
    nuevo, cola, tam = poner_nombre(nombre, viejo, cfg["angulo"], exterior, cfg["colas"], interior,
                                    cfg.get("alto_extra", 1.0))

    salida = []
    for p in partes:
        r, m = rol[p["id"]], p["malla"]
        z0, z1 = m.bounds[0][2], m.bounds[1][2]
        if r in ("base", "igual"):
            nm = m
        elif r == "corte":
            g = corte_z(m, (z0 + z1) / 2)
            g = g.difference(viejo.buffer(0.6).intersection(interior))
            nm = prisma(unir_islas(unary_union([g, nuevo, cola])), z0, z1)
        elif r == "texto":
            if cfg.get("cola_en_texto"):   # el nombre es parte de la estructura: puentes al aro/letras
                tc = unary_union([nuevo, cola])
                puentes = unir_islas(unary_union([tc, base2d])).difference(base2d).difference(tc)
                nm = prisma(unary_union([tc, puentes]), z0, z1)
            else:
                nm = prisma(nuevo, z0, z1)
        elif r == "contorno":
            d = 0
            delta = huella(m).area
            # margen del contorno viejo respecto a sus letras
            for dd in np.arange(0.5, 5, 0.1):
                if viejo.buffer(dd).area >= delta:
                    d = dd; break
            nm = prisma(unary_union([nuevo.buffer(d, join_style=1), cola.buffer(d * 0.6)]), z0, z1)
        salida.append(dict(nombre=f"{p['nombre'] or r}", rol=r, color=col[p["id"]], malla=nm))
    # comprobación: ¿todo queda en una sola pieza?
    huellas = unary_union([corte_z(s["malla"], (s["malla"].bounds[0][2] + s["malla"].bounds[1][2]) / 2)
                           for s in salida if s["rol"] != "igual"]).buffer(0.05)
    n = len(getattr(huellas, "geoms", [huellas]))
    return salida, dict(tam=tam, piezas_sueltas=n - 1, aro=w)


# ------------------------------------------------------------------ planchas
def acomodar(items):
    """Empaque por renglones con primer-ajuste. items: (ancho, alto). -> placas de (i, cx, cy)"""
    util = CAMA - 2 * BORDE
    placas = []          # cada placa: lista de renglones [y, alto, x_libre, [(i,cx,cy)]]
    for i, (w, h) in sorted(enumerate(items), key=lambda t: (-t[1][1], -t[1][0])):
        puesto = False
        for pl in placas:
            for r in pl:
                if h <= r[1] + 0.01 and r[2] + w <= util:
                    r[3].append((i, BORDE + r[2] + w / 2, BORDE + r[0] + r[1] / 2))
                    r[2] += w + SEP; puesto = True; break
            if puesto: break
            y = sum(r[1] + SEP for r in pl)
            if y + h <= util:
                pl.append([y, h, w + SEP, [(i, BORDE + w / 2, BORDE + y + h / 2)]]); puesto = True; break
        if not puesto:
            placas.append([[0, h, w + SEP, [(i, BORDE + w / 2, BORDE + h / 2)]]])
    return [[c for r in pl for c in r[3]] for pl in placas]


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_").lower()


def main():
    from generar import escribir_3mf
    ap = argparse.ArgumentParser()
    ap.add_argument("--nombres")
    ap.add_argument("--diseno", choices=list(DISENOS))
    a = ap.parse_args()
    nombres = [n.strip() for n in a.nombres.split(",")] if a.nombres else EJEMPLO
    disenos = [a.diseno] * len(nombres) if a.diseno else \
        [list(DISENOS)[i % len(DISENOS)] for i in range(len(nombres))]
    os.makedirs(os.path.join(SALIDA, "stl"), exist_ok=True)
    piezas = []
    for n, d in zip(nombres, disenos):
        partes, info = personalizar(d, n)
        aviso = "" if info["piezas_sueltas"] == 0 else f"  ¡OJO! {info['piezas_sueltas']} parte(s) suelta(s)"
        print(f"  {d:<19} {n:<12} letra {info['tam']:.1f} mm{aviso}")
        b = trimesh.util.concatenate([p["malla"] for p in partes]).bounds
        piezas.append(dict(nombre=n, diseno=d, partes=partes, tam=(b[1][0]-b[0][0], b[1][1]-b[0][1])))
        for k, p in enumerate(partes):
            p["stl"] = os.path.join(SALIDA, "stl", f"{d}_{slug(n)}_{k}_{p['rol']}.stl")
            p["malla"].export(p["stl"])
    for ip, placa in enumerate(acomodar([p["tam"] for p in piezas]), 1):
        objs = [dict(nombre=f"{piezas[i]['diseno']}_{slug(piezas[i]['nombre'])}", pos=(x, y),
                     partes=[(p["nombre"], p["stl"], p["color"]) for p in piezas[i]["partes"]])
                for i, x, y in placa]
        ruta = os.path.join(SALIDA, f"plancha_{ip}.3mf")
        escribir_3mf(ruta, objs)
        grupos = []
        for i, x, y in placa:
            for p in sorted(piezas[i]["partes"], key=lambda q: q["malla"].bounds[1][2]):
                m = p["malla"].copy(); m.apply_translation([x, y, 0]); grupos.append((m, p["color"]))
        dibujar(grupos, os.path.join(SALIDA, f"plancha_{ip}.png"), f"Plancha {ip}",
                tam=8, limites=((0, CAMA), (0, CAMA)))
        print(f"  {os.path.basename(ruta)}: {len(placa)} esferas")


if __name__ == "__main__":
    main()
