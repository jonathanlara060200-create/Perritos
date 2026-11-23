"""Escanea los QR de un render y los compara con los links esperados.

Uso: python3 totems/tools/verificar_qr.py render.png URL1 [URL2 ...]
Sale con código 1 si algún link esperado no se pudo leer.
"""
import sys
import cv2


def leer_qrs(path):
    img = cv2.imread(path)
    if img is None:
        sys.exit(f"No se pudo abrir {path}")
    det = cv2.QRCodeDetector()
    encontrados = set()
    h, w = img.shape[:2]
    # imagen completa + rejilla de recortes para QR pequeños
    recortes = [img]
    for n in (2, 3, 4, 5):
        for i in range(n):
            for j in range(n):
                y0, y1 = max(0, int(h * i / n - h * .1)), min(h, int(h * (i + 1) / n + h * .1))
                x0, x1 = max(0, int(w * j / n - w * .1)), min(w, int(w * (j + 1) / n + w * .1))
                recortes.append(img[y0:y1, x0:x1])
    for r in recortes:
        ok, vals, _, _ = det.detectAndDecodeMulti(r)
        if ok:
            encontrados.update(v for v in vals if v)
        v = det.detectAndDecode(r)[0]
        if v:
            encontrados.add(v)
    return encontrados


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    leidos = leer_qrs(sys.argv[1])
    faltan = [u for u in sys.argv[2:] if u not in leidos]
    for u in sys.argv[2:]:
        print(("OK    " if u in leidos else "FALLA ") + u)
    extra = leidos - set(sys.argv[2:])
    if extra:
        print("Leídos pero no esperados:", *extra)
    sys.exit(1 if faltan else 0)
