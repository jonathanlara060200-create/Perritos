"""Fase 6: lámina con las 4 vistas ortográficas (frente, espalda, lado izq., lado der.) y medidas."""
import json, pathlib, sys
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE)); import relieve as R
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
F = str(HERE.parent / "vendor" / "fonts" / "Fredoka-600.ttf")
f_t, f_s = ImageFont.truetype(F, 44), ImageFont.truetype(F, 28)
vistas = [("Frente", "frente_wb.png"), ("Espalda", "espalda.png"), ("Lado izquierdo", "lado_izq.png"), ("Lado derecho", "lado_der.png")]
ims = [(t, Image.open(src / f).convert("RGB")) for t, f in vistas]
H = max(i.height for _, i in ims); pad = 40
W = sum(i.width for _, i in ims) + pad * (len(ims) + 1)
sheet = Image.new("RGB", (W, H + 260), (250, 248, 245)); d = ImageDraw.Draw(sheet)
d.text((pad, 30), "Ajolote de Bolsillo · tótem 20 cm · vistas ortográficas (misma escala)", font=f_t, fill=(40, 40, 40))
x = pad
px_mm = (R.PX / R.ESCALA)  # px por mm en los renders ortográficos
for t, im in ims:
    sheet.paste(im, (x, 120)); d.text((x, 120 + im.height + 10), t, font=f_s, fill=(60, 60, 60)); x += im.width + pad
# regla de 50 mm
y0 = H + 200; d.line([(pad, y0), (pad + 50 * px_mm, y0)], fill=(192, 57, 43), width=6)
d.text((pad + 50 * px_mm + 15, y0 - 18), "50 mm", font=f_s, fill=(192, 57, 43))
md = json.load(open(HERE / "totem" / "medidas_modelo.json"))
d.text((pad + 50 * px_mm + 160, y0 - 18), f"Alto 200 mm · base 199 × 76 mm · escala del panel ×{md['escala']:.3f} sobre la referencia",
       font=f_s, fill=(60, 60, 60))
sheet.save(out); sheet.resize((sheet.width // 2, sheet.height // 2)).save(out.with_name(out.stem + "_chica.png"))
print("ok", sheet.size)
