"""Fase 2: ajolote, manitas, burbujas y alga como sólidos 3D en Blender, a partir del calco de la referencia.

Uso:  python3 totems/blender/fase2_personaje.py
Salidas en totems/blender/fase2/: totem_fase2.blend, STL por pieza y color, renders y comparación con la referencia.
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

OUT = HERE / "fase2"; OUT.mkdir(exist_ok=True)
(OUT / "stl").mkdir(exist_ok=True)

FIL = dict(azul_cielo="#9FCBEA", rosa_bajito="#F6B7C9", morado="#9B7BC4", amarillo_pastel="#F7E39A",
           negro="#222222", blanco="#FFFFFF", beige="#E9D8BC", gris="#9A9A9A")

# ---------------------------------------------------------------- espesores de diseño (mm, hacia el frente)
PANEL_T = 6.0          # panel trasero (provisional en esta fase)
POCKET_T = 4.0         # bolsillo (provisional en esta fase)
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
T0 = time.time()


def cuerpo(nombre, pieza, color, rej, dentro, top, bot, back_y=0.0):
    """Crea un objeto Blender (sólido cerrado) y lo coloca parado en el ensamble."""
    if not dentro.any():
        return None
    rr, cc = np.where(dentro)
    r0, r1, c0, c1 = max(rr.min() - 1, 0), rr.max() + 2, max(cc.min() - 1, 0), cc.max() + 2
    sub = types.SimpleNamespace(x0=rej.x0 + c0 * rej.res, y1=rej.y1 - r0 * rej.res, res=rej.res)
    top = np.broadcast_to(np.asarray(top, float), dentro.shape)[r0:r1, c0:c1]
    bot = np.broadcast_to(np.asarray(bot, float), dentro.shape)[r0:r1, c0:c1]
    v, f = R.malla(sub, dentro[r0:r1, c0:c1], top, bot)
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(v.tolist(), [], f.tolist())
    me.validate(); me.update()
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
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
rej = R.Rejilla(-95, 95, 30, 202)
pocket = rej.poligono(POCKET_PX)
pocket_gap = rej.offset(pocket, GAP)

# --- piezas del ajolote
rosas = R.componentes(m_rosa)
head_c = max(rosas, key=lambda c: c["area"])
paws_c = [c for c in rosas if c["cy"] > 390 and c is not head_c]
lobes_c = [c for c in rosas if c is not head_c and all(c is not p for p in paws_c)]
head = rej.de_ref(head_c["mask"])
lobes = [rej.de_ref(c["mask"]) for c in lobes_c]
fringes = rej.de_ref(m_mor)  # todos los flecos
# ojos y boca: negro dentro de la cabeza (rellenando huecos de la cabeza)
def rellenar(m):
    m = m.astype(np.uint8).copy(); ff = m.copy(); msk = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, msk, (0, 0), 1)
    return (m | (1 - ff)) > 0


head_full_src = rellenar(cv2.morphologyEx(head_c["mask"].astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
negros_cara = [c for c in R.componentes(m_neg & head_full_src, 200) if c["area"] < 20000]
eyes_c = [c for c in negros_cara if c["area"] > 3000]
mouth_c = [c for c in negros_cara if c["area"] <= 3000]
eyes = rej.de_ref(sum(c["mask"] for c in eyes_c) > 0, 0.8)
mouth = rej.de_ref(sum(c["mask"] for c in mouth_c) > 0, 0.6)
shine = rej.de_ref(m_bri & cv2.dilate(sum(c["mask"] for c in eyes_c).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool), 0.6)
shine &= eyes
head_full = rej.de_ref(head_full_src)
cara = head_full  # cabeza completa (incluye ojos y boca) para el domo

axo = rej.de_ref(m_axo)
backer = axo & ~pocket_gap
paws_back = [rej.de_ref(c["mask"]) for c in R.componentes(m_man, 500)]
paws_pink = [rej.de_ref(c["mask"]) for c in paws_c]
paws_all = np.any(paws_back, axis=0) if paws_back else np.zeros_like(axo)
bajo_manitas = rej.offset(paws_all, 0.5)

# alturas del ajolote
z_back = BACKER_T
cuerpo("ajolote_contorno", "3_ajolote", "negro", rej, backer,
       R.almohada(rej.dist(backer), BACKER_T, 0.8), 0.0)

d_head = rej.dist(cara)
head_top = z_back + R.almohada(d_head, HEAD_H, HEAD_R, HEAD_DOMO)
head_top = np.where(bajo_manitas, np.minimum(head_top, POCKET_T - 0.2), head_top)
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
    z0 = POCKET_T
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

# --- contexto provisional (se detalla en la Fase 3): panel y bolsillo lisos
rg = R.Rejilla(-95, 95, 30, 202, res=0.25)   # rejilla gruesa para piezas grandes y lisas
panel = rg.de_ref(R.mascara("panel")) & (rg.Y > 34.5)
cuerpo("PROVISIONAL_panel", "0_provisional", "azul_cielo", rg, panel, R.almohada(rg.dist(panel), PANEL_T, 1.0), 0.0, back_y=PANEL_T)
pk_g = rg.poligono(POCKET_PX)
cuerpo("PROVISIONAL_bolsillo", "0_provisional", "azul_cielo", rg, pk_g, R.almohada(rg.dist(pk_g), POCKET_T, 1.2), 0.0)
txt = rej.de_ref(R.mascara("texto_bolsillo"), 0.7)
cuerpo("PROVISIONAL_texto", "0_provisional", "blanco", rej, txt, POCKET_T + R.almohada(rej.dist(txt), 1.0, 0.4), POCKET_T)
qr = rg.de_ref(R.mascara("placas_qr"))
cuerpo("PROVISIONAL_placas_qr", "0_provisional", "blanco", rg, qr, POCKET_T + 0.2 + 0 * qr, POCKET_T)

# ---------------------------------------------------------------- guardar, exportar
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "totem_fase2.blend"))
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.wm.stl_export(filepath=str(OUT / "stl" / f"{ob.name}.stl"), export_selected_objects=True, apply_modifiers=True)
json.dump(REGISTRO, open(OUT / "piezas.json", "w"), indent=1, ensure_ascii=False)
print("objetos:", len(REGISTRO))
