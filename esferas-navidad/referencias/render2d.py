"""Vista superior rápida (matplotlib) de partes coloreadas, ordenadas por altura."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import numpy as np


def dibujar(grupos, png, titulo=None, tam=6, limites=None):
    """grupos: lista de (malla trimesh, color hex). Se pintan por z máxima."""
    fig, ax = plt.subplots(figsize=(tam, tam), dpi=150)
    capas = []
    for m, c in grupos:
        V, F = m.vertices, m.faces
        n = m.face_normals[:, 2]
        sel = n > 0.3                      # solo caras que miran hacia arriba
        tri = V[F[sel]]
        z = tri[:, :, 2].mean(axis=1)
        luz = 0.75 + 0.25 * n[sel]
        capas.append((tri, z, c, luz))
    todos = []
    for tri, z, c, luz in capas:
        rgb = np.array(matplotlib.colors.to_rgb(c))
        for t, zz, l in zip(tri, z, luz):
            todos.append((zz, t[:, :2], np.clip(rgb * l, 0, 1)))
    todos.sort(key=lambda x: x[0])
    ax.add_collection(PolyCollection([t for _, t, _ in todos],
                                     facecolors=[c for _, _, c in todos],
                                     edgecolors=[c for _, _, c in todos], linewidths=0.2))
    if limites:
        ax.set_xlim(limites[0]); ax.set_ylim(limites[1])
    else:
        ax.autoscale()
    ax.set_aspect("equal"); ax.axis("off")
    fig.patch.set_facecolor("#2b2b2b")
    if titulo:
        ax.set_title(titulo, color="white")
    fig.savefig(png, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
