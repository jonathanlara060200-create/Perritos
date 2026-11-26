#!/usr/bin/env python3
"""
Esferas ARMABLES con guía: la esfera lleva huecos y el nombre lleva botones (pernos)
atrás que embonan con 0.2 mm de holgura por lado.

    python3 armable.py --nombres "Toeva,Daniela,Jonathan,Alma"
    python3 armable.py --nombres "Ana,Luis" --diseno gorrito

- Diseños donde el nombre cruza el aro (nombre_cruzado, ornamento_vertical, gorrito):
  los huecos van en el aro, SIEMPRE en el mismo lugar -> la esfera es de stock.
- Diseños con franja (mono_pino, copo_grande): los botones van escondidos bajo las letras,
  así que los huecos dependen del nombre -> esfera hecha para ese nombre.
- Nombres: se imprimen BOCA ABAJO (frente con textura PEI) con los botones hacia arriba.
"""
import argparse, os, sys
import numpy as np
import trimesh
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import unary_union
from shapely import affinity

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI); sys.path.insert(0, os.path.dirname(AQUI))
import personalizar as P
import modular as M
from tres_mf import escribir_3mf
from render2d import dibujar

SALIDA = os.path.join(AQUI, "salida_armable")
HOLGURA = 0.2          # por lado
PERNO_MAX = 2.0        # diámetro máx. del botón
PARED_MIN = 0.8        # pared mínima alrededor del hueco
ESP_NOMBRE = 2.0
INLAY = 0.6            # gorrito: letras blancas incrustadas a ras (3 capas)
RADIO_PATA = 2.6       # patita redonda donde va el botón en los diseños de aro
ORDEN_PRUEBA = ["mono_pino", "nombre_cruzado", "gorrito", "copo_grande", "ornamento_vertical"]


def grosor_local(pr, pt):
    """Altura de la esfera en un punto (para saber qué tan hondo puede ir el hueco)."""
    z = 0.0
    for s in pr["esfera"]:
        m = s["malla"]
        z0, z1 = m.bounds[0][2], m.bounds[1][2]
        if P.corte_z(m, (z0 + z1) / 2).contains(pt):
            z = max(z, z1)
    return z


def puntos_en_aro(pr, cen, ang):
    """Dos puntos fijos sobre el aro, sobre el eje del nombre (no dependen del nombre)."""
    u = np.array([np.cos(np.radians(ang)), np.sin(np.radians(ang))])
    banda = pr["exterior"].difference(pr["interior"])
    pts = []
    for sgn in (-1, 1):
        rayo = LineString([tuple(cen), tuple(np.array(cen) + sgn * 300 * u)])
        inter = rayo.intersection(banda)
        segs = sorted(getattr(inter, "geoms", [inter]), key=lambda g: g.distance(Point(cen)))
        if segs and not segs[0].is_empty:
            pts.append(segs[0].centroid)
    return pts


def puntos_en_letras(nuevo, base_ok, d_perno, ang):
    """Dos puntos lo más separados posible, escondidos dentro de las letras."""
    zona = nuevo.buffer(-(d_perno / 2 + 0.35)).intersection(base_ok)
    if zona.is_empty or zona.area < 0.05:
        return []
    x0, y0, x1, y1 = zona.bounds
    xs, ys = np.meshgrid(np.arange(x0, x1, 0.25), np.arange(y0, y1, 0.25))
    cand = [Point(x, y) for x, y in zip(xs.ravel(), ys.ravel())]
    from shapely.prepared import prep
    zp = prep(zona)
    cand = [p for p in cand if zp.contains(p)]
    if len(cand) < 2:
        return []
    u = np.array([np.cos(np.radians(ang)), np.sin(np.radians(ang))])
    proy = np.array([p.x * u[0] + p.y * u[1] for p in cand])
    a, b = cand[int(proy.argmin())], cand[int(proy.argmax())]
    return [a, b] if a.distance(b) > 8 else []


def reparar(m):
    m = m.copy()
    m.merge_vertices()
    m.update_faces(m.nondegenerate_faces())
    m.update_faces(m.unique_faces())
    m.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(m)
    return m


def restar(m, cortes):
    """Resta los huecos; si la malla no es volumen cerrado la repara primero."""
    for intento in (m, reparar(m)):
        try:
            r = trimesh.boolean.difference([intento] + cortes, engine="manifold")
            if r.is_volume:
                return r
        except Exception:
            pass
    raise RuntimeError("no se pudo hacer el hueco")


def cilindro(pt, d, z0, z1):
    c = trimesh.creation.cylinder(radius=d / 2, height=z1 - z0, sections=40)
    c.apply_translation([pt.x, pt.y, (z0 + z1) / 2])
    return c


# grosor al aplanar los diseños que traían relieve (para imprimirlos boca abajo)
GROSOR_PLANO = {"nombre_cruzado": 3.0, "ornamento_vertical": 2.0}


def aplanada(diseno):
    """Copia del diseño con la esfera 100% plana: todo boca abajo contra la PEI."""
    pr = dict(M.preparar(diseno))
    if pr["plana"]:
        return pr
    huella = unary_union([P.corte_z(s["malla"], (s["malla"].bounds[0][2] + s["malla"].bounds[1][2]) / 2)
                          for s in pr["esfera"]]).buffer(0.05).buffer(-0.05)
    t = GROSOR_PLANO.get(diseno, 2.5)
    pr["esfera"] = [dict(nombre=f"{diseno}_plana", color=pr["esfera"][0]["color"],
                         malla=P.prisma(huella, 0, t))]
    pr["plana"], pr["top"] = True, t
    return pr


def armar(diseno, nombre):
    pr = aplanada(diseno)
    cfg = pr["cfg"]
    nuevo, cola, tam = P.poner_nombre(nombre, pr["viejo"], cfg["angulo"], pr["exterior"],
                                      cfg["colas"], pr["interior"], cfg.get("alto_extra", 1.0))
    cen, ang, _, _ = P.rect_orientado(pr["viejo"], cfg["angulo"])
    w = P.ancho_aro(pr["base2d"], pr["exterior"])
    patas = []
    if cfg["colas"]:
        hueco_d = min(PERNO_MAX + 2 * HOLGURA, w - 2 * PARED_MIN)
        pts = puntos_en_aro(pr, cen, ang)
        # patita redonda en el punto fijo, unida a la colita del nombre
        banda = pr["exterior"].difference(pr["interior"])
        cola_aro = cola.intersection(banda)
        for p in pts:
            circ = p.buffer(RADIO_PATA).intersection(pr["exterior"].buffer(-0.3))
            trozo = [g for g in getattr(cola_aro, "geoms", [cola_aro]) if g.distance(p) < 8]
            pata = unary_union([circ] + [t.buffer(0.6) for t in trozo]).buffer(1.2).buffer(-1.2)
            patas.append(pata.intersection(pr["exterior"].buffer(-0.3)))
        stock = True
    else:
        base_ok = pr["base2d"].buffer(-(PERNO_MAX / 2 + HOLGURA + PARED_MIN))
        pts = []
        for d in (2.0, 1.8, 1.6, 1.4, 1.2):
            pts = puntos_en_letras(nuevo, base_ok, d, ang)
            if pts:
                hueco_d = d + 2 * HOLGURA
                break
        stock = False
    perno_d = hueco_d - 2 * HOLGURA

    # ---- profundidad de huecos / largo de botones
    huecos, pernos, z_nombre = [], [], 0
    for p in pts:
        t = grosor_local(pr, p)
        z_nombre = max(z_nombre, t)
        prof = t if t < 1.6 else min(t - 0.6, 2.2)       # aro delgado: hueco pasado
        huecos.append((p, prof, t))
    largo = min(h[1] for h in huecos) - 0.3 if huecos else 0

    # ---- ESFERA con huecos (en posición armada: frente hacia +z)
    esfera = []
    for s in pr["esfera"]:
        m = s["malla"]
        z0, z1 = m.bounds[0][2], m.bounds[1][2]
        cortes = [cilindro(p, hueco_d, t - prof, z1 + 1) for p, prof, t in huecos
                  if P.corte_z(m, (z0 + z1) / 2).contains(p) or z0 >= t - prof - 1e-6]
        if cortes:
            m = restar(m, cortes)
        esfera.append(dict(s, malla=m))

    # ---- NOMBRE (posición armada: atrás en z=0, frente en z=ESP; botones hacia -z)
    forma = P.unir_islas(unary_union([nuevo, cola] + patas))
    if diseno == "gorrito":
        dd = pr["cont_d"] or 2.8
        forma = P.unir_islas(unary_union([nuevo.buffer(dd, join_style=1), cola.buffer(dd * 0.6)] + patas))
        partes = [dict(nombre="contorno", color=P.ROJO, malla=trimesh.util.concatenate([
                      P.prisma(forma, 0, ESP_NOMBRE - INLAY),
                      P.prisma(forma.difference(nuevo), ESP_NOMBRE - INLAY, ESP_NOMBRE)])),
                  dict(nombre="letras", color=P.BLANCO, malla=P.prisma(nuevo, ESP_NOMBRE - INLAY, ESP_NOMBRE))]
    else:
        partes = [dict(nombre="nombre", color=M.NOMBRE_COLOR[diseno], malla=P.prisma(forma, 0, ESP_NOMBRE))]
    for p in pts:
        cil = cilindro(p, perno_d, -largo, 0.3)
        # el botón se traslapa 0.3 mm dentro del nombre: el slicer lo fusiona en una pieza
        partes[0]["malla"] = trimesh.util.concatenate([partes[0]["malla"], cil])
    sueltas = len(getattr(forma, "geoms", [forma])) - 1
    return dict(esfera=esfera, nombre=partes, z_nombre=z_nombre, stock=stock, plana=pr["plana"],
                info=dict(tam=tam, perno=perno_d, hueco=hueco_d, largo=largo, n=len(pts), sueltas=sueltas))


def girar_boca_abajo(partes, altura):
    R = trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0])
    out = []
    for p in partes:
        m = p["malla"].copy(); m.apply_transform(R); m.apply_translation([0, 0, altura])
        out.append(dict(p, malla=m))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nombres", default="Toeva,Daniela,Jonathan,Alma")
    ap.add_argument("--diseno", choices=list(P.DISENOS))
    a = ap.parse_args()
    nombres = [n.strip() for n in a.nombres.split(",") if n.strip()]
    disenos = [a.diseno] * len(nombres) if a.diseno else \
        [ORDEN_PRUEBA[i % len(ORDEN_PRUEBA)] for i in range(len(nombres))]
    os.makedirs(os.path.join(SALIDA, "previews"), exist_ok=True)
    M.SALIDA = SALIDA

    esferas, nombres_items, maqueta, stock_hecho = {}, {}, [], set()
    for n, d in zip(nombres, disenos):
        r = armar(d, n)
        i = r["info"]
        aviso = "" if i["n"] == 2 and i["sueltas"] == 0 else "  ¡OJO! revisar"
        print(f"  {d:<19} {n:<10} letra {i['tam']:.1f} mm | botón Ø{i['perno']:.1f} x {i['largo']:.1f} mm, "
              f"hueco Ø{i['hueco']:.1f} | esfera {'de STOCK' if r['stock'] else 'para este nombre'}{aviso}")
        # esfera: las planas boca abajo
        esf = r["esfera"]
        top = max(s["malla"].bounds[1][2] for s in esf)
        esf_imp = M.centrar(girar_boca_abajo(esf, top) if r["plana"] else esf)
        colores = tuple(sorted({s["color"] for s in esf}))
        if not r["stock"] or d not in stock_hecho:
            etiqueta = f"esfera_{d}" + ("" if r["stock"] else f"_{P.slug(n)}")
            esferas.setdefault(colores, []).append((etiqueta, esf_imp))
            stock_hecho.add(d)
        # nombre: boca abajo, botones arriba
        nom_imp = M.centrar(girar_boca_abajo(r["nombre"], ESP_NOMBRE))
        esquema = "bicolor" if len(r["nombre"]) > 1 else ("rojo" if r["nombre"][0]["color"] == P.ROJO else "blanco")
        nombres_items.setdefault(esquema, []).append((f"nombre_{d}_{P.slug(n)}", nom_imp))
        maqueta.append((esf, r["nombre"], r["z_nombre"]))

    for colores, items in esferas.items():
        nom = "_".join("rojas" if c == P.ROJO else "blancas" for c in colores)
        for ruta, k in M.plancha(os.path.join(SALIDA, f"plancha_esferas_{nom}"), items, f"Esferas {nom}"):
            print(f"  {os.path.basename(ruta)}: {k} esferas")
    for esquema, items in nombres_items.items():
        for ruta, k in M.plancha(os.path.join(SALIDA, f"plancha_nombres_{esquema}"), items, f"Nombres {esquema}"):
            print(f"  {os.path.basename(ruta)}: {k} nombres")

    # maquetas: armada (frente) y explosionada (de lado se ven botones y huecos)
    g, x = [], 0
    for esf, nom, z in maqueta:
        ancho = M.tam_xy(esf)[0]
        for s in esf:
            m = s["malla"].copy(); m.apply_translation([x + ancho / 2, 0, 0]); g.append((m, s["color"]))
        for p in nom:
            m = p["malla"].copy(); m.apply_translation([x + ancho / 2, 0, z]); g.append((m, p["color"]))
        x += ancho + 6
    dibujar(g, os.path.join(SALIDA, "previews", "armadas.png"), "Armadas", tam=14)
    g, x = [], 0
    for esf, nom, z in maqueta:                  # solo esferas: para ver los huecos
        ancho = M.tam_xy(esf)[0]
        for s in esf:
            m = s["malla"].copy(); m.apply_translation([x + ancho / 2, 0, 0]); g.append((m, s["color"]))
        x += ancho + 6
    dibujar(g, os.path.join(SALIDA, "previews", "esferas_con_huecos.png"), "Esferas con huecos", tam=14)


if __name__ == "__main__":
    main()
