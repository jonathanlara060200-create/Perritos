# Generador de placas 3D (imagen de Gemini → 3MF multicolor)

Convierte una imagen como `ejemplos/lucas.png` en un modelo listo para la **Sparkx i7 + CFS** (4 colores):

- Detecta los colores planos de la imagen (máx. 4, uno por ranura del CFS).
- Quita el fondo, deja el hoyo de la argolla redondo (mín. 4.5 mm) y le da pared de 2.2 mm.
- Engrosa las líneas negras demasiado finas (mín. 0.5 mm).
- Pone el **hueco del NFC sellado adentro**, en el lugar más grueso y cerca del centro de masa (la placa cuelga derecha).
- Arma por capas: base negra (0–2 mm) → colores (2–3 mm) → líneas negras y nombre en relieve (hasta 3.4 mm).
  Así los cambios de color solo pasan en las últimas capas: menos purga y menos tiempo.

## Cómo usarlo

### Opción A: que Claude lo corra por ti
Sube la imagen de Gemini al chat y pide: "hazme la placa de 60 mm". Te regresa el `.3mf` y la vista previa.

### Opción B: en tu computadora (Windows)
1. Instala Python 3.11+ desde python.org (marca "Add Python to PATH").
2. Abre una terminal en esta carpeta (`herramientas/placas`) y una sola vez:
   ```
   pip install -r requirements.txt
   ```
3. Cada placa:
   ```
   python placa.py C:\ruta\lucas.png
   ```

### Opciones

| Opción | Qué hace | Por defecto |
|---|---|---|
| `--alto 60` | Alto total de la placa en mm | 60 |
| `--nfc 20` | Diámetro del sticker NFC (25, 20, 15). `--nfc 0` = sin NFC | 20 |
| `--max-colores 4` | Colores máximos (ranuras del CFS) | 4 |
| `--salida carpeta` | Dónde guardar | junto a la imagen |

Si el NFC no cabe, el programa te dice qué `--alto` necesitas.

## Qué te entrega (carpeta con el nombre de la imagen)

- `placa.3mf` → ábrelo en Creality Print (di **sí** a "cargar como un objeto con varias partes").
- `1_negro.stl`, `2_beige.stl`, … → las mismas piezas sueltas, por si acaso.
- `vista_previa.png` → cómo se va a ver (el círculo punteado rojo es el NFC).
- `INSTRUCCIONES.txt` → colores de cada pieza, **en qué capa poner la pausa del NFC** y avisos.

## En Creality Print (resumen)

1. Abre `placa.3mf` → "¿un objeto con varias partes?" → **Sí**.
2. Asigna cada parte a su filamento del CFS.
3. Capa 0.2 mm · 3 paredes · relleno 15–20 % · torre de purga activada.
4. Rebana → en la barra de capas ve a la **capa 8 (1.6 mm)** → clic derecho en el "+" → **Agregar pausa**.
5. Cuando pause: mete el sticker NFC en el hueco y reanuda.

## Tamaños sugeridos

| Perro | Alto | NFC |
|---|---|---|
| Chico | 45–50 mm | 15 mm (o sin NFC, solo QR) |
| Mediano | 55–60 mm | 20 mm |
| Grande | 65–70 mm | 25 mm |

Los detalles muy finos del dibujo se pierden en placas chicas; para perros chicos pide a Gemini un dibujo más simple.
