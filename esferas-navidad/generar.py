#!/usr/bin/env python3
"""
Generador de esferas navideñas modulares — Ajolote de Bolsillo.

Uso:
    python3 generar.py                         # bases + nombres de ejemplo
    python3 generar.py --nombres "Ana,Luis"    # tu lista de nombres
    python3 generar.py --archivo nombres.txt   # un nombre por renglón
    python3 generar.py --solo-nombres ...      # no regenera las bases

Requisitos: OpenSCAD (>= 2021.01) y `pip install trimesh numpy`.
Opcional: xvfb-run (vistas previas) y prusa-slicer (gramos/tiempo).
"""
import argparse, os, re, shutil, subprocess, sys, tempfile, unicodedata, zipfile
import numpy as np
import trimesh

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "salida")
VARIANTES = ["lisa", "copos", "pino", "rayas"]
EJEMPLO = ["Ana", "Carlos", "Sofía", "Mateo", "Valentina"]

# --- medidas (deben coincidir con los .scad) ---
REBAJE_L, REBAJE_H, HOLGURA = 74.0, 24.0, 0.2
PLACA_L, PLACA_H = REBAJE_L - 2 * HOLGURA, REBAJE_H - 2 * HOLGURA   # 73.6 x 23.6
MARGEN_TEXTO = 1.6          # aire entre letras y borde de la placa
ANCHO_MAX_TEXTO = 66.0      # <= 70 mm pedido; dejamos aire para el óvalo
TAM_MAX = 16.0              # tamaño de fuente máximo (nombres cortos)

# --- cama Creality SparkX i7 ---
CAMA = 260.0
BORDE_CAMA = 10.0
SEP = 6.0                   # separación entre piezas

COLORES = {  # solo para la vista previa / 3MF (sin rosa)
    "base": "#B3121B", "deco": "#F4F1EA", "placa": "#F4F1EA", "letras": "#1E6B3A",
}


def scad(archivo, salida, **params):
    cmd = ["openscad", "-o", salida]
    for k, v in params.items():
        cmd += ["-D", f'{k}="{v}"' if isinstance(v, str) else f"{k}={v}"]
    cmd.append(os.path.join(AQUI, archivo))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(salida):
        sys.exit(f"OpenSCAD falló:\n{r.stderr}")
    if "WARNING" in r.stderr:
        print("  aviso OpenSCAD:", [l for l in r.stderr.splitlines() if "WARNING" in l][:3])


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_").lower() or "nombre"


# ------------------------------------------------------------------ nombres
def cabe_en_estadio(w, h, L, H):
    """¿Un rectángulo w x h centrado cabe en un estadio L x H?"""
    if h > H:
        return False
    r = H / 2
    xc = L / 2 - r
    if w / 2 <= xc:
        return True
    return (w / 2 - xc) ** 2 + (h / 2) ** 2 <= r ** 2


def ajustar_nombre(nombre, tmp):
    f = os.path.join(tmp, "medir.stl")
    scad("nombre.scad", f, nombre=nombre, parte="medir")
    (x0, y0, _), (x1, y1, _) = trimesh.load(f).bounds
    w10, h10 = x1 - x0, y1 - y0
    L, H = PLACA_L - 2 * MARGEN_TEXTO, PLACA_H - 2 * MARGEN_TEXTO
    lo, hi = 0.1, TAM_MAX / 10
    for _ in range(40):  # bisección
        s = (lo + hi) / 2
        ok = w10 * s <= ANCHO_MAX_TEXTO and cabe_en_estadio(w10 * s, h10 * s, L, H)
        lo, hi = (s, hi) if ok else (lo, s)
    s = lo
    return dict(tam=round(10 * s, 3), dx=round(-(x0 + x1) / 2 * s, 3),
                dy=round(-(y0 + y1) / 2 * s, 3), ancho=w10 * s, alto=h10 * s)


def generar_nombres(nombres, tmp):
    carpeta = os.path.join(SALIDA, "nombres")
    os.makedirs(carpeta, exist_ok=True)
    piezas = []
    for n in nombres:
        a = ajustar_nombre(n, tmp)
        s = slug(n)
        partes = {}
        for p in ("placa", "letras"):
            f = os.path.join(carpeta, f"nombre_{s}_{p}.stl")
            scad("nombre.scad", f, nombre=n, parte=p, tam=a["tam"], dx=a["dx"], dy=a["dy"])
            partes[p] = f
        print(f"  {n:<12} letra {a['tam']:5.2f} mm -> texto {a['ancho']:.1f} x {a['alto']:.1f} mm")
        piezas.append(dict(nombre=n, slug=s, partes=partes, **a))
    return piezas


def acomodar(n_piezas, w, h):
    """Rejilla en la cama: devuelve lista de placas, cada una con centros (x, y)."""
    util = CAMA - 2 * BORDE_CAMA
    cols = max(1, int((util + SEP) // (w + SEP)))
    filas = max(1, int((util + SEP) // (h + SEP)))
    por_placa = cols * filas
    placas = []
    for i0 in range(0, n_piezas, por_placa):
        k = min(por_placa, n_piezas - i0)
        c = min(cols, k)
        f = -(-k // c)
        ancho, alto = c * w + (c - 1) * SEP, f * h + (f - 1) * SEP
        x0, y0 = (CAMA - ancho) / 2 + w / 2, (CAMA + alto) / 2 - h / 2
        placas.append([(x0 + (j % c) * (w + SEP), y0 - (j // c) * (h + SEP)) for j in range(k)])
    return placas, por_placa


# ------------------------------------------------------------------ 3MF
from tres_mf import escribir_3mf  # formato Bambu/Orca: Creality Print respeta el color de cada pieza


# ------------------------------------------------------------------ vistas previas
def vista_previa(objetos, png, camara="0,0,0,0,0,0,0", tam="1400,1400"):
    if not shutil.which("xvfb-run"):
        print("  (sin xvfb-run: no hay vista previa)")
        return
    lineas = []
    for o in objetos:
        for _, stl, c in o["partes"]:
            lineas.append(f'translate([{o["pos"][0]},{o["pos"][1]},0]) '
                          f'color("{c}") import("{stl}");')
    with tempfile.NamedTemporaryFile("w", suffix=".scad", delete=False) as f:
        f.write("\n".join(lineas))
    subprocess.run(["xvfb-run", "-a", "openscad", "-o", png, f"--camera={camara}",
                    "--viewall", "--autocenter", f"--imgsize={tam}",
                    "--colorscheme=Tomorrow", f.name], capture_output=True)
    os.unlink(f.name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nombres", help='lista separada por comas, ej. "Ana,Luis"')
    ap.add_argument("--archivo", help="txt con un nombre por renglón")
    ap.add_argument("--solo-nombres", action="store_true")
    a = ap.parse_args()
    nombres = EJEMPLO
    if a.archivo:
        nombres = [l.strip() for l in open(a.archivo, encoding="utf-8") if l.strip()]
    elif a.nombres:
        nombres = [n.strip() for n in a.nombres.split(",") if n.strip()]

    os.makedirs(os.path.join(SALIDA, "previews"), exist_ok=True)
    tmp = tempfile.mkdtemp()

    # ---------- BASES ----------
    if not a.solo_nombres:
        print("Bases:")
        bdir = os.path.join(SALIDA, "bases")
        os.makedirs(bdir, exist_ok=True)
        obj_bases = []
        for v in VARIANTES:
            fb = os.path.join(bdir, f"base_{v}.stl")
            scad("esfera_base.scad", fb, variante=v, parte="base")
            partes = [(f"base_{v}", fb, COLORES["base"])]
            if v != "lisa":
                fd = os.path.join(bdir, f"base_{v}_deco.stl")
                scad("esfera_base.scad", fd, variante=v, parte="deco")
                partes.append((f"deco_{v}", fd, COLORES["deco"]))
            print(f"  base_{v} ok")
            obj_bases.append(dict(nombre=f"esfera_{v}", partes=partes))
            p = os.path.join(SALIDA, "previews", f"base_{v}.png")
            # cámara desde abajo = como se ve de frente ya colgada
            vista_previa([dict(obj_bases[-1], pos=(0, 0))], p, "0,0,0,0,180,0,0", "800,900")
        # placa con las 4 bases (2 x 2) — 80 x 93.5 mm cada una
        w, h = 80.0, 93.5
        cy = -6.75  # el contorno va de y=-40 a y=53.5 (argolla)
        for i, o in enumerate(obj_bases):
            col, fil = i % 2, i // 2
            o["pos"] = (CAMA / 2 + (col - 0.5) * (w + 12), CAMA / 2 + (0.5 - fil) * (h + 12) + cy)
        escribir_3mf(os.path.join(SALIDA, "placa_4_bases.3mf"), obj_bases)
        vista_previa(obj_bases, os.path.join(SALIDA, "previews", "placa_4_bases.png"),
                     "130,130,0,0,180,0,0")

    # ---------- NOMBRES ----------
    print("Nombres:")
    piezas = generar_nombres(nombres, tmp)
    placas, por_placa = acomodar(len(piezas), PLACA_L, PLACA_H)
    k = 0
    for ip, centros in enumerate(placas, 1):
        objs = []
        for c in centros:
            p = piezas[k]; k += 1
            objs.append(dict(nombre=f"nombre_{p['slug']}", pos=c, partes=[
                ("placa", p["partes"]["placa"], COLORES["placa"]),
                ("letras", p["partes"]["letras"], COLORES["letras"])]))
        ruta = os.path.join(SALIDA, f"placa_nombres_{ip}.3mf")
        escribir_3mf(ruta, objs)
        vista_previa(objs, os.path.join(SALIDA, "previews", f"placa_nombres_{ip}.png"),
                     "130,130,0,0,0,0,0", "1400,1400")
        print(f"  {os.path.basename(ruta)}: {len(centros)} nombres (máx. {por_placa} por placa)")

    # ---------- MAQUETA: esfera armada vista de frente ----------
    if shutil.which("xvfb-run") and not a.solo_nombres:
        bdir = os.path.join(SALIDA, "bases")
        for i, v in enumerate(VARIANTES):
            p = piezas[i % len(piezas)]
            l = [f'color("{COLORES["base"]}") import("{bdir}/base_{v}.stl");']
            if v != "lisa":
                l.append(f'color("{COLORES["deco"]}") import("{bdir}/base_{v}_deco.stl");')
            # el nombre se voltea (gira 180° en Y) y su placa entra al rebaje
            for parte in ("placa", "letras"):
                l.append(f'translate([0,0,0.6]) rotate([0,180,0]) color("{COLORES[parte]}") '
                         f'import("{p["partes"][parte]}");')
            with tempfile.NamedTemporaryFile("w", suffix=".scad", delete=False) as f:
                f.write("\n".join(l))
            subprocess.run(["xvfb-run", "-a", "openscad", "-o",
                            os.path.join(SALIDA, "previews", f"armada_{v}_{p['slug']}.png"),
                            "--camera=0,0,0,0,180,0,0", "--viewall", "--autocenter",
                            "--imgsize=800,900", "--colorscheme=Tomorrow", f.name],
                           capture_output=True)
            os.unlink(f.name)
        print("  maquetas armadas ok")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
