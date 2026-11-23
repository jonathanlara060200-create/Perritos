"""Lámina de la Fase 1: referencia con contornos + piezas reconstruidas en colores de filamento, con regla en mm."""
import json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent; F1 = HERE / "fase1"
M = json.load(open(F1 / "medidas.json")); PX = M["px_por_mm"]; CX = M["centro_x_px"]; Y1 = M["piso_y_px"]
ref = Image.open(HERE / "referencia_frente.webp").convert("RGB")
W, H = ref.size
mask = lambda k: np.asarray(Image.open(F1 / f"mascara_{k}.png")) > 0
FIL = dict(azul=(159, 203, 234), rosa=(246, 183, 201), morado=(155, 123, 196), amarillo=(247, 227, 154),
           negro=(34, 34, 34), blanco=(255, 255, 255))
# orden de capas de atrás hacia adelante
capas = [("panel", "azul"), ("base", "azul"), ("costuras", "amarillo"), ("bolsillo", "azul"), ("bolsillo_franja", "azul"),
         ("burbujas", "blanco"), ("alga", "morado"), ("ajolote", "negro"), ("ajolote_morado", "morado"), ("ajolote_rosa", "rosa"),
         ("ojos_brillos", "blanco"), ("placas_qr", "blanco"), ("texto_bolsillo", "blanco"),
         ("boton_instagram", "morado"), ("boton_whatsapp", "rosa"), ("boton_tarjeta", "azul"), ("texto_base", "blanco")]
rec = np.full((H, W, 3), 250, np.uint8)
for k, c in capas:
    m = mask(k)
    col = np.array(FIL[c])
    if k in ("bolsillo", "bolsillo_franja"):
        col = (col * (0.9 if k == "bolsillo" else 0.82)).astype(int)   # tono para distinguir capas del mismo color
    if k == "costuras":
        m = m & ~mask("bolsillo") | (m & mask("bolsillo"))
    rec[m] = col
# costuras y QR por encima
rec[mask("costuras")] = FIL["amarillo"]
qr = mask("placas_qr"); a = np.asarray(ref)
rec[qr & (a.sum(-1) < 300)] = FIL["negro"]
out = Image.fromarray(rec); d = ImageDraw.Draw(out)
# regla mm cada 10 mm
for mm in range(0, 201, 10):
    y = Y1 - mm * PX
    d.line([(0, y), (12 if mm % 50 else 26, y)], fill=(200, 0, 0), width=2)
    if mm % 50 == 0: d.text((30, y - 6), f"{mm} mm", fill=(200, 0, 0))
for mm in range(-90, 91, 10):
    x = CX + mm * PX
    d.line([(x, H - 1), (x, H - (12 if mm % 50 else 26))], fill=(200, 0, 0), width=2)
lam = Image.open(F1 / "lamina_contornos.png").convert("RGB")
sheet = Image.new("RGB", (W * 2 + 40, H + 70), "white"); sd = ImageDraw.Draw(sheet)
sheet.paste(lam, (0, 70)); sheet.paste(out, (W + 40, 70))
sd.text((10, 15), "Referencia con contornos calcados (cada color = una pieza)", fill=(0, 0, 0))
sd.text((W + 50, 15), "Piezas reconstruidas en tus filamentos · regla en mm (200 mm de alto)", fill=(0, 0, 0))
sheet.save(F1 / "fase1_lamina.png")
sheet.resize((sheet.width // 2, sheet.height // 2)).save(F1 / "fase1_lamina_chica.png")
