"""Corte de la base por un botón: muestra alojamiento, cavidad del tag NFC y orificio para expulsar."""
import pathlib
import numpy as np
import trimesh
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

D = pathlib.Path(__file__).parent / "totem" / "stl"
base = trimesh.load(D / "base.stl"); btn = trimesh.load(D / "boton_instagram.stl"); ic = trimesh.load(D / "boton_instagram_icono.stl")
print("base cerrada:", base.is_watertight, "| volumen cm3:", round(base.volume / 1000, 1), "| caja:", base.bounds.round(1).tolist())
print("botón cerrado:", btn.is_watertight, "| caja:", btn.bounds.round(1).tolist())
x = float(btn.bounds.mean(0)[0]); yc = float(btn.bounds.mean(0)[1])
fig, ax = plt.subplots(figsize=(10, 3.8))
for m, c, lab in ((base, "#9FCBEA", "base"), (btn, "#9B7BC4", "botón = tapa"), (ic, "#ffffff", "ícono")):
    sec = m.section(plane_origin=[x, 0, 0], plane_normal=[1, 0, 0])
    if sec is None:
        continue
    for ent in sec.discrete:
        ys, zs = ent[:, 1], ent[:, 2]
        ax.fill(ys, zs, color=c, ec="#333", lw=0.6, label=lab); lab = None
zt = float(btn.bounds[0][2])
ax.add_patch(plt.Rectangle((yc - 12.5, zt - 0.95), 25, 0.5, color="#d4a017", label="tag NFC Ø25 mm"))
ax.set_aspect("equal"); ax.set_xlim(-66, 16); ax.set_ylim(-1, 27)
ax.set_xlabel("profundidad (mm) · frente a la izquierda"); ax.set_ylabel("altura (mm)")
ax.set_title("Corte por el botón de Instagram")
ax.legend(loc="upper right", fontsize=8); plt.tight_layout()
plt.savefig(pathlib.Path(__file__).parent / "fase4" / "corte_boton_nfc.png", dpi=130)
