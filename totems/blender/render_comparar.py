"""Renderiza un .blend del tótem y lo compara contra la referencia frontal.

Uso: python3 totems/blender/render_comparar.py <archivo.blend> <carpeta_salida> [--solo-render]

Genera:
- frente.png, tres_cuartos.png, lado_izq.png, lado_der.png, espalda.png (Workbench, sombreado de estudio)
- plano_frente.png: render con colores planos, al mismo encuadre que la referencia
- comparacion.png: referencia | modelo | diferencias (rojo: solo referencia, cian: solo modelo)
- comparacion.json: coincidencia de silueta (IoU) total y por color
"""
import json
import math
import pathlib
import sys

import bpy
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent
blend, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
solo_render = "--solo-render" in sys.argv
out.mkdir(parents=True, exist_ok=True)
MED = json.load(open(HERE / "fase1" / "medidas.json"))
PX, CX, Y1 = MED["px_por_mm"], MED["centro_x_px"], MED["piso_y_px"]
REF = Image.open(HERE / "referencia_frente.webp").convert("RGB")
W, H = REF.size

bpy.ops.wm.open_mainfile(filepath=str(blend))
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light = "STUDIO"; sh.color_type = "MATERIAL"
sh.show_cavity = True; sh.cavity_type = "BOTH"; sh.curvature_ridge_factor = 1.0; sh.curvature_valley_factor = 1.0
sh.show_shadows = True; sh.shadow_intensity = 0.35
sh.show_specular_highlight = True
scene.display.render_aa = "16"
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new("mundo")
scene.render.image_settings.file_format = "PNG"
try:
    scene.view_settings.view_transform = "Standard"
except Exception:
    pass

cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam); scene.camera = cam

xc_mm = ((W - 1) / 2 - CX) / PX
zc_mm = (Y1 - (H - 1) / 2) / PX


def orto(nombre, loc, rot, res=(W, H)):
    cam_data.type = "ORTHO"; cam_data.sensor_fit = "VERTICAL"; cam_data.ortho_scale = H / PX
    cam_data.clip_start, cam_data.clip_end = 1, 5000
    cam.location, cam.rotation_euler = loc, rot
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = str(out / nombre)
    bpy.ops.render.render(write_still=True)


def persp(nombre, loc, target, lens=70, res=(1400, 1400)):
    cam_data.type = "PERSP"; cam_data.lens = lens; cam_data.sensor_fit = "AUTO"
    cam_data.clip_start, cam_data.clip_end = 1, 5000
    cam.location = loc
    d = np.array(target) - np.array(loc)
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[0], -d[1]) * -1 + 0)
    # orientar con un "track to" simple
    con = cam.constraints.get("mirar") or cam.constraints.new("TRACK_TO")
    con.name = "mirar"
    tgt = bpy.data.objects.get("objetivo") or bpy.data.objects.new("objetivo", None)
    if tgt.name not in scene.collection.objects:
        scene.collection.objects.link(tgt)
    tgt.location = target; con.target = tgt; con.track_axis = "TRACK_NEGATIVE_Z"; con.up_axis = "UP_Y"
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = str(out / nombre)
    bpy.ops.render.render(write_still=True)
    cam.constraints.remove(con)


# vistas ortográficas (front: cámara en −Y mirando a +Y)
orto("frente.png", (xc_mm, -800, zc_mm), (math.radians(90), 0, 0))
orto("espalda.png", (-xc_mm, 800, zc_mm), (math.radians(90), 0, math.radians(180)))
orto("lado_izq.png", (-800, 20, zc_mm), (math.radians(90), 0, math.radians(-90)), res=(int(H * 0.6), H))
orto("lado_der.png", (800, 20, zc_mm), (math.radians(90), 0, math.radians(90)), res=(int(H * 0.6), H))
persp("tres_cuartos.png", (-330, -520, 260), (0, 0, 100))

if solo_render:
    sys.exit(0)

# render plano (colores sin luz) para medir contra la referencia
sh.light = "FLAT"; sh.show_cavity = False; sh.show_shadows = False; sh.show_specular_highlight = False
scene.display.render_aa = "OFF"
orto("plano_frente.png", (xc_mm, -800, zc_mm), (math.radians(90), 0, 0))

# ---------------- comparación por colores
FIL = {"azul": (159, 203, 234), "rosa": (246, 183, 201), "morado": (155, 123, 196), "negro": (34, 34, 34),
       "blanco": (255, 255, 255), "amarillo": (247, 227, 154)}
mod = np.asarray(Image.open(out / "plano_frente.png").convert("RGB")).astype(int)
bgcol = mod[2, 2]
fg_mod = np.abs(mod - bgcol).sum(-1) > 12


def clase_modelo(nombre):
    c = np.array(FIL[nombre])
    return (np.abs(mod - c).sum(-1) < 40) & fg_mod


def ref_mask(k):
    return np.asarray(Image.open(HERE / "fase1" / f"mascara_{k}.png")) > 0


zona = np.zeros((H, W), bool); zona[: int(Y1 - 34.5 * PX), :] = True   # arriba de la base
ref_fg = ref_mask("panel") | ref_mask("alga")
res = {}


def iou(a, b):
    a, b = a & zona, b & zona
    u = (a | b).sum()
    return round(float((a & b).sum() / u), 3) if u else None


res["silueta_total"] = iou(fg_mod, ref_fg)
res["ajolote"] = iou(clase_modelo("rosa") | clase_modelo("morado") | (clase_modelo("negro") & (np.arange(H)[:, None] < Y1 - 128 * PX)),
                     ref_mask("ajolote"))
res["rosa"] = iou(clase_modelo("rosa"), ref_mask("ajolote_rosa"))
res["morado_branquias"] = iou(clase_modelo("morado") & (np.arange(W)[None, :] < CX + 66 * PX) & (np.arange(H)[:, None] < Y1 - 125 * PX),
                              ref_mask("ajolote_morado"))
res["burbujas"] = iou(clase_modelo("blanco") & (np.arange(W)[None, :] < CX - 45 * PX), ref_mask("burbujas"))
res["alga"] = iou(clase_modelo("morado") & (np.arange(W)[None, :] > CX + 45 * PX) & (np.arange(H)[:, None] > Y1 - 112 * PX), ref_mask("alga"))
json.dump(res, open(out / "comparacion.json", "w"), indent=1)

ref = np.asarray(REF).astype(np.uint8)
diff = np.full((H, W, 3), 255, np.uint8)
diff[ref_fg & zona & ~fg_mod] = (230, 40, 40)
diff[fg_mod & zona & ~ref_fg] = (0, 190, 210)
diff[fg_mod & ref_fg & zona] = (200, 200, 200)
fr = np.asarray(Image.open(out / "frente.png").convert("RGB"))
lam = np.concatenate([ref, fr, diff], 1)
Image.fromarray(lam).save(out / "comparacion.png")
Image.fromarray(lam).resize((lam.shape[1] // 2, lam.shape[0] // 2)).save(out / "comparacion_chica.png")
print("COMPARACION", json.dumps(res))
