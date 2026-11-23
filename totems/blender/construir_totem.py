"""Construye el tótem "Ajolote de Bolsillo" en Blender a partir del calco de la referencia.

Fase 2: ajolote, manitas, burbujas y alga.  Fase 3: panel trasero y bolsillo con sus relieves.
Uso:  python3 totems/blender/construir_totem.py
Salidas en totems/blender/totem/: totem.blend, STL por pieza y color (ensamblado), piezas.json.
"""
from __future__ import annotations

import json
import math
import pathlib
import sys
import time
import types

import bpy
import cv2
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import relieve as R  # noqa: E402

OUT = HERE / "totem"; OUT.mkdir(exist_ok=True)
(OUT / "stl").mkdir(exist_ok=True)

FIL = dict(azul_cielo="#9FCBEA", rosa_bajito="#F6B7C9", morado="#9B7BC4", amarillo_pastel="#F7E39A",
           negro="#222222", blanco="#FFFFFF", beige="#E9D8BC", gris="#9A9A9A")

# ---------------------------------------------------------------- espesores de diseño (mm, hacia el frente)
PANEL_T = 6.0          # panel trasero
POCKET_T = 4.0         # bolsillo (cuerpo)
HEM_H = 0.8            # franja superior del bolsillo, más alta
RIM_H = 0.6            # borde levantado del bolsillo
INLAY = 0.4            # colores incrustados: entran 0.4 mm en la pieza
STITCH_H = 0.6         # costuras sobresalen
TEXT_H = 1.2           # texto del bolsillo sobresale
QR_RECESS = 0.4        # hueco para la calcomanía UV DTF
SLOT_DEPTH = 10.0      # lo que el panel entra en la base
BACKER_T = 2.4         # contorno negro del ajolote (base de la pieza)
HEAD_H, HEAD_R, HEAD_DOMO = 3.0, 2.0, 1.2
LOBE_H, LOBE_R, LOBE_DOMO = 2.4, 1.4, 0.6
FRINGE_H, FRINGE_R = 1.4, 0.8
EYE_INLAY = 1.0
PAW_BACK_T, PAW_H, PAW_R = 1.0, 1.8, 1.0
BUBBLE_H, BUBBLE_R = 4.0, 2.0
ALGA_H = [5.0, 6.5, 8.0]   # tallos de atrás hacia adelante (izq → der)
ALGA_R = 1.5
GAP = 0.3              # separación entre piezas vecinas


def hex2rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# ---------------------------------------------------------------- escena
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}


def material(nombre):
    if nombre in MATS:
        return MATS[nombre]
    m = bpy.data.materials.new(nombre)
    rgb = hex2rgb(FIL[nombre]); lin = tuple(srgb2lin(c) for c in rgb)
    m.diffuse_color = (*lin, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    MATS[nombre] = m
    return m


COLL = {}


def coleccion(nombre):
    if nombre not in COLL:
        c = bpy.data.collections.new(nombre); scene.collection.children.link(c); COLL[nombre] = c
    return COLL[nombre]


REGISTRO = []
MAX_CARAS = 160000
T0 = time.time()


def cuerpo(nombre, pieza, color, rej, dentro, top, bot, back_y=0.0, suave=1.6):
    """Crea un objeto Blender (sólido cerrado) y lo coloca parado en el ensamble."""
    if not dentro.any():
        return None
    rr, cc = np.where(dentro)
    r0, r1, c0, c1 = max(rr.min() - 1, 0), rr.max() + 2, max(cc.min() - 1, 0), cc.max() + 2
    sub = types.SimpleNamespace(x0=rej.x0 + c0 * rej.res, y1=rej.y1 - r0 * rej.res, res=rej.res)
    top = np.broadcast_to(np.asarray(top, float), dentro.shape)[r0:r1, c0:c1]
    bot = np.broadcast_to(np.asarray(bot, float), dentro.shape)[r0:r1, c0:c1]
    din = dentro[r0:r1, c0:c1]
    top = R.suavizar(top, din, suave); bot = R.suavizar(bot, din, suave)
    v, f = R.malla(sub, din, top, bot)
    me = bpy.data.meshes.new(nombre)
    nv, nf = len(v), len(f)
    me.vertices.add(nv); me.vertices.foreach_set("co", v.astype(np.float32).ravel())
    me.loops.add(nf * 4); me.loops.foreach_set("vertex_index", f.astype(np.int32).ravel())
    me.polygons.add(nf); me.polygons.foreach_set("loop_start", (np.arange(nf, dtype=np.int32) * 4))
    me.update(calc_edges=True)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    # reducir caras conservando la forma (decimado cuádrico); máx. ~MAX_CARAS triángulos
    tmp = bpy.data.objects.new("tmp", me); scene.collection.objects.link(tmp)
    ratio = min(1.0, MAX_CARAS / (2.0 * nf))
    if ratio < 1.0:
        mod = tmp.modifiers.new("dec", "DECIMATE"); mod.ratio = ratio; mod.use_collapse_triangulate = True
        dg = bpy.context.evaluated_depsgraph_get()
        me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
        bpy.data.objects.remove(tmp); bpy.data.meshes.remove(me); me = me2; me.name = nombre
    else:
        bpy.data.objects.remove(tmp)
    me.shade_smooth()
    try:
        me.set_sharp_from_angle(angle=math.radians(40))
    except Exception:
        pass
    ob = bpy.data.objects.new(nombre, me)
    ob.data.materials.append(material(color))
    coleccion(pieza).objects.link(ob)
    ob.rotation_euler = (math.radians(90), 0, 0)   # plano → parado (Z plano = hacia el frente = −Y)
    ob.location = (0, back_y, 0)
    REGISTRO.append(dict(objeto=nombre, pieza=pieza, color=color, caras=len(me.polygons)))
    print(f"{nombre:28s} {len(me.polygons):8d} caras  {time.time()-T0:6.1f}s", flush=True)
    return ob


# ---------------------------------------------------------------- máscaras base de la referencia
m_axo = R.mascara("ajolote")
m_rosa = R.mascara("ajolote_rosa")
m_mor = R.mascara("ajolote_morado")
m_neg = R.mascara("ajolote_contorno_negro")
m_bri = R.mascara("ojos_brillos")
m_man = R.mascara("manitas")
POCKET_PX = json.load(open(R.F1 / "contornos_mm.json"))["bolsillo"][0]["puntos_mm"]

# rejilla que cubre todo lo de arriba de la base
rej = R.Rejilla(-102, 102, 8, 202)
pocket = rej.poligono(POCKET_PX)
pocket_gap = rej.offset(pocket, GAP)

# --- piezas del ajolote
rosas = R.componentes(m_rosa)
head_c = max(rosas, key=lambda c: c["area"])
paws_c = [c for c in rosas if c["cy"] > 390 and c is not head_c]
lobes_c = [c for c in rosas if c is not head_c and all(c is not p for p in paws_c)]
head = rej.de_ref(head_c["mask"])
lobes = [rej.de_ref(c["mask"]) for c in lobes_c]
m_mor_s = cv2.morphologyEx(cv2.morphologyEx(m_mor.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
fringes = rej.de_ref(m_mor_s, 1.6)  # todos los flecos, contorno suavizado
# ojos y boca: negro dentro de la cabeza (rellenando huecos de la cabeza)
def rellenar(m):
    m = m.astype(np.uint8).copy(); ff = m.copy(); msk = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, msk, (0, 0), 1)
    return (m | (1 - ff)) > 0


head_full_src = rellenar(cv2.morphologyEx(head_c["mask"].astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
negros_cara = [c for c in R.componentes(m_neg & head_full_src, 200) if c["area"] < 20000]
eyes_c = [c for c in negros_cara if c["area"] > 3000]
mouth_c = [c for c in negros_cara if c["area"] <= 3000]
eyes_src = rellenar(sum(c["mask"] for c in eyes_c) > 0)
eyes = rej.de_ref(eyes_src, 0.8)
mouth = rej.de_ref(sum(c["mask"] for c in mouth_c) > 0, 0.6)
shine = rej.de_ref(m_bri & eyes_src, 0.6)
shine &= eyes
head_full = rej.de_ref(head_full_src)
cara = head_full  # cabeza completa (incluye ojos y boca) para el domo

axo = rej.de_ref(m_axo)
backer = axo & ~pocket_gap
paws_back = [rej.offset(rej.de_ref(c["mask"]), 0.9) for c in sorted([c for c in R.componentes(m_rosa) if c["cy"] > 390], key=lambda c: c["cx"])]
paws_pink = [rej.de_ref(c["mask"]) for c in paws_c]
paws_all = np.any(paws_back, axis=0) if paws_back else np.zeros_like(axo)
bajo_manitas = rej.offset(paws_all, 0.5)

# alturas del ajolote
z_back = BACKER_T
cuerpo("ajolote_contorno", "3_ajolote", "negro", rej, backer,
       R.almohada(rej.dist(backer), BACKER_T, 0.8), 0.0)

d_head = rej.dist(cara)
head_top = z_back + R.almohada(d_head, HEAD_H, HEAD_R, HEAD_DOMO)
head_top = np.where(bajo_manitas, np.minimum(head_top, POCKET_T + HEM_H - 0.2), head_top)
cabeza = cara & backer & ~pocket_gap
eye_bot = head_top - EYE_INLAY
top_cabeza = np.where(eyes | mouth, eye_bot, head_top)
cuerpo("ajolote_cabeza", "3_ajolote", "rosa_bajito", rej, cabeza, top_cabeza, z_back)

eye_top = head_top + R.almohada(rej.dist(eyes), 0.5, 0.5)
eye_top_eff = np.where(shine, eye_top - 0.6, eye_top)
cuerpo("ajolote_ojos", "3_ajolote", "negro", rej, eyes & cabeza, eye_top_eff, eye_bot)
cuerpo("ajolote_brillos", "3_ajolote", "blanco", rej, shine & cabeza, eye_top + 0.2, eye_top - 0.6)
cuerpo("ajolote_boca", "3_ajolote", "negro", rej, mouth & cabeza & ~eyes, head_top + 0.3, eye_bot)

lob = np.zeros_like(axo); lob_top = np.zeros(axo.shape)
for L in lobes:
    L = L & backer & ~cara
    t = z_back + R.almohada(rej.dist(L), LOBE_H, LOBE_R, LOBE_DOMO)
    lob_top = np.where(L, t, lob_top); lob |= L
cuerpo("ajolote_branquias_rosa", "3_ajolote", "rosa_bajito", rej, lob, lob_top, z_back)
fr = fringes & backer & ~lob & ~cara
cuerpo("ajolote_branquias_morado", "3_ajolote", "morado", rej, fr, z_back + R.almohada(rej.dist(fr), FRINGE_H, FRINGE_R), z_back)

# --- manitas (van montadas sobre el bolsillo, z0 = POCKET_T)
for i, (pb, pp) in enumerate(zip(sorted(paws_back, key=lambda m: rej.X[m].mean()), sorted(paws_pink, key=lambda m: rej.X[m].mean()))):
    lado = "izq" if i == 0 else "der"
    z0 = POCKET_T + HEM_H
    cuerpo(f"manita_{lado}_contorno", f"3_manita_{lado}", "negro", rej, pb, z0 + R.almohada(rej.dist(pb), PAW_BACK_T, 0.4), z0)
    pp = pp & pb
    cuerpo(f"manita_{lado}_rosa", f"3_manita_{lado}", "rosa_bajito", rej, pp,
           z0 + PAW_BACK_T + R.almohada(rej.dist(pp), PAW_H, PAW_R, 0.4), z0 + PAW_BACK_T)

# --- burbujas
for i, c in enumerate(sorted(R.componentes(R.mascara("burbujas"), 200), key=lambda c: c["cy"])):
    b = rej.de_ref(c["mask"])
    rad = math.sqrt(b.sum()) * rej.res / math.sqrt(math.pi)
    cuerpo(f"burbuja_{i+1}", "3_burbujas", "blanco", rej, b, R.almohada(rej.dist(b), BUBBLE_H, min(BUBBLE_R, 0.45 * rad), 0.6), 0.0)

# --- alga (3 tallos, el de la derecha más al frente)
tallos = sorted(R.componentes(R.mascara("alga"), 500), key=lambda c: c["cx"])
alg = np.zeros_like(axo); alg_top = np.zeros(axo.shape)
for c, h in zip(tallos, ALGA_H):
    t = rej.de_ref(c["mask"])
    tt = R.almohada(rej.dist(t), h, ALGA_R, 0.8)
    alg_top = np.where(t, np.maximum(alg_top, tt), alg_top); alg |= t
cuerpo("alga", "3_alga", "morado", rej, alg, alg_top, 0.0)

# ================================================================ FASE 3: panel y bolsillo
m_cost = R.mascara("costuras")
m_pk = R.mascara("bolsillo")
FOLD_Y = R.ref_a_modelo(0, json.load(open(R.F1 / "medidas.json"))["medidas"]["bolsillo_franja"]["y_mm"][0])[1]


def incrustar(base_top, zona, alto, r, inlay=INLAY):
    """Cuerpo de color incrustado: entra `inlay` en la pieza y sobresale `alto` con borde redondeado."""
    bot = base_top - inlay
    top = base_top + R.almohada(rej_act.dist(zona), alto, r)
    return top, bot


# --- PANEL (rejilla gruesa: pieza grande)
rg = R.Rejilla(-102, 102, 8, 202, res=0.2)
rej_act = rg
panel = rg.de_ref(R.mascara("panel")) & (rg.Y > R.ALTO_BASE + 1.0)
fila = panel[np.argmin(np.abs(rg.Y[:, 0] - (R.ALTO_BASE + 6))), :]
xs_pan = rg.X[0][fila]
panel |= (rg.X >= xs_pan.min()) & (rg.X <= xs_pan.max()) & (rg.Y >= R.ALTO_BASE - SLOT_DEPTH) & (rg.Y <= R.ALTO_BASE + 6)
panel = R.sin_pellizcos(panel)
pan_top = R.almohada(rg.dist(panel), PANEL_T, 1.2)
# costuras del panel (las que están fuera del bolsillo), cada puntada en su lugar
st_pan = rg.de_ref(m_cost & ~cv2.dilate(m_pk.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool), 0.8) & panel
st_top, st_bot = incrustar(pan_top, st_pan, STITCH_H, 0.4)
# espalda: texto incrustado en espejo (se lee por detrás; esa cara se imprime contra la cama)
yb = 0.5 * (R.ALTO_BASE + 150)
espalda_txt = rg.texto([("Hecho por", 7, 0, yb + 26), ("Ajolote de Bolsillo", 12, 0, yb + 13),
                        ("@ajolote_de_bolsillo", 9, 0, yb), ("Tótems y piezas 3D personalizadas", 6.5, 0, yb - 12),
                        ("WhatsApp 311 167 5907", 6.5, 0, yb - 21)], str(R.HERE.parent / "vendor" / "fonts" / "Fredoka-700.ttf"),
                       espejo=True) & rg.offset(panel, -3)
pan_bot = np.where(espalda_txt, 0.6, 0.0)
cuerpo("panel", "1_panel", "azul_cielo", rg, panel, np.where(st_pan, st_bot, pan_top), pan_bot, back_y=PANEL_T)
cuerpo("panel_costuras", "1_panel", "amarillo_pastel", rg, st_pan, st_top, st_bot, back_y=PANEL_T)
cuerpo("panel_espalda_texto", "1_panel", "blanco", rg, espalda_txt, 0.6 + 0 * pan_top, 0.0, back_y=PANEL_T)

# --- BOLSILLO (rejilla fina: texto y costuras)
rej_act = rej
pk = pocket
d_pk = rej.dist(pk)
pk_top = R.almohada(d_pk, POCKET_T, 1.5)
pk_top = pk_top + RIM_H * np.clip(1 - np.abs(d_pk - 2.2) / 1.2, 0, 1)            # borde levantado
banda = pk & (rej.Y > FOLD_Y)
pk_top = pk_top + HEM_H * np.clip((rej.Y - FOLD_Y) / 0.8, 0, 1) * (d_pk > 0.6)   # franja superior
pk_top = pk_top - 0.35 * np.clip(1 - np.abs(rej.Y - FOLD_Y) / 0.5, 0, 1)          # doblez
# huecos UV DTF: rectángulos redondeados a la medida de las placas de la referencia
tiles = sorted(R.componentes(R.mascara("placas_qr"), 2000), key=lambda c: c["cx"])
huecos, HUECOS_INFO = [], []
for c, etiqueta in zip(tiles, ("TIENDA", "WHATSAPP")):
    m = rej.de_ref(c["mask"])
    xs, ys = rej.X[m], rej.Y[m]
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    r = 3.2 * R.ESCALA
    h = rej.rect_redondeado(x0, x1, y0, y1, r)
    huecos.append(h)
    HUECOS_INFO.append(dict(etiqueta=etiqueta, x0=round(float(x0), 2), x1=round(float(x1), 2), y0=round(float(y0), 2),
                            y1=round(float(y1), 2), ancho=round(float(x1 - x0), 2), alto=round(float(y1 - y0), 2),
                            radio=round(r, 2), profundidad=QR_RECESS))
hueco = np.any(huecos, axis=0)
import yaml  # noqa: E402
CFG = yaml.safe_load(open(HERE.parent / "config" / "totem_ajolote.yaml", encoding="utf-8"))
QR_MODO = CFG.get("qr_modo", "impreso")
URLS = {q["etiqueta"]: q["url"] for q in CFG["qr"]}
QR_INFO = []
if QR_MODO == "impreso":
    import segno  # noqa: E402
    TILE_SINK, TILE_UP, MOD_INLAY = 0.6, 0.6, 0.6
    tile_top = POCKET_T + TILE_UP
    pk_top = np.where(hueco, POCKET_T - TILE_SINK, pk_top)
    modulos = np.zeros_like(hueco); etiquetas = np.zeros_like(hueco)
    for h, info in zip(huecos, HUECOS_INFO):
        url = URLS[info["etiqueta"]]
        m = np.array(segno.make(url, error=CFG.get("qr_correccion", "m"), boost_error=False).matrix, bool)
        n = len(m); qz = 2
        w = info["ancho"]; mod = w / (n + 2 * qz)
        qx0 = info["x0"] + qz * mod; qy1 = info["y1"] - qz * mod
        col = np.floor((rej.X - qx0) / mod).astype(int); row = np.floor((qy1 - rej.Y) / mod).astype(int)
        ok = (col >= 0) & (col < n) & (row >= 0) & (row < n) & h
        mm = np.zeros_like(hueco); mm[ok] = m[row[ok], col[ok]]
        modulos |= mm
        lab_y = info["y0"] + (info["alto"] - w + 1.4) / 2
        etiquetas |= rej.texto([(info["etiqueta"], 4.6, (info["x0"] + info["x1"]) / 2, lab_y)],
                               str(HERE.parent / "vendor" / "fonts" / "Fredoka-700.ttf")) & h
        QR_INFO.append(dict(etiqueta=info["etiqueta"], url=url, version=int((n - 17) / 4), modulos=n, modulo_mm=round(mod, 3),
                            placa_mm=[info["ancho"], info["alto"]]))
    negro_qr = modulos | etiquetas
    tile_body_top = np.where(negro_qr, tile_top - MOD_INLAY, tile_top)
else:
    pk_top = np.where(hueco, POCKET_T - QR_RECESS, pk_top)
# costuras y texto del bolsillo
st_pk = rej.de_ref(m_cost & m_pk, 0.8) & rej.offset(pk, -0.8) & ~rej.offset(hueco, 0.6)
txt = rej.de_ref(R.mascara("texto_bolsillo"), 0.7) & pk & ~hueco
stp_top, stp_bot = incrustar(pk_top, st_pk, STITCH_H, 0.4)
tx_top, tx_bot = incrustar(pk_top, txt, TEXT_H, 0.5)
pk_body_top = np.where(st_pk, stp_bot, np.where(txt, tx_bot, pk_top))
cuerpo("bolsillo", "2_bolsillo", "azul_cielo", rej, pk, pk_body_top, 0.0)
cuerpo("bolsillo_costuras", "2_bolsillo", "amarillo_pastel", rej, st_pk, stp_top, stp_bot)
cuerpo("bolsillo_texto", "2_bolsillo", "blanco", rej, txt, tx_top, tx_bot)
if QR_MODO == "impreso":
    cuerpo("bolsillo_qr_placas", "2_bolsillo", "blanco", rej, hueco, tile_body_top, POCKET_T - TILE_SINK, suave=0)
    cuerpo("bolsillo_qr_modulos", "2_bolsillo", "negro", rej, negro_qr & hueco, tile_top + 0 * tile_body_top, tile_top - MOD_INLAY, suave=0)
json.dump(dict(escala=R.ESCALA, alto_base=R.ALTO_BASE, qr_modo=QR_MODO, qr_impresos=QR_INFO, huecos_uv_dtf=HUECOS_INFO), open(OUT / "medidas_modelo.json", "w"),
          indent=1, ensure_ascii=False)

# ---------------------------------------------------------------- guardar, exportar
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "totem.blend"))
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.wm.stl_export(filepath=str(OUT / "stl" / f"{ob.name}.stl"), export_selected_objects=True, apply_modifiers=True)
json.dump(REGISTRO, open(OUT / "piezas.json", "w"), indent=1, ensure_ascii=False)
print("objetos:", len(REGISTRO))
