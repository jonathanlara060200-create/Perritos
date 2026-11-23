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

# --- de la referencia (dibujada con la base vista desde arriba) al objeto real, de frente
# El panel arranca donde termina la base real (ALTO_BASE). Para conservar 200 mm de alto y las
# proporciones de la referencia, todo lo de arriba de la base se escala parejo por ESCALA.
Y_BASE_REF = 35.6      # mm (en la referencia) donde el panel toca la base
ALTO_BASE = 20.0       # mm, altura real de la base
ALTO_TOTAL = 200.0
ESCALA = (ALTO_TOTAL - ALTO_BASE) / (ALTO_TOTAL - Y_BASE_REF)


def ref_a_modelo(x, y):
    return ESCALA * x, ALTO_BASE + ESCALA * (y - Y_BASE_REF)


def modelo_a_ref(x, y):
    return x / ESCALA, (y - ALTO_BASE) / ESCALA + Y_BASE_REF


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
        xr, yr = modelo_a_ref(self.X, self.Y)
        self.mapx = (xr * PX + CX).astype(np.float32)
        self.mapy = (Y1 - yr * PX).astype(np.float32)

    def de_ref(self, m_src: np.ndarray, suave_px: float = 1.1) -> np.ndarray:
        f = cv2.GaussianBlur(m_src.astype(np.float32), (0, 0), suave_px)
        v = cv2.remap(f, self.mapx, self.mapy, cv2.INTER_LINEAR, borderValue=0)
        return v > 0.5

    def poligono(self, pts_mm, en_ref=True) -> np.ndarray:
        """Rellena un polígono; por defecto sus puntos vienen en mm de la referencia."""
        m = np.zeros((self.R, self.C), np.uint8)
        pts = [ref_a_modelo(x, y) for x, y in pts_mm] if en_ref else pts_mm
        p = np.array([[(x - self.x0) / self.res, (self.y1 - y) / self.res] for x, y in pts], np.float32)
        cv2.fillPoly(m, [np.round(p * 8).astype(np.int32)], 1, shift=3)
        return m > 0

    def rect_redondeado(self, x0, x1, y0, y1, r) -> np.ndarray:
        """Rectángulo con esquinas redondeadas (mm del modelo)."""
        inner = (self.X >= x0 + r) & (self.X <= x1 - r) & (self.Y >= y0 + r) & (self.Y <= y1 - r)
        return self.offset(inner, r) & (self.X >= x0) & (self.X <= x1) & (self.Y >= y0) & (self.Y <= y1)

    def texto(self, lineas, fuente, espejo=False) -> np.ndarray:
        """Rasteriza líneas de texto [(texto, alto_mm, x_centro_mm, y_centro_mm)] con una fuente TTF."""
        from PIL import ImageDraw, ImageFont
        img = Image.new("L", (self.C, self.R), 0); d = ImageDraw.Draw(img)
        for t, alto, xc, yc in lineas:
            f = ImageFont.truetype(fuente, int(round(alto / self.res)))
            px, py = (xc - self.x0) / self.res, (self.y1 - yc) / self.res
            d.text((px, py), t, font=f, fill=255, anchor="mm")
        m = np.asarray(img) > 127
        if espejo:   # espejo respecto a x = 0
            cols = np.round((-(self.X[0]) - self.x0) / self.res - 0.5).astype(int)
            ok = (cols >= 0) & (cols < self.C)
            out = np.zeros_like(m); out[:, ok] = m[:, cols[ok]]; m = out
        return m

    def dist(self, m: np.ndarray) -> np.ndarray:
        """Distancia (mm) de cada celda interior al borde."""
        return cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE) * self.res

    def offset(self, m: np.ndarray, mm: float) -> np.ndarray:
        """Crece (+) o encoge (−) una máscara en mm."""
        if mm == 0:
            return m.copy()
        if mm > 0:
            return cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE) * self.res <= mm
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


def suavizar(top: np.ndarray, dentro: np.ndarray, sigma_celdas: float = 1.5) -> np.ndarray:
    """Suaviza las alturas solo dentro de la pieza (convolución normalizada) para quitar escalones."""
    if sigma_celdas <= 0:
        return top
    w = dentro.astype(np.float32)
    num = cv2.GaussianBlur((np.where(dentro, top, 0)).astype(np.float32), (0, 0), sigma_celdas)
    den = cv2.GaussianBlur(w, (0, 0), sigma_celdas)
    return np.where(dentro, num / np.maximum(den, 1e-6), top)


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
