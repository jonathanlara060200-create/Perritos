#!/usr/bin/env python3
"""
Pedido completo de placa: FOTO + NOMBRE -> Gemini dibuja -> se revisa -> 3MF para la Sparkx i7 + CFS.

    python pedido.py foto_lucas.jpg LUCAS
    python pedido.py foto.jpg "MANCHAS" --extra "collar azul cielo" --alto 55
    python pedido.py --imagen dibujo_de_gemini.png LUCAS        (si ya tienes el dibujo: no llama a Gemini)

Qué revisa solo (y si algo falla, le pide a Gemini otro intento explicándole el error):
  - Que el NOMBRE esté bien escrito (le pregunta a Gemini qué dice el hueso).
  - Que haya argolla con hoyo redondo.
  - Que el NFC quepa (si no, agranda la placa hasta alto_max_mm de config.json).

Necesita la clave de Gemini: variable GEMINI_API_KEY o un archivo `.env` en esta carpeta con
    GEMINI_API_KEY=tu_clave
(la sacas gratis en https://aistudio.google.com/apikey ; NO la subas a GitHub, .env ya está ignorado).

Resultado en pedidos/AAAA-MM-DD_NOMBRE/: dibujo.png, placa.3mf, placa_respaldo.3mf, STL por color,
vista_previa.png, INSTRUCCIONES.txt (ranuras del CFS + capa de la pausa del NFC).
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import re
import shutil
import sys
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import placa  # noqa: E402

API = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
_BUENOS: set[str] = set()


# ------------------------------------------------------------------ utilidades
def cargar_config() -> dict:
    return json.loads((AQUI / "config.json").read_text(encoding="utf-8"))


def clave_gemini() -> str | None:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"].strip()
    env = AQUI / ".env"
    if env.exists():
        for linea in env.read_text(encoding="utf-8").splitlines():
            k, _, v = linea.partition("=")
            if k.strip() == "GEMINI_API_KEY" and v.strip():
                return v.strip().strip('"').strip("'")
    return None


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto.upper())
    return "".join(c for c in t if c.isalnum())


def foto_a_base64(ruta: Path) -> tuple[str, str]:
    """Reduce la foto a máx. 1536 px (sube más rápido y cuesta lo mismo) y la manda como JPEG."""
    import cv2

    img = cv2.imread(str(ruta), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"No pude abrir la foto: {ruta}")
    h, w = img.shape[:2]
    f = min(1.0, 1536 / max(h, w))
    if f < 1:
        img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return "image/jpeg", base64.b64encode(buf.tobytes()).decode()


def llamar(modelos: list[str], clave: str, partes: list[dict], config_gen: dict | None = None) -> tuple[dict, str]:
    """Prueba los modelos en orden (si uno no existe o no está disponible, sigue con el siguiente)."""
    ultimo_error = ""
    # El que ya funcionó en esta corrida va primero (no volvemos a probar los que fallaron).
    modelos = sorted(modelos, key=lambda m: m not in _BUENOS)
    for modelo in modelos:
        cuerpo = {"contents": [{"role": "user", "parts": partes}]}
        if config_gen:
            cuerpo["generationConfig"] = config_gen
        req = urllib.request.Request(
            API.format(modelo=modelo),
            data=json.dumps(cuerpo).encode(),
            headers={"Content-Type": "application/json", "x-goog-api-key": clave},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                _BUENOS.add(modelo)
                return json.loads(r.read()), modelo
        except urllib.error.HTTPError as e:
            detalle = e.read().decode(errors="replace")[:400]
            ultimo_error = f"{modelo}: HTTP {e.code} {detalle}"
            if e.code in (400, 401, 403) and "API key" in detalle:
                raise SystemExit("La clave de Gemini no es válida. Revisa GEMINI_API_KEY en .env.")
            if e.code in (404, 400, 429, 500, 503):
                print(f"   ({modelo} no respondió: HTTP {e.code}; pruebo el siguiente)")
                continue
            raise SystemExit(f"Error de Gemini: {ultimo_error}")
        except urllib.error.URLError as e:
            raise SystemExit(f"No me pude conectar a Gemini: {e}")
    raise SystemExit(f"Ningún modelo de Gemini respondió. Último error: {ultimo_error}")


def partes_respuesta(resp: dict) -> list[dict]:
    try:
        return resp["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        motivo = resp.get("promptFeedback", {}).get("blockReason") or resp.get("candidates", [{}])[0].get("finishReason")
        raise RuntimeError(f"Gemini no devolvió contenido ({motivo})")


# ------------------------------------------------------------------ Gemini
def dibujar(cfg: dict, clave: str, foto: Path, nombre: str, extra: str, correcciones: list[str]) -> tuple[bytes, str]:
    reglas = (AQUI / "prompt_gemini.txt").read_text(encoding="utf-8")
    texto = f"{reglas}\nNAME: {nombre}\n"
    if extra:
        texto += f"Extra instructions: {extra}\n"
    if correcciones:
        texto += "IMPORTANT, a previous attempt had these problems, fix them:\n" + "\n".join(f"- {c}" for c in correcciones) + "\n"
    mime, datos = foto_a_base64(foto)
    resp, modelo = llamar(
        cfg["modelos_imagen"],
        clave,
        [{"text": texto}, {"inline_data": {"mime_type": mime, "data": datos}}],
        {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": {"aspectRatio": "3:4"}},
    )
    for p in partes_respuesta(resp):
        dato = p.get("inlineData") or p.get("inline_data")
        if dato and dato.get("data"):
            return base64.b64decode(dato["data"]), modelo
    raise RuntimeError("Gemini respondió sin imagen")


def leer_nombre(cfg: dict, clave: str, png: bytes) -> str:
    resp, _ = llamar(
        cfg["modelos_texto"],
        clave,
        [
            {"text": "What text is written on the bone-shaped banner of this image? Reply ONLY with that text, nothing else."},
            {"inline_data": {"mime_type": "image/png", "data": base64.b64encode(png).decode()}},
        ],
    )
    return " ".join(p.get("text", "") for p in partes_respuesta(resp)).strip()


# ------------------------------------------------------------------ 3D
def hacer_3d(imagen: Path, salida: Path, alto: float, nfc: float, cfs: str) -> dict:
    if salida.exists():
        shutil.rmtree(salida)
    argv = [str(imagen), "--alto", str(alto), "--nfc", str(nfc), "--ranuras", cfs, "--salida", str(salida)]
    placa.main(argv)
    return json.loads((salida / "info.json").read_text(encoding="utf-8"))


def ajustar_nfc(cfg: dict, imagen: Path, salida: Path, alto: float, nfc: float, cfs: str) -> tuple[dict, float, float]:
    """Si el NFC no cabe: agranda la placa (hasta alto_max_mm); si aun así no, usa un NFC más chico."""
    info = hacer_3d(imagen, salida, alto, nfc, cfs)
    if info["nfc_cabe"]:
        return info, alto, nfc
    sugerido = next((int(m) for a in info["avisos"] for m in re.findall(r"--alto (\d+)", a)), None)
    if sugerido and sugerido <= cfg["alto_max_mm"]:
        print(f"   El NFC de {nfc:g} mm no cabía: subo la placa a {sugerido} mm.")
        info = hacer_3d(imagen, salida, sugerido, nfc, cfs)
        if info["nfc_cabe"]:
            return info, sugerido, nfc
        alto = sugerido
    for chico in (20, 15):
        if chico < nfc:
            print(f"   Pruebo con NFC de {chico} mm.")
            info = hacer_3d(imagen, salida, alto, chico, cfs)
            if info["nfc_cabe"]:
                return info, alto, chico
    return info, alto, nfc


# ------------------------------------------------------------------ principal
def main() -> int:
    cfg = cargar_config()
    ap = argparse.ArgumentParser(description="Foto + nombre -> placa 3D multicolor")
    ap.add_argument("foto", nargs="?", help="foto del perro (no hace falta con --imagen)")
    ap.add_argument("nombre", help="nombre que va en el hueso")
    ap.add_argument("--imagen", help="usar este dibujo ya hecho en vez de pedírselo a Gemini")
    ap.add_argument("--extra", default="", help='indicaciones extra para Gemini, ej. "collar azul cielo"')
    ap.add_argument("--alto", type=float, default=cfg["alto_mm"])
    ap.add_argument("--nfc", type=float, default=cfg["nfc_mm"])
    ap.add_argument("--cfs", default=cfg["cfs"], help=f'ranuras del CFS (def. "{cfg["cfs"]}")')
    ap.add_argument("--intentos", type=int, default=cfg["intentos"])
    a = ap.parse_args()

    nombre = a.nombre.strip().upper()
    carpeta = AQUI / "pedidos" / f"{dt.date.today():%Y-%m-%d}_{normalizar(nombre) or 'PLACA'}"
    carpeta.mkdir(parents=True, exist_ok=True)
    print(f"Pedido: {nombre}  ->  {carpeta}")

    if a.imagen:
        dibujo = carpeta / "dibujo.png"
        shutil.copy(a.imagen, dibujo)
        info, alto, nfc = ajustar_nfc(cfg, dibujo, carpeta / "placa", a.alto, a.nfc, a.cfs)
        return resumen(carpeta, nombre, info, alto, nfc, [])

    if not a.foto:
        ap.error("falta la foto (o usa --imagen)")
    clave = clave_gemini()
    if not clave:
        raise SystemExit("Falta la clave de Gemini: crea herramientas/placas/.env con GEMINI_API_KEY=tu_clave")

    correcciones: list[str] = []
    pendientes: list[str] = []
    for intento in range(1, a.intentos + 1):
        print(f"\nIntento {intento}/{a.intentos}: pidiendo el dibujo a Gemini…")
        try:
            png, modelo = dibujar(cfg, clave, Path(a.foto), nombre, a.extra, correcciones)
        except RuntimeError as e:
            print(f"   {e}")
            continue
        dibujo = carpeta / f"dibujo_intento{intento}.png"
        dibujo.write_bytes(png)
        print(f"   Dibujo listo ({modelo}): {dibujo.name}")

        correcciones, pendientes = [], []
        leido = leer_nombre(cfg, clave, png)
        if normalizar(leido) != normalizar(nombre):
            print(f"   ✗ El nombre dice '{leido}' en vez de '{nombre}'.")
            correcciones.append(f'The name on the bone was written as "{leido}". It must be exactly "{nombre}".')
            continue
        print(f"   ✓ Nombre correcto: {leido}")

        info, alto, nfc = ajustar_nfc(cfg, dibujo, carpeta / "placa", a.alto, a.nfc, a.cfs)
        if not info["argolla_detectada"]:
            print("   ✗ No encontré la argolla con hoyo redondo.")
            correcciones.append("The hanging tab with a clear ROUND HOLE at the top center was missing or not clear.")
            continue
        if not info["nfc_cabe"]:
            pendientes.append("El NFC no cupo ni agrandando la placa: revisa INSTRUCCIONES.txt.")
        shutil.copy(dibujo, carpeta / "dibujo.png")
        return resumen(carpeta, nombre, info, alto, nfc, pendientes)

    print("\nNo salió bien después de todos los intentos. Revisa los dibujos en la carpeta del pedido;")
    print("si alguno sirve, úsalo con:  python pedido.py --imagen <dibujo.png> " + nombre)
    return 1


def resumen(carpeta: Path, nombre: str, info: dict, alto: float, nfc: float, pendientes: list[str]) -> int:
    placa_dir = carpeta / "placa"
    for f in ("placa.3mf", "placa_respaldo.3mf", "vista_previa.png", "INSTRUCCIONES.txt"):
        if (placa_dir / f).exists():
            shutil.copy(placa_dir / f, carpeta / f)
    w, h, z = info["tamano_mm"]
    print("\n" + "=" * 60)
    print(f"✅ PLACA DE {nombre} LISTA")
    print(f"   {w} x {h} x {z} mm · ~{info['peso_aprox_g']} g · NFC {nfc:g} mm")
    print("   Filamentos:")
    for color, d in info["colores"].items():
        print(f"     {d['filamento']:02d} ← {color} ({d['funcion']})")
    if info.get("nfc"):
        print(f"   Pausa para el NFC: antes de la capa {info['nfc']['pausa_antes_de_capa']}")
    for x in info["avisos"] + pendientes:
        print(f"   ⚠ {x}")
    print(f"   Abre: {carpeta / 'placa.3mf'}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
