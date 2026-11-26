#!/usr/bin/env python3
"""
Esferas ARMABLES: esfera de stock de un color (sin nombre) + nombre aparte que se pega.

    python3 modular.py                                    # ejemplo: 1 de cada diseño
    python3 modular.py --nombres "Ana,Luis,Ximena"        # reparte los diseños en ciclo
    python3 modular.py --nombres "Ana,Luis" --diseno gorrito
    python3 modular.py --solo-nombres --nombres "..."     # no regenera planchas de esferas

Salida (en salida_modular/):
  plancha_esferas_<color>.3mf   esferas de stock agrupadas por color (sin cambios de filamento)
  plancha_esferas_<diseno>.3mf  el máximo de un mismo diseño por cama (para hacer lote)
  plancha_nombres_<esquema>_N.3mf  nombres, agrupados por combinación de color
  previews/*.png                vistas previas (armadas, planchas)
"""
import argparse, os, sys
import numpy as np
import trimesh
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI); sys.path.insert(0, os.path.dirname(AQUI))
import personalizar as P
from tres_mf import escribir_3mf
from render2d import dibujar

SALIDA = os.path.join(AQUI, "salida_modular")
ROJO, BLANCO = P.ROJO, P.BLANCO
# Ranura del CFS de cada color (cámbialo a como tengas cargado tu CFS)
RANURAS = {ROJO: 1, BLANCO: 4}
NOMBRE_COLOR = {"mono_pino": ROJO, "nombre_cruzado": BLANCO, "ornamento_vertical": ROJO,
                "copo_grande": BLANCO, "gorrito": (ROJO, BLANCO)}
ESP_NOMBRE = {"nombre_cruzado": 2.4}   # grosor del nombre (mm); por defecto 2.0
ESP_DEF = 2.0
LETRA_EXTRA = 0.6                       # gorrito: letras blancas encima del contorno rojo

_cache = {}


def preparar(diseno):
    """Carga el diseño, quita el texto viejo y deja la esfera de stock."""
    if diseno in _cache:
        return _cache[diseno]
    cfg = P.DISENOS[diseno]
    e = P.leer(os.path.join(P.ORIG, cfg["archivo"]))[cfg["obj"]]
    partes = [p for p in e["partes"] if p["id"] in cfg["partes"]
              and (not cfg.get("solo") or p["id"] in cfg["solo"])]
    rol = {p["id"]: cfg["partes"][p["id"]][0] for p in partes}
    col = {p["id"]: cfg["partes"][p["id"]][1] for p in partes}
    todo = trimesh.util.concatenate([p["malla"] for p in partes])
    c = (todo.bounds[0] + todo.bounds[1]) / 2
    for p in partes:
        p["malla"].apply_translation([-c[0], -c[1], -todo.bounds[0][2]])
    viejo = unary_union([P.huella(p["malla"]) for p in partes if rol[p["id"]] == "texto"])
    capa = next(p for p in partes if rol[p["id"]] in ("base", "corte"))
    zb = capa["malla"].bounds
    base2d = P.corte_z(capa["malla"], (zb[0][2] + zb[1][2]) / 2)
    exterior = P.Polygon(max(getattr(base2d, "geoms", [base2d]), key=lambda g: g.area).exterior)
    w = P.ancho_aro(base2d, exterior)
    interior = exterior.buffer(-w)
    esfera = []
    for p in partes:
        r, m = rol[p["id"]], p["malla"]
        if r in ("texto", "contorno"):
            continue                      # el nombre viejo se va
        if r == "corte":                  # texto fundido en la base: se recorta
            z0, z1 = m.bounds[0][2], m.bounds[1][2]
            g = P.corte_z(m, (z0 + z1) / 2).difference(viejo.buffer(0.6).intersection(interior))
            m = P.prisma(g, z0, z1)
        esfera.append(dict(nombre=f"{diseno}_{r}", malla=m, color=col[p["id"]]))
    # ¿es plana (solo 2 alturas)? -> se puede imprimir boca abajo (frente con textura PEI)
    zs = np.unique(np.round(np.concatenate([s["malla"].vertices[:, 2] for s in esfera]), 2))
    plana = len(zs) == 2
    cont_d = 0
    for p in partes:
        if rol[p["id"]] == "contorno":
            area = P.huella(p["malla"]).area
            for dd in np.arange(0.5, 5, 0.1):
                if viejo.buffer(dd).area >= area:
                    cont_d = dd; break
    top = max(s["malla"].bounds[1][2] for s in esfera)
    # revisión de que la esfera sola quede en una pieza
    h = unary_union([P.corte_z(s["malla"], (s["malla"].bounds[0][2] + s["malla"].bounds[1][2]) / 2)
                     for s in esfera]).buffer(0.05)
    sueltas = len(getattr(h, "geoms", [h])) - 1
    _cache[diseno] = dict(cfg=cfg, esfera=esfera, viejo=viejo, base2d=base2d, exterior=exterior,
                          interior=interior, plana=plana, cont_d=cont_d, top=top, sueltas=sueltas)
    return _cache[diseno]


def pieza_nombre(diseno, nombre):
    pr = preparar(diseno)
    cfg = pr["cfg"]
    nuevo, cola, tam = P.poner_nombre(nombre, pr["viejo"], cfg["angulo"], pr["exterior"],
                                      cfg["colas"], pr["interior"], cfg.get("alto_extra", 1.0))
    esp = ESP_NOMBRE.get(diseno, ESP_DEF)
    color = NOMBRE_COLOR[diseno]
    if diseno == "gorrito":
        d = pr["cont_d"] or 2.8
        cont = P.unir_islas(unary_union([nuevo.buffer(d, join_style=1), cola.buffer(d * 0.6)]))
        partes = [dict(nombre="contorno", malla=P.prisma(cont, 0, esp), color=color[0]),
                  dict(nombre="letras", malla=P.prisma(nuevo, esp, esp + LETRA_EXTRA), color=color[1])]
        huella = cont
    else:
        g = P.unir_islas(unary_union([nuevo, cola]))
        partes = [dict(nombre="nombre", malla=P.prisma(g, 0, esp), color=color)]
        huella = g
    n = len(getattr(huella, "geoms", [huella])) - 1
    return partes, dict(tam=tam, sueltas=n)


# ------------------------------------------------------------------ salida
def tam_xy(partes):
    b = trimesh.util.concatenate([p["malla"] for p in partes]).bounds
    return (b[1][0] - b[0][0], b[1][1] - b[0][1])


def centrar(partes):
    b = trimesh.util.concatenate([p["malla"] for p in partes]).bounds
    c = (b[0] + b[1]) / 2
    out = []
    for p in partes:
        m = p["malla"].copy(); m.apply_translation([-c[0], -c[1], 0]); out.append(dict(p, malla=m))
    return out


def para_imprimir_esfera(diseno):
    """Esfera de stock en posición de impresión: las planas van boca abajo (giro 180° en Y)."""
    pr = preparar(diseno)
    partes = [dict(s) for s in pr["esfera"]]
    if pr["plana"]:
        R = trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0])
        for s in partes:
            m = s["malla"].copy(); m.apply_transform(R); m.apply_translation([0, 0, pr["top"]])
            s["malla"] = m
    return centrar(partes)


def plancha(ruta_base, items, titulo):
    """items: [(nombre_obj, partes_centradas)] -> 1 o más 3MF + PNG"""
    rutas = []
    for ip, placa in enumerate(P.acomodar([tam_xy(p) for _, p in items]), 1):
        ruta = f"{ruta_base}_{ip}.3mf" if ip > 1 or len(items) > len(placa) else f"{ruta_base}.3mf"
        objs = [dict(nombre=items[i][0], pos=(x, y),
                     partes=[(p["nombre"], p["malla"], p["color"]) for p in items[i][1]])
                for i, x, y in placa]
        escribir_3mf(ruta, objs, RANURAS)
        grupos = []
        for i, x, y in placa:
            for p in sorted(items[i][1], key=lambda q: q["malla"].bounds[1][2]):
                m = p["malla"].copy(); m.apply_translation([x, y, 0]); grupos.append((m, p["color"]))
        png = os.path.join(SALIDA, "previews", os.path.basename(ruta).replace(".3mf", ".png"))
        dibujar(grupos, png, f"{titulo} ({len(placa)} pzas)", tam=7, limites=((0, P.CAMA), (0, P.CAMA)))
        rutas.append((ruta, len(placa)))
    return rutas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nombres")
    ap.add_argument("--diseno", choices=list(P.DISENOS))
    ap.add_argument("--solo-nombres", action="store_true")
    a = ap.parse_args()
    nombres = [n.strip() for n in a.nombres.split(",") if n.strip()] if a.nombres else P.EJEMPLO
    disenos = [a.diseno] * len(nombres) if a.diseno else \
        [list(P.DISENOS)[i % len(P.DISENOS)] for i in range(len(nombres))]
    os.makedirs(os.path.join(SALIDA, "previews"), exist_ok=True)
    os.makedirs(os.path.join(SALIDA, "stl"), exist_ok=True)

    if not a.solo_nombres:
        print("Esferas de stock:")
        por_color = {}
        for d in P.DISENOS:
            pr = preparar(d)
            esf = para_imprimir_esfera(d)
            for k, s in enumerate(esf):
                s["malla"].export(os.path.join(SALIDA, "stl", f"esfera_{d}_{k}.stl"))
            aviso = "" if pr["sueltas"] == 0 else f"  ¡OJO! {pr['sueltas']} parte(s) suelta(s)"
            print(f"  {d:<19} {'boca ABAJO (frente PEI)' if pr['plana'] else 'boca arriba'}{aviso}")
            colores = tuple(sorted({s["color"] for s in esf}))
            por_color.setdefault(colores, []).append((f"esfera_{d}", esf))
            # lote: el máximo de este diseño en una cama
            n = len(P.acomodar([tam_xy(esf)] * 40)[0])
            for r, k in plancha(os.path.join(SALIDA, f"plancha_esferas_{d}"), [(f"esfera_{d}", esf)] * n,
                                f"Esferas {d}"):
                print(f"     lote: {os.path.basename(r)} ({k} por cama)")
        for colores, items in por_color.items():
            nom = "_".join("roja" if c == ROJO else "blanca" for c in colores)
            for r, k in plancha(os.path.join(SALIDA, f"plancha_esferas_{nom}s"), items, f"Esferas {nom}s"):
                print(f"  {os.path.basename(r)}: {k} esferas (un solo color)")

    print("Nombres:")
    grupos, armadas = {}, []
    for n, d in zip(nombres, disenos):
        partes, info = pieza_nombre(d, n)
        aviso = "" if info["sueltas"] == 0 else f"  ¡OJO! {info['sueltas']} parte(s) suelta(s)"
        print(f"  {d:<19} {n:<12} letra {info['tam']:.1f} mm{aviso}")
        esquema = "bicolor" if len(partes) > 1 else ("rojo" if partes[0]["color"] == ROJO else "blanco")
        grupos.setdefault(esquema, []).append((f"nombre_{d}_{P.slug(n)}", centrar(partes)))
        if len(armadas) < 12:
            armadas.append((d, n, partes))
    for esquema, items in grupos.items():
        for r, k in plancha(os.path.join(SALIDA, f"plancha_nombres_{esquema}"), items, f"Nombres {esquema}"):
            print(f"  {os.path.basename(r)}: {k} nombres")

    # maqueta: cada esfera con su nombre puesto encima (vista de frente)
    grupos_png, x = [], 0
    for d, n, partes in armadas:
        pr = preparar(d)
        ancho = tam_xy(pr["esfera"])[0]
        for s in pr["esfera"]:
            m = s["malla"].copy(); m.apply_translation([x + ancho / 2, 0, 0]); grupos_png.append((m, s["color"]))
        for p in sorted(partes, key=lambda q: q["malla"].bounds[1][2]):
            m = p["malla"].copy(); m.apply_translation([x + ancho / 2, 0, pr["top"]]); grupos_png.append((m, p["color"]))
        x += ancho + 6
    dibujar(grupos_png, os.path.join(SALIDA, "previews", "armadas.png"), "Armadas (esfera + nombre pegado)", tam=14)


if __name__ == "__main__":
    main()
