---
name: placa-perro
description: Genera la placa 3D multicolor de AJolote ID (3MF para Sparkx i7 + CFS) a partir del dibujo de Gemini o de la foto del perro + el nombre. Úsala cuando el usuario mande una imagen de placa/perro con un nombre, o pida "hazme la placa de …".
---

# Placa de perro: imagen + nombre → 3MF listo para imprimir

Todo el código está en `herramientas/placas/` (lee su `README.md` si necesitas detalle).
Habla con el usuario en español sencillo: no es programador.

## 1. Entender qué mandó
- **Dibujo de Gemini** (ya trae argolla arriba, perro, hueso con el nombre, colores planos, fondo blanco) → paso 3A.
- **Foto real del perro** → paso 3B.
- La imagen adjunta aparece en su mensaje como `[Image: source: /ruta/archivo.png]`: usa esa ruta.
- Si falta el nombre, pregúntalo. Si dice tamaño ("de 50 mm") úsalo con `--alto`; si dice otro acomodo del CFS, usa `--cfs`.
- Acomodo por defecto del CFS (config.json): `negro=3, blanco=4, cuerpo=2, acento=1`
  (cuerpo = color del pelo, que el usuario cambia por perro en la ranura 2; acento = lengua/collar).

## 2. Preparar (una vez por sesión)
```bash
python3 -c "import cv2, manifold3d, trimesh, shapely, skimage" 2>/dev/null || pip install -q -r herramientas/placas/requirements.txt
```

## 3A. Con el dibujo de Gemini
Antes, **mira la imagen** (Read) y confirma que el nombre del hueso esté bien escrito. Si está mal, dile al usuario
que se la pida otra vez a Gemini con: `The name must be exactly "NOMBRE". Fix only the text, keep everything else identical.`
```bash
cd herramientas/placas && python3 -I pedido.py --imagen "<ruta de la imagen>" "NOMBRE" [--alto 60] [--cfs "..."]
```

## 3B. Con la foto del perro
Necesita la clave de Gemini. `pedido.py` la lee de `GEMINI_API_KEY` o de `herramientas/placas/.env`.
- Si no hay clave en esta sesión: ofrece guardarla con `request_credential` (host `generativelanguage.googleapis.com`,
  header `x-goog-api-key`, sin prefijo). Con eso, corre con una clave de relleno: el proxy pone la real.
  ```bash
  cd herramientas/placas && GEMINI_API_KEY=relleno python3 -I pedido.py "<ruta de la foto>" "NOMBRE"
  ```
- Si no quiere o falla: que use su Gem de Gemini (`herramientas/placas/PROMPTS_GEMINI.md`) y te mande el dibujo (3A).

## 4. Revisar antes de entregar
- Lee `pedidos/<fecha>_<NOMBRE>/vista_previa.png` (Read) y compárala con el dibujo: que se vea el perro, los colores
  y el nombre; el círculo rojo punteado es el NFC.
- Lee los avisos del resumen. Avisos normales: agujero agrandado, líneas engrosadas.
  Avisos que hay que contarle: NFC más chico de lo normal, "va a colgar inclinada", colores fusionados.

## 5. Entregar
Copia a tu scratchpad y manda con SendUserFile (status `normal`, display `attach`):
`placa.3mf`, `placa_respaldo.3mf`, `vista_previa.png`. Luego un resumen corto en español:
- Tamaño y peso.
- Tabla **parte → filamento del CFS** (de `INSTRUCCIONES.txt`), recordando poner el color del pelo en la ranura 02.
- "Pausa para el NFC antes de la capa N" y meter el sticker de X mm.
- Si pregunta por escalar a mm: **No**.

No subas `pedidos/` ni `.env` al repositorio (están en .gitignore).
