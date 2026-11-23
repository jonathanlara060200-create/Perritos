"""Agrega una cavidad sellada para tag NFC a una placa 3MF (Bambu Studio / Creality Print).

Uso:
  python3 agregar_nfc.py entrada.3mf salida.3mf --tag 20 [--escala 1.0] [--parte 1]

- Busca el círculo más grande que cabe dentro de la silueta de la placa y centra ahí el tag.
- Corta la cavidad en la parte base (por defecto la 1, el color que va abajo), entre z = PISO y PISO + PROF:
  queda sellada por arriba y por abajo. Se imprime con una PAUSA al terminar la capa del techo de la cavidad
  para meter el tag.
- --escala agranda la placa solo a lo ancho y a lo alto (el grueso no cambia), por si el tag no cabe.
"""
import argparse, re, sys, zipfile, json
import numpy as np, cv2, trimesh

ap = argparse.ArgumentParser()
ap.add_argument("entrada"); ap.add_argument("salida")
ap.add_argument("--tag", type=float, default=25.0, help="diámetro del tag NFC (mm)")
ap.add_argument("--holgura", type=float, default=0.3, help="holgura por lado (mm)")
ap.add_argument("--prof", type=float, default=0.8, help="alto de la cavidad (mm); tags de ~0.5 mm")
ap.add_argument("--piso", type=float, default=0.6, help="material debajo de la cavidad (mm)")
ap.add_argument("--pared", type=float, default=1.2, help="pared mínima alrededor de la cavidad (mm)")
ap.add_argument("--escala", type=float, default=1.0)
ap.add_argument("--parte", default="1", help="id del objeto base dentro del 3MF")
ap.add_argument("--reemplazar", action="store_true", help="quita la cavidad interna que ya tenga la placa antes de cortar la nueva")
a = ap.parse_args()

zin = zipfile.ZipFile(a.entrada)
mod_name = next(n for n in zin.namelist() if n.startswith("3D/Objects/") and n.endswith(".model"))
txt = zin.read(mod_name).decode("utf-8")
pat = re.compile(r'(<object id="(\d+)"[^>]*>)<mesh><vertices>(.*?)</vertices><triangles>(.*?)</triangles></mesh>', re.S)
objs = {}
for m in pat.finditer(txt):
    V = np.array(re.findall(r'x="([-\d.e]+)" y="([-\d.e]+)" z="([-\d.e]+)"', m.group(3)), float)
    F = np.array(re.findall(r'v1="(\d+)" v2="(\d+)" v3="(\d+)"', m.group(4)), int)
    objs[m.group(2)] = dict(head=m.group(1), V=V, F=F, span=m.span())

# escala en planta (alrededor del centro de la placa)
allV = np.vstack([o["V"] for o in objs.values()])
c0 = (allV[:, :2].min(0) + allV[:, :2].max(0)) / 2
for o in objs.values():
    o["V"][:, :2] = c0 + (o["V"][:, :2] - c0) * a.escala

# silueta y círculo inscrito más grande
res = 0.05
allV = np.vstack([o["V"] for o in objs.values()])
x0, y0 = allV[:, 0].min() - 1, allV[:, 1].min() - 1; x1, y1 = allV[:, 0].max() + 1, allV[:, 1].max() + 1
W, H = int((x1 - x0) / res) + 1, int((y1 - y0) / res) + 1
sil = np.zeros((H, W), np.uint8)
for o in objs.values():
    pts = np.stack([(o["V"][:, 0] - x0) / res, (y1 - o["V"][:, 1]) / res], -1)
    for tri in np.round(pts[o["F"]] * 16).astype(np.int32):
        cv2.fillConvexPoly(sil, tri, 1, shift=4)
sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
inv = (1 - sil).astype(np.uint8); n, l, st, _ = cv2.connectedComponentsWithStats(inv)
for i in range(1, n):
    if i != l[0, 0] and st[i][4] * res * res < 6:
        sil[l == i] = 1
d = cv2.distanceTransform(sil, cv2.DIST_L2, cv2.DIST_MASK_PRECISE) * res
r, c = np.unravel_index(np.argmax(d), d.shape)
cx, cy = x0 + c * res, y1 - r * res
rad = a.tag / 2 + a.holgura
pared = float(d.max() - rad)
info = dict(tamano_mm=[round(float(np.ptp(allV[:, 0])), 1), round(float(np.ptp(allV[:, 1])), 1), round(float(np.ptp(allV[:, 2])), 2)],
            circulo_max_mm=round(2 * float(d.max()), 2), centro_tag=[round(cx, 2), round(cy, 2)], tag_mm=a.tag,
            cavidad_diam_mm=round(2 * rad, 2), pared_min_mm=round(pared, 2), escala=a.escala)
if pared < a.pared:
    sys.exit(f"NO CABE: {json.dumps(info, ensure_ascii=False)}  (pared {pared:.2f} < {a.pared})")

# cavidad: cilindro en la parte base, sellado arriba y abajo
base = objs[a.parte]
zmin = base["V"][:, 2].min()
z_ini, z_fin = zmin + a.piso, zmin + a.piso + a.prof
# todas las capas de color deben quedar arriba del techo de la cavidad
techo_min = min(o["V"][:, 2].min() for k, o in objs.items() if k != a.parte)
if z_fin > techo_min - 0.4:
    sys.exit(f"la cavidad (hasta z={z_fin:.2f}) choca con los colores (desde z={techo_min:.2f})")
cil = trimesh.creation.cylinder(radius=rad, height=a.prof, sections=128)
cil.apply_translation([cx, cy, (z_ini + z_fin) / 2])
mb = trimesh.Trimesh(base["V"], base["F"], process=True)
cuerpos = mb.split(only_watertight=False)
huecos = [b for b in cuerpos if b.volume < 0]
if huecos and not a.reemplazar:
    sys.exit(f"la placa ya tiene {len(huecos)} cavidad(es) interna(s): " +
             "; ".join(f"Ø≈{np.ptp(b.vertices[:, 0]):.1f} mm en ({b.bounds.mean(0)[0]:.2f}, {b.bounds.mean(0)[1]:.2f})" for b in huecos) +
             ". Usa --reemplazar para cambiarla.")
if huecos:
    mb = trimesh.util.concatenate([b for b in cuerpos if b.volume > 0])
    info["cavidad_anterior_quitada"] = [round(float(np.ptp(b.vertices[:, 0])), 2) for b in huecos]
nuevo = trimesh.boolean.difference([mb, cil], engine="manifold")
assert nuevo.is_watertight, "la pieza no quedó cerrada"
info.update(volumen_cavidad_mm3=round(float(mb.volume - nuevo.volume), 1), cavidad_z=[round(z_ini, 2), round(z_fin, 2)],
            pausa_en_z=round(z_fin, 2), pieza_cerrada=bool(nuevo.is_watertight))
base["V"], base["F"] = np.asarray(nuevo.vertices), np.asarray(nuevo.faces)


def mesh_xml(V, F):
    vs = "".join(f'<vertex x="{x:.6f}" y="{y:.6f}" z="{z:.6f}"/>' for x, y, z in V)
    ts = "".join(f'<triangle v1="{p}" v2="{q}" v3="{r}"/>' for p, q, r in F)
    return f"<mesh><vertices>{vs}</vertices><triangles>{ts}</triangles></mesh>"


out, last = [], 0
for k, o in sorted(objs.items(), key=lambda kv: kv[1]["span"][0]):
    s0, s1 = o["span"]
    out.append(txt[last:s0]); out.append(o["head"] + mesh_xml(o["V"], o["F"])); last = s1
out.append(txt[last:])
with zipfile.ZipFile(a.salida, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = "".join(out).encode("utf-8") if item.filename == mod_name else zin.read(item.filename)
        zout.writestr(item, data)
print(json.dumps(info, ensure_ascii=False))
