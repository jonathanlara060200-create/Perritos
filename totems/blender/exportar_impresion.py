"""Fase 7: exporta los archivos de impresión desde totem/totem.blend.

Uso: python3 totems/blender/exportar_impresion.py
Salidas en totems/blender/impresion/:
- stl/<pieza>/<pieza>__<color>.stl   cada pieza acostada sobre la cama (cara al frente hacia arriba), z mínimo = 0
- stl_ensamble/totem_completo.stl    todo el tótem armado (referencia)
- placas.json                         qué piezas van en cada placa y qué color va en cada ranura del CFS
"""
import json
import math
import pathlib
from collections import defaultdict

import bpy
import mathutils

HERE = pathlib.Path(__file__).parent
OUT = HERE / "impresion"
(OUT / "stl").mkdir(parents=True, exist_ok=True)
(OUT / "stl_ensamble").mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE / "totem" / "totem.blend"))
REG = json.load(open(HERE / "totem" / "piezas.json"))
color_de = {r["objeto"]: r["color"] for r in REG}

# placas de impresión (máx. 4 colores c/u)
PLACAS = {
    1: ["1_panel"],
    2: ["2_bolsillo"],
    3: ["3_ajolote", "3_manita_izq", "3_manita_der", "3_burbujas", "3_alga"],
    4: ["4_base"],
    5: ["5_boton_instagram", "5_boton_whatsapp", "5_boton_credit-card"],
}

piezas = defaultdict(list)
for col in bpy.data.collections:
    for ob in col.objects:
        if ob.type == "MESH":
            piezas[col.name].append(ob)


def exportar(obs, ruta, matriz):
    """Exporta objetos aplicando `matriz` (local→cama) sin tocar el archivo .blend."""
    bpy.ops.object.select_all(action="DESELECT")
    guard = {}
    for ob in obs:
        guard[ob.name] = ob.matrix_world.copy()
        ob.matrix_world = matriz
        ob.select_set(True)
    bpy.context.view_layer.update()
    bpy.ops.wm.stl_export(filepath=str(ruta), export_selected_objects=True, apply_modifiers=True)
    for ob in obs:
        ob.matrix_world = guard[ob.name]


resumen = {}
for pieza, obs in sorted(piezas.items()):
    # caja de la pieza en coordenadas locales (las piezas planas están modeladas acostadas)
    vs = [v.co for ob in obs for v in ob.data.vertices]
    mn = mathutils.Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = mathutils.Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    centro = (mn + mx) / 2
    m = mathutils.Matrix.Translation((-centro.x, -centro.y, -mn.z))   # centrada y apoyada en la cama
    d = OUT / "stl" / pieza; d.mkdir(exist_ok=True)
    for ob in obs:
        exportar([ob], d / f"{pieza}__{color_de.get(ob.name, 'x')}__{ob.name}.stl", m)
    resumen[pieza] = dict(caja_mm=[round(mx.x - mn.x, 1), round(mx.y - mn.y, 1), round(mx.z - mn.z, 1)],
                          colores=sorted({color_de.get(ob.name) for ob in obs}),
                          objetos=[ob.name for ob in obs])

# ensamble completo (posiciones reales)
bpy.ops.object.select_all(action="DESELECT")
for obs in piezas.values():
    for ob in obs:
        ob.select_set(True)
bpy.ops.wm.stl_export(filepath=str(OUT / "stl_ensamble" / "totem_completo.stl"), export_selected_objects=True, apply_modifiers=True)

# ranuras del CFS fijas para cambiar el mínimo de rollos. Orden de impresión sugerido: 1 → 2 → 4 → 5 → 3
RANURAS = {
    1: {1: "azul_cielo", 2: "blanco", 3: "amarillo_pastel"},
    2: {1: "azul_cielo", 2: "blanco", 3: "amarillo_pastel", 4: "negro"},
    4: {1: "azul_cielo", 2: "blanco"},
    5: {1: "azul_cielo", 2: "blanco", 3: "morado", 4: "rosa_bajito"},
    3: {1: "negro", 2: "blanco", 3: "morado", 4: "rosa_bajito"},
}
placas = {}
for n in (1, 2, 4, 5, 3):
    ps = PLACAS[n]
    cols = sorted({c for p in ps for c in resumen[p]["colores"]})
    faltan = set(cols) - set(RANURAS[n].values())
    assert not faltan, f"placa {n}: colores sin ranura {faltan}"
    placas[n] = dict(piezas=ps, colores=cols, ranuras_cfs=RANURAS[n])
json.dump(dict(piezas=resumen, placas=placas), open(OUT / "placas.json", "w"), indent=1, ensure_ascii=False)
for n, p in placas.items():
    print(f"placa {n}: {len(p['colores'])} colores {p['colores']}  piezas {p['piezas']}")
for k, v in resumen.items():
    print(f"  {k:24s} caja {v['caja_mm']}")
