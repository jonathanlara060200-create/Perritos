"""Convierte zonas calcadas de la referencia en sólidos 3D imprimibles (relieve "almohadilla").

Cada pieza es una malla cerrada: base plana (z0), paredes verticales siguiendo el contorno calcado y
una cara superior con altura por punto. La altura sale de la distancia al borde, así los bordes quedan
redondeados (radio r) y el centro plano, o abombado si se pide domo.

Coordenadas "planas" (en mm): X derecha, Y altura sobre el mostrador, Z hacia el frente desde la cara del panel.
"""
from __future__ import annotations

import json
import pathlib

import cv2
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent
F1 = HERE / "fase1"
MED = json.load(open(F1 / "medidas.json"))
PX = MED["px_por_mm"]; CX = MED["centro_x_px"]; Y1 = MED["piso_y_px"]
RES = 0.1  # mm por celda de la rejilla de modelado


def mascara(nombre: str) -> np.ndarray:
    return np.asarray(Image.open(F1 / f"mascara_{nombre}.png")) > 0


def componentes(m: np.ndarray, min_px: int = 150, abrir: int = 3):
    mm = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((abrir, abrir), np.uint8)) if abrir else m.astype(np.uint8)
    n, l, st, c = cv2.connectedComponentsWithStats(mm)
    out = []
    for i in range(1, n):
        if st[i][4] >= min_px:
            out.append(dict(mask=(l == i), cx=float(c[i][0]), cy=float(c[i][1]), area=int(st[i][4])))
    return out


class Rejilla:
    """Rejilla en mm que cubre una caja; convierte máscaras de la referencia a alta resolución."""

    def __init__(self, x0, x1, y0, y1, res=RES):
        self.res = res
        self.x0, self.y1 = x0, y1
        self.C = int(np.ceil((x1 - x0) / res)); self.R = int(np.ceil((y1 - y0) / res))
        cols = x0 + (np.arange(self.C) + 0.5) * res
        rows = y1 - (np.arange(self.R) + 0.5) * res
        self.X, self.Y = np.meshgrid(cols, rows)
        self.mapx = (self.X * PX + CX).astype(np.float32)
        self.mapy = (Y1 - self.Y * PX).astype(np.float32)

    def de_ref(self, m_src: np.ndarray, suave_px: float = 1.1) -> np.ndarray:
        f = cv2.GaussianBlur(m_src.astype(np.float32), (0, 0), suave_px)
        v = cv2.remap(f, self.mapx, self.mapy, cv2.INTER_LINEAR, borderValue=0)
        return v > 0.5

    def poligono(self, pts_mm) -> np.ndarray:
        m = np.zeros((self.R, self.C), np.uint8)
        p = np.array([[(x - self.x0) / self.res, (self.y1 - y) / self.res] for x, y in pts_mm], np.float32)
        cv2.fillPoly(m, [np.round(p * 8).astype(np.int32)], 1, shift=3)
        return m > 0

    def dist(self, m: np.ndarray) -> np.ndarray:
        """Distancia (mm) de cada celda interior al borde."""
        return cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5) * self.res

    def offset(self, m: np.ndarray, mm: float) -> np.ndarray:
        """Crece (+) o encoge (−) una máscara en mm."""
        if mm == 0:
            return m.copy()
        if mm > 0:
            return cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, 5) * self.res <= mm
        return self.dist(m) > -mm


def almohada(d: np.ndarray, alto: float, r: float, domo: float = 0.0, d_max: float | None = None) -> np.ndarray:
    """Perfil de altura: borde redondeado de radio r (cuarto de círculo) + domo opcional hacia el centro."""
    r = max(min(r, alto), 1e-3)
    dd = np.minimum(d, r)
    h = (alto - r) + np.sqrt(np.maximum(r * r - (r - dd) ** 2, 0))
    if domo > 0:
        dm = d_max if d_max else max(float(d.max()), 1e-3)
        t = np.clip((d - r) / max(dm - r, 1e-3), 0, 1)
        h = h + domo * np.sin(t * np.pi / 2)
    return h


def sin_pellizcos(m: np.ndarray) -> np.ndarray:
    """Quita celdas que solo se tocan por una esquina (darían aristas no manifold)."""
    m = m.copy()
    for _ in range(20):
        a, b, c, d = m[:-1, :-1], m[:-1, 1:], m[1:, :-1], m[1:, 1:]
        p1 = a & d & ~b & ~c
        p2 = b & c & ~a & ~d
        if not (p1.any() or p2.any()):
            break
        bb = np.zeros_like(m); bb[:-1, 1:] |= p1; bb[:-1, :-1] |= p2
        m |= bb
    return m


def malla(rej: Rejilla, dentro: np.ndarray, top: np.ndarray, bot) -> tuple[np.ndarray, np.ndarray]:
    """Malla cerrada (vértices, caras quad) de una columna por celda con alturas top/bot por celda."""
    dentro = sin_pellizcos(dentro)
    bot = np.broadcast_to(np.asarray(bot, float), dentro.shape)
    R, C = dentro.shape
    ins = dentro.astype(float)

    def esquinas(val):
        v = np.where(dentro, val, 0.0)
        p = np.pad(v, 1); m = np.pad(ins, 1)
        s = p[:-1, :-1] + p[:-1, 1:] + p[1:, :-1] + p[1:, 1:]
        n = m[:-1, :-1] + m[:-1, 1:] + m[1:, :-1] + m[1:, 1:]
        return s / np.maximum(n, 1), n > 0

    ct, usado = esquinas(top)
    cb, _ = esquinas(bot)
    idx = -np.ones((R + 1, C + 1), np.int64)
    ii = np.argwhere(usado)
    idx[usado] = np.arange(len(ii))
    xs = rej.x0 + ii[:, 1] * rej.res
    ys = rej.y1 - ii[:, 0] * rej.res
    nv = len(ii)
    verts = np.vstack([np.c_[xs, ys, ct[usado]], np.c_[xs, ys, cb[usado]]])
    cells = np.argwhere(dentro)
    r, c = cells[:, 0], cells[:, 1]
    a, b, cc, d = idx[r, c], idx[r, c + 1], idx[r + 1, c + 1], idx[r + 1, c]
    caras = [np.c_[a, d, cc, b], np.c_[a, b, cc, d] + nv]
    pad = np.pad(dentro, 1)
    # paredes: arriba (r-1), abajo (r+1), izquierda (c-1), derecha (c+1)
    up = ~pad[r, c + 1]; dn = ~pad[r + 2, c + 1]; lf = ~pad[r + 1, c]; rt = ~pad[r + 1, c + 2]
    caras.append(np.c_[a[up], b[up], b[up] + nv, a[up] + nv])
    caras.append(np.c_[cc[dn], d[dn], d[dn] + nv, cc[dn] + nv])
    caras.append(np.c_[d[lf], a[lf], a[lf] + nv, d[lf] + nv])
    caras.append(np.c_[b[rt], cc[rt], cc[rt] + nv, b[rt] + nv])
    return verts, np.vstack(caras)
