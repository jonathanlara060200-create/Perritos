"""Un 3MF multicolor por placa de impresión, para Creality Print (formato de proyecto tipo OrcaSlicer).

Uso: python3 totems/blender/exportar_3mf.py
Lee impresion/stl/<pieza>/*.stl y impresion/placas.json. Escribe impresion/3mf/placa_<n>.3mf.

Cada pieza es UN objeto con varias partes (una por color). Cada parte lleva:
- su ranura del CFS (metadata "extruder" en Metadata/model_settings.config, formato OrcaSlicer/Creality Print)
- su color como material estándar 3MF (basematerials), por si el programa no lee la metadata anterior.
"""
import json
import pathlib
import zipfile

import numpy as np
import trimesh

HERE = pathlib.Path(__file__).parent
IMP = HERE / "impresion"
OUT = IMP / "3mf"; OUT.mkdir(exist_ok=True)
PL = json.load(open(IMP / "placas.json"))
FIL = dict(azul_cielo="#9FCBEA", rosa_bajito="#F6B7C9", morado="#9B7BC4", amarillo_pastel="#F7E39A",
           negro="#222222", blanco="#FFFFFF", beige="#E9D8BC", gris="#9A9A9A")
CAMA = 260.0          # SparkX i7: 260 × 260 mm
UTIL = 240.0          # área útil con margen
SEP = 6.0             # separación entre piezas


def acomodar(cajas):
    """Acomodo en filas (de la más alta a la más baja), centrado en la cama. Devuelve centros (x, y)."""
    orden = sorted(range(len(cajas)), key=lambda i: -cajas[i][1])
    pos, x, y, fila_h, filas = {}, 0.0, 0.0, 0.0, []
    for i in orden:
        w, h = cajas[i]
        if x > 0 and x + w > UTIL:
            filas.append(fila_h); y += fila_h + SEP; x, fila_h = 0.0, 0.0
        pos[i] = (x + w / 2, y + h / 2); x += w + SEP; fila_h = max(fila_h, h)
    total_h = y + fila_h
    total_w = max(pos[i][0] + cajas[i][0] / 2 for i in pos)
    if total_w > UTIL or total_h > UTIL:
        raise SystemExit(f"no cabe en la cama: {total_w:.0f} × {total_h:.0f} mm")
    ox, oy = (CAMA - total_w) / 2, (CAMA - total_h) / 2
    return {i: (p[0] + ox, p[1] + oy) for i, p in pos.items()}


def malla_xml(m):
    v = "".join(f'<vertex x="{a:.4f}" y="{b:.4f}" z="{c:.4f}"/>' for a, b, c in m.vertices)
    t = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in m.faces)
    return f"<mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh>"


def placa(n, info):
    ranura = {c: int(k) for k, c in info["ranuras_cfs"].items()}
    piezas = []
    for p in info["piezas"]:
        partes = []
        for f in sorted((IMP / "stl" / p).glob("*.stl")):
            color = f.stem.split("__")[1]
            m = trimesh.load(f, process=False)
            partes.append((f.stem.split("__")[2], color, m))
        lo = np.min([m.bounds[0] for _, _, m in partes], axis=0); hi = np.max([m.bounds[1] for _, _, m in partes], axis=0)
        piezas.append(dict(nombre=p, partes=partes, caja=(hi[0] - lo[0], hi[1] - lo[1]), centro=(lo + hi) / 2, zmin=lo[2]))
    pos = acomodar([pz["caja"] for pz in piezas])

    colores = [info["ranuras_cfs"][k] for k in sorted(info["ranuras_cfs"], key=int)]
    res, build, cfg_obj = [], [], []
    res.append('<basematerials id="1">' + "".join(f'<base name="{c}" displaycolor="{FIL[c]}FF"/>' for c in colores) + "</basematerials>")
    oid = 2
    for i, pz in enumerate(piezas):
        comp_ids, cfg_parts = [], []
        for nombre_parte, color, m in pz["partes"]:
            mm = m.copy(); mm.apply_translation([-pz["centro"][0], -pz["centro"][1], -pz["zmin"]])
            res.append(f'<object id="{oid}" type="model" pid="1" pindex="{colores.index(color)}" name="{nombre_parte}">{malla_xml(mm)}</object>')
            comp_ids.append(oid)
            cfg_parts.append(f'<part id="{oid}" subtype="normal_part"><metadata key="name" value="{nombre_parte}"/>'
                             f'<metadata key="extruder" value="{ranura[color]}"/></part>')
            oid += 1
        comps = "".join(f'<component objectid="{c}"/>' for c in comp_ids)
        res.append(f'<object id="{oid}" type="model" name="{pz["nombre"]}"><components>{comps}</components></object>')
        x, y = pos[i]
        build.append(f'<item objectid="{oid}" transform="1 0 0 0 1 0 0 0 1 {x:.3f} {y:.3f} 0" printable="1"/>')
        cfg_obj.append(f'<object id="{oid}"><metadata key="name" value="{pz["nombre"]}"/>'
                       f'<metadata key="extruder" value="{ranura[pz["partes"][0][1]]}"/>{"".join(cfg_parts)}</object>')
        oid += 1
    modelo = ('<?xml version="1.0" encoding="UTF-8"?>'
              '<model unit="millimeter" xml:lang="es-MX" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
              '<metadata name="Application">OrcaSlicer</metadata>'
              f'<metadata name="Title">Ajolote de Bolsillo · placa {n}</metadata>'
              f'<resources>{"".join(res)}</resources><build>{"".join(build)}</build></model>')
    inst = "".join(f'<model_instance><metadata key="object_id" value="{o.split(chr(34))[1]}"/><metadata key="instance_id" value="0"/>'
                   f'<metadata key="identify_id" value="{k + 1}"/></model_instance>' for k, o in enumerate(cfg_obj))
    config = ('<?xml version="1.0" encoding="UTF-8"?><config>' + "".join(cfg_obj) +
              f'<plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value="placa {n}"/>{inst}</plate></config>')
    tipos = ('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
             '<Default Extension="config" ContentType="text/xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
            '</Relationships>')
    ruta = OUT / f"placa_{n}.3mf"
    with zipfile.ZipFile(ruta, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", tipos); z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", modelo); z.writestr("Metadata/model_settings.config", config)
    # verificación: se vuelve a leer y se cuentan objetos
    sc = trimesh.load(ruta)
    n_geo = len(sc.geometry) if hasattr(sc, "geometry") else 1
    print(f"placa_{n}.3mf  piezas={len(piezas)}  partes={n_geo}  colores/ranuras={info['ranuras_cfs']}  {ruta.stat().st_size/1e6:.1f} MB")


for n, info in PL["placas"].items():
    placa(n, info)
