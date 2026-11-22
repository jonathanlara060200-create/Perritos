# Generador de placas 3D (foto o dibujo → 3MF multicolor)

## ⚡ Lo rápido: un pedido de principio a fin

```
python pedido.py foto_del_perro.jpg LUCAS
```
1. Le manda la foto a **Gemini** con el prompt fijo (`prompt_gemini.txt`) y recibe el dibujo.
2. **Revisa** que el nombre esté bien escrito y que haya argolla con hoyo; si no, le pide otro intento explicándole el error (hasta 3).
3. Hace el **3MF** con las partes ya asignadas a tu CFS (`config.json`: negro=3, blanco=4, cuerpo=2, acento=1).
4. Si el NFC no cabe, agranda la placa o usa un NFC más chico.

Todo queda en `pedidos/AAAA-MM-DD_LUCAS/`. En Windows también puedes dar **doble clic a `hacer_placa.bat`**.

- ¿Ya tienes el dibujo de Gemini? `python pedido.py --imagen dibujo.png LUCAS`
- ¿Indicaciones extra? `--extra "collar azul cielo"` · ¿Otro tamaño? `--alto 55`
- O mándale a Claude la imagen y el nombre: usa la skill `placa-perro` y te regresa los archivos.

### Clave de Gemini (una vez)
1. Sácala en https://aistudio.google.com/apikey
2. Crea el archivo `.env` en esta carpeta con: `GEMINI_API_KEY=tu_clave` (no se sube a GitHub).
3. Cada dibujo cuesta unos centavos de dólar en la API de Gemini (revisa la tarifa de tu cuenta).

---

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
| `--ranuras "negro=3,beige=2,blanco=4,rosa=1"` | En qué ranura del CFS está cada color (así el 3MF ya llega con los colores puestos) | 1,2,3,4 en orden |

Si el NFC no cabe, el programa te dice qué `--alto` necesitas.

## Qué te entrega (carpeta con el nombre de la imagen)

- `placa.3mf` → ábrelo en Creality Print. Entra como **una sola placa** con sus partes, cada una ya en su filamento.
- `placa_respaldo.3mf` → la misma placa en formato PrusaSlicer, por si el otro no agarra los colores.
- `1_negro.stl`, `2_beige.stl`, … → las mismas piezas sueltas, por si acaso.
- `vista_previa.png` → cómo se va a ver (el círculo punteado rojo es el NFC).
- `INSTRUCCIONES.txt` → colores de cada pieza, **en qué capa poner la pausa del NFC** y avisos.

## En Creality Print (resumen)

1. Abre `placa.3mf`. Si pregunta "¿escalar a milímetros?" → **No** (ya está en mm).
2. Las partes vienen en el filamento 1, 2, 3, 4 en el orden de `INSTRUCCIONES.txt`. Revisa que coincidan con las ranuras del CFS.

3. Capa 0.2 mm · 3 paredes · relleno 15–20 % · torre de purga activada.
4. Rebana → en la barra de capas ve a la **capa 8 (1.6 mm)** → clic derecho en el "+" → **Agregar pausa**.
5. Cuando pause: mete el sticker NFC en el hueco y reanuda.

**Plan B** si el 3MF no entrara bien: arrastra los 4 `.stl` juntos a Creality Print → "¿un objeto con varias partes?" **Sí** → "¿escalar?" **No**.

## Tamaños sugeridos

| Perro | Alto | NFC |
|---|---|---|
| Chico | 45–50 mm | 15 mm (o sin NFC, solo QR) |
| Mediano | 55–60 mm | 20 mm |
| Grande | 65–70 mm | 25 mm |

Los detalles muy finos del dibujo se pierden en placas chicas; para perros chicos pide a Gemini un dibujo más simple.
