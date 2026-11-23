"""Relee un 3MF con cavidad NFC y genera una vista superior + corte para revisarlo."""
import re, sys, zipfile
import numpy as np, trimesh
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
f, tag, cx, cy, png = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
z = zipfile.ZipFile(f); name = next(n for n in z.namelist() if n.startswith("3D/Objects/"))
txt = z.read(name).decode()
cols = {"1": "#222222", "2": "#E9D8BC", "3": "#FFFFFF", "4": "#F6B7C9"}
ms = {}
for m in re.finditer(r'<object id="(\d+)"[^>]*><mesh><vertices>(.*?)</vertices><triangles>(.*?)</triangles>', txt, re.S):
    V = np.array(re.findall(r'x="([-\d.e]+)" y="([-\d.e]+)" z="([-\d.e]+)"', m.group(2)), float)
    F = np.array(re.findall(r'v1="(\d+)" v2="(\d+)" v3="(\d+)"', m.group(3)), int)
    ms[m.group(1)] = trimesh.Trimesh(V, F, process=False)
for k, m in ms.items():
    print(f"parte {k}: cerrada={m.is_watertight} volumen={m.volume:.1f} mm³")
fig, ax = plt.subplots(1, 2, figsize=(12, 6), gridspec_kw=dict(width_ratios=[1, 1.6]))
# vista superior: corte horizontal a media cavidad
for k, m in ms.items():
    if k != "1": continue
    sec = m.section(plane_origin=[0, 0, 1.0 if k == "1" else 2.5], plane_normal=[0, 0, 1])
    if sec is None: continue
    p2, T = sec.to_2D()
    for poly in p2.polygons_full:
        ext = np.c_[np.array(poly.exterior.coords), np.zeros(len(poly.exterior.coords)), np.ones(len(poly.exterior.coords))] @ T.T
        ax[0].fill(ext[:, 0], ext[:, 1], color=cols[k], ec="#555", lw=0.3, zorder=1 if k == "1" else 2)
        for h in poly.interiors:
            hi = np.c_[np.array(h.coords), np.zeros(len(h.coords)), np.ones(len(h.coords))] @ T.T
            ax[0].fill(hi[:, 0], hi[:, 1], color="#ffffff" if k == "1" else cols["1"], ec="#c00" if k == "1" else "#555", lw=0.8 if k == "1" else 0.3, zorder=1.5 if k == "1" else 2.5)
ax[0].add_patch(plt.Circle((cx, cy), tag / 2, color="#d4a017", alpha=0.85, label=f"tag NFC Ø{tag:.0f}", zorder=3))
ax[0].set_aspect("equal"); ax[0].set_title("Corte horizontal a z = 1.0 mm: cavidad (borde rojo) y tag"); ax[0].legend(loc="lower right", fontsize=8)
# corte vertical por el centro del tag
for k, m in ms.items():
    sec = m.section(plane_origin=[cx, 0, 0], plane_normal=[1, 0, 0])
    if sec is None: continue
    for e in sec.discrete:
        ax[1].fill(e[:, 1], e[:, 2], color=cols[k], ec="#555", lw=0.4)
ax[1].add_patch(plt.Rectangle((cy - tag / 2, 0.75), tag, 0.5, color="#d4a017", label="tag (~0.5 mm)"))
ax[1].set_aspect(4); ax[1].set_ylim(-0.3, 3.8); ax[1].set_xlabel("y (mm)"); ax[1].set_ylabel("z (mm) · grueso ×4")
ax[1].axhline(1.4, color="red", ls="--", lw=1); ax[1].text(ax[1].get_xlim()[0] + 1, 1.5, "PAUSA aquí (z = 1.4 mm): meter el tag", color="red", fontsize=8)
ax[1].set_title("Corte vertical por el centro del tag"); ax[1].legend(loc="upper right", fontsize=8)
plt.tight_layout(); plt.savefig(png, dpi=120)
