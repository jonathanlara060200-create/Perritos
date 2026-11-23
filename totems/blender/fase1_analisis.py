"""Fase 1: medir la referencia (vista frontal) y sacar una máscara + contorno por pieza.

Entrada:  totems/blender/referencia_frente.webp
Salida:   totems/blender/fase1/  (máscaras PNG, contornos JSON en mm, lámina de revisión)
Escala:   el tótem mide 200 mm de alto en la imagen (1280 px) → 6.4 px/mm.
"""
import json, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
OUT = HERE / "fase1"; OUT.mkdir(exist_ok=True)
a = np.asarray(Image.open(HERE / "referencia_frente.webp").convert("RGB"))
Hh, Ww = a.shape[:2]

# ---------------- clases de color
f = cv2.bilateralFilter(a, 7, 25, 7)
hsv = cv2.cvtColor(f, cv2.COLOR_RGB2HSV).astype(int)
H, S, V = hsv[..., 0] * 2, hsv[..., 1], hsv[..., 2]
white = ((S < 30) & (V > 235)).astype(np.uint8)
_, lab = cv2.connectedComponents(white)
bg = np.isin(lab, [lab[0, 0], lab[0, -1], lab[-1, 0], lab[-1, -1]])
fg = ~bg
ys, xs = np.where(fg)
Y0, Y1, X0, X1 = ys.min(), ys.max(), xs.min(), xs.max()
PX_MM = (Y1 - Y0) / 200.0
CX = (X0 + X1) / 2

negro = (V < 95) & fg
blanco = (S < 40) & (V > 190) & fg
amarillo = (H >= 40) & (H < 75) & (S >= 60) & (V > 120) & fg
azul = (H >= 185) & (H < 215) & (S >= 60) & (V >= 95) & fg
azul_f = (H >= 215) & (H < 245) & (S >= 90) & (V >= 95) & fg
morado = (H >= 245) & (H < 305) & (S >= 60) & (V >= 95) & fg
rosa = ((H >= 305) | (H < 20)) & (S >= 40) & (V >= 170) & fg & ~blanco

def clean(m, k=3):
    m = m.astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    return m > 0

def comp_at(mask, pt):
    n, l = cv2.connectedComponents(mask.astype(np.uint8))
    return l == l[pt[1], pt[0]]

def fill_holes(m):
    m = m.astype(np.uint8).copy()
    h, w = m.shape
    ff = m.copy(); msk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, msk, (0, 0), 1)
    return (m | (1 - ff)) > 0

yy, xx = np.mgrid[0:Hh, 0:Ww]
BASE_LINE = 1062          # donde el panel entra a la base (borde trasero de la cara superior)

partes = {}
# --- ajolote: todo lo que no es azul ni fondo, conectado a la cabeza, arriba del bolsillo
no_azul = fg & ~azul & ~amarillo
axo = comp_at(clean(no_azul & (yy < 470)), (600, 200))
axo = fill_holes(axo)
partes["ajolote"] = axo
partes["ajolote_contorno_negro"] = negro & axo
partes["ajolote_rosa"] = rosa & axo
partes["ajolote_morado"] = morado & axo
partes["ojos_brillos"] = blanco & axo
# manitas = rosa del ajolote debajo del borde del bolsillo
partes["manitas"] = fill_holes(axo & (yy > 392)) & ~((xx > 540) & (xx < 660))

# --- burbujas: componentes blancos a la izquierda
n, l, st, cen = cv2.connectedComponentsWithStats(clean(blanco).astype(np.uint8))
burb = []
bmask = np.zeros_like(fg)
for i in range(1, n):
    x, y, w, h, area = st[i]
    if cen[i][0] < 310 and 340 < cen[i][1] < 1020 and area > 300:
        bmask |= fill_holes(l == i)
        burb.append(dict(cx_px=float(cen[i][0]), cy_px=float(cen[i][1]), d_px=float((w + h) / 2)))
partes["burbujas"] = bmask

# --- alga: morado a la derecha, abajo
alga = clean(morado & (xx > 880) & (yy > 560) & (yy < BASE_LINE + 15), 5)
partes["alga"] = fill_holes(alga)

# --- placas QR y textos del bolsillo
qr = np.zeros_like(fg); qrs = []
n, l, st, cen = cv2.connectedComponentsWithStats((blanco | negro).astype(np.uint8))
for i in range(1, n):
    x, y, w, h, area = st[i]
    if 700 < cen[i][1] < 980 and 350 < cen[i][0] < 900 and w > 150 and h > 150:
        m = fill_holes(l == i); qr |= m
        qrs.append(dict(x_px=int(x), y_px=int(y), w_px=int(w), h_px=int(h)))
partes["placas_qr"] = qr
partes["texto_bolsillo"] = clean(blanco & (yy > 470) & (yy < 712) & (xx > 330) & (xx < 900), 2)

# --- botones NFC (vista con perspectiva: elipses)
btn = {}
for nombre, m, cx in (("instagram", morado, 305), ("whatsapp", rosa, 600), ("tarjeta", azul_f, 905)):
    zona = clean(m & (yy > BASE_LINE) & (yy < 1185) & (abs(xx - cx) < 140), 5).astype(np.uint8)
    n_, l_, st_, _ = cv2.connectedComponentsWithStats(zona)
    c = fill_holes(l_ == (1 + int(np.argmax(st_[1:, 4]))))
    partes[f"boton_{nombre}"] = c
    ys_, xs_ = np.where(c)
    btn[nombre] = dict(cx_px=float(xs_.mean()), cy_px=float(ys_.mean()), ancho_px=int(xs_.max() - xs_.min()),
                       alto_px=int(ys_.max() - ys_.min()))
partes["texto_base"] = clean(blanco & (yy > 1185), 2)

# --- costuras: cada puntada es una pieza
cost = clean(amarillo, 2)
partes["costuras"] = cost

# --- base: todo lo de abajo de la línea de la base
base = fg & (yy >= BASE_LINE)
partes["base"] = fill_holes(base)

# --- bolsillo: contorno exterior medido en acercamientos de la referencia (px), suavizado
POCKET_PX = [(272, 412), (276, 408), (284, 406), (936, 407), (944, 409), (947, 414), (935, 730),
             (920, 900), (905, 955), (885, 980), (605, 1063), (333, 977), (315, 950), (307, 900), (293, 730)]
HEM_FOLD_PX = 457   # doblez de la franja superior del bolsillo

def chaikin(pts, n=3):
    for _ in range(n):
        q = []
        for i in range(len(pts)):
            p0, p1 = np.array(pts[i], float), np.array(pts[(i + 1) % len(pts)], float)
            q += [tuple(0.75 * p0 + 0.25 * p1), tuple(0.25 * p0 + 0.75 * p1)]
        pts = q
    return pts

pk_poly = np.array(chaikin(POCKET_PX, 2), np.int32)
pocket = np.zeros(fg.shape, np.uint8); cv2.fillPoly(pocket, [pk_poly], 1)
partes["bolsillo"] = pocket > 0
partes["bolsillo_franja"] = (pocket > 0) & (yy < HEM_FOLD_PX)

# --- panel trasero: silueta de todo lo de arriba de la base, menos el alga que sale del panel
arriba = fg & (yy < BASE_LINE + 6)
panel = fill_holes(cv2.morphologyEx(arriba.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0)
alga_fuera = partes["alga"] & ~cv2.dilate((azul & (xx > 880)).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
panel_sin_alga = panel & ~((xx > 1078) & partes["alga"])
partes["panel"] = panel_sin_alga


# ---------------- contornos en mm (origen: centro abajo; Y hacia arriba)
def to_mm(pt):
    return [round((pt[0] - CX) / PX_MM, 3), round((Y1 - pt[1]) / PX_MM, 3)]

contornos, medidas = {}, {}
for k, m in partes.items():
    m8 = m.astype(np.uint8) * 255
    cs, hier = cv2.findContours(m8, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c, h in zip(cs, hier[0] if hier is not None else []):
        if cv2.contourArea(c) < 25:
            continue
        c = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
        polys.append(dict(hueco=bool(h[3] >= 0), puntos_mm=[to_mm(p) for p in c]))
    contornos[k] = polys
    ys_, xs_ = np.where(m)
    if len(xs_):
        medidas[k] = dict(ancho_mm=round((xs_.max() - xs_.min()) / PX_MM, 1),
                          alto_mm=round((ys_.max() - ys_.min()) / PX_MM, 1),
                          x_mm=[round((xs_.min() - CX) / PX_MM, 1), round((xs_.max() - CX) / PX_MM, 1)],
                          y_mm=[round((Y1 - ys_.max()) / PX_MM, 1), round((Y1 - ys_.min()) / PX_MM, 1)])
    Image.fromarray(m8).save(OUT / f"mascara_{k}.png")

json.dump(dict(px_por_mm=PX_MM, centro_x_px=CX, piso_y_px=int(Y1), medidas=medidas,
               burbujas=[dict(x_mm=round((b["cx_px"] - CX) / PX_MM, 1), y_mm=round((Y1 - b["cy_px"]) / PX_MM, 1),
                              d_mm=round(b["d_px"] / PX_MM, 1)) for b in burb],
               botones=btn, placas_qr=qrs, puntadas=int(cv2.connectedComponents(cost.astype(np.uint8))[0] - 1)),
          open(OUT / "medidas.json", "w"), indent=1, ensure_ascii=False)
json.dump(contornos, open(OUT / "contornos_mm.json", "w"))

# ---------------- lámina de revisión: cada pieza en su color sobre la referencia
colores = {"panel": (0, 120, 255), "bolsillo": (0, 200, 120), "ajolote": (255, 0, 180), "manitas": (255, 120, 0),
           "burbujas": (0, 0, 0), "alga": (120, 0, 200), "placas_qr": (255, 0, 0), "texto_bolsillo": (200, 150, 0),
           "base": (0, 80, 160), "boton_instagram": (255, 0, 0), "boton_whatsapp": (255, 0, 0), "boton_tarjeta": (255, 0, 0),
           "texto_base": (200, 150, 0)}
over = Image.fromarray((a * 0.45 + 140).clip(0, 255).astype(np.uint8))
d = ImageDraw.Draw(over)
for k, col in colores.items():
    for p in contornos.get(k, []):
        pts = [((x * PX_MM + CX), (Y1 - y * PX_MM)) for x, y in p["puntos_mm"]]
        if len(pts) > 2:
            d.line(pts + [pts[0]], fill=col, width=3)
over.save(OUT / "lamina_contornos.png")
print(json.dumps(medidas, indent=0, ensure_ascii=False)[:3000])
