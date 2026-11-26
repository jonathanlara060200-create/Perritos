"""Lector de 3MF de Bambu Studio / MakerWorld (con componentes en 3D/Objects/*.model).

Devuelve, para cada objeto armado de la placa, sus partes ya transformadas a
coordenadas de cama: nombre de parte, extrusor (color) y malla trimesh.
"""
import re, zipfile
import numpy as np
import trimesh
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02",
      "p": "http://schemas.microsoft.com/3dmanufacturing/production/2015/06"}
P_PATH = "{%s}path" % NS["p"]


def _tf(s):
    if not s:
        return np.eye(4)
    v = [float(x) for x in s.split()]
    M = np.eye(4)
    M[:3, :3] = np.array(v[:9]).reshape(4 - 1, 3).T if False else np.array(
        [[v[0], v[3], v[6]], [v[1], v[4], v[7]], [v[2], v[5], v[8]]])
    M[:3, 3] = v[9:12]
    return M


def _mallas(xml_bytes):
    root = ET.fromstring(xml_bytes)
    objs = {}
    for o in root.iter("{%s}object" % NS["m"]):
        mesh = o.find("m:mesh", NS)
        comps = o.find("m:components", NS)
        if mesh is not None:
            V = np.array([[float(v.get(k)) for k in "xyz"]
                          for v in mesh.find("m:vertices", NS)], dtype=float)
            F = np.array([[int(t.get(k)) for k in ("v1", "v2", "v3")]
                          for t in mesh.find("m:triangles", NS)], dtype=np.int64)
            objs[o.get("id")] = ("mesh", (V, F), o.get("name"))
        elif comps is not None:
            lst = [(c.get(P_PATH), c.get("objectid"), _tf(c.get("transform")))
                   for c in comps.findall("m:component", NS)]
            objs[o.get("id")] = ("comp", lst, o.get("name"))
    return root, objs


def _config(z):
    """id de objeto -> {nombre, extrusor, partes: {id_parte: (nombre, extrusor)}}"""
    try:
        cfg = ET.fromstring(z.read("Metadata/model_settings.config"))
    except KeyError:
        return {}
    out = {}
    for o in cfg.findall("object"):
        meta = {m.get("key"): m.get("value") for m in o.findall("metadata")}
        partes = {}
        for p in o.findall("part"):
            pm = {m.get("key"): m.get("value") for m in p.findall("metadata")}
            partes[p.get("id")] = (pm.get("name", ""), int(pm.get("extruder", meta.get("extruder", 1))))
        out[o.get("id")] = dict(nombre=meta.get("name", ""),
                                extrusor=int(meta.get("extruder", 1)), partes=partes)
    return out


def leer(ruta):
    z = zipfile.ZipFile(ruta)
    archivos = {}

    def objs_de(path):
        path = path.lstrip("/")
        if path not in archivos:
            archivos[path] = _mallas(z.read(path))[1]
        return archivos[path]

    root, top = _mallas(z.read("3D/3dmodel.model"))
    archivos["3D/3dmodel.model"] = top
    cfg = _config(z)
    ensambles = []
    build = root.find("m:build", NS)
    for it in build.findall("m:item", NS):
        oid, M = it.get("objectid"), _tf(it.get("transform"))
        info = cfg.get(oid, dict(nombre="", extrusor=1, partes={}))
        partes = []

        def bajar(path, objid, T, parte_id=None):
            kind, data, nombre = objs_de(path)[objid]
            if kind == "mesh":
                V, F = data
                m = trimesh.Trimesh(V, F, process=False)
                m.apply_transform(T)
                nom, ext = info["partes"].get(parte_id or objid, (nombre or "", info["extrusor"]))
                partes.append(dict(id=parte_id or objid, nombre=nom, extrusor=ext, malla=m))
            else:
                for p, cid, Tc in data:
                    bajar(p or path, cid, T @ Tc, parte_id or (cid if objid == oid else None))

        bajar("3D/3dmodel.model", oid, M)
        ensambles.append(dict(id=oid, nombre=info["nombre"], partes=partes))
    return ensambles


def colores_filamento(ruta):
    z = zipfile.ZipFile(ruta)
    try:
        s = z.read("Metadata/project_settings.config").decode("utf-8", "ignore")
    except KeyError:
        return []
    m = re.search(r'"filament_colou?r"\s*:\s*\[([^\]]*)\]', s)
    return re.findall(r'"(#[0-9A-Fa-f]{6,8})"', m.group(1)) if m else []


if __name__ == "__main__":
    import sys
    for r in sys.argv[1:]:
        print("===", r.split("/")[-1], colores_filamento(r))
        for e in leer(r):
            print(" obj", e["id"], e["nombre"])
            for p in e["partes"]:
                b = p["malla"].bounds
                print(f"   parte {p['id']:>3} ext{p['extrusor']} {p['nombre'][:34]:<34} "
                      f"{(b[1]-b[0]).round(1)} z[{b[0][2]:.2f},{b[1][2]:.2f}] tris={len(p['malla'].faces)}")
