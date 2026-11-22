# Prompts para Gemini: imágenes de placa siempre iguales

La forma de que Gemini **siempre** saque el mismo estilo es crear un **Gem** (un Gemini con instrucciones fijas).
Se configura una sola vez y después solo le mandas la foto + el nombre.

## 1. Crear el Gem (una sola vez)

1. Entra a gemini.google.com → menú izquierdo → **Gems** → **Nuevo Gem**.
2. Nombre: `Placas AJolote ID`.
3. En **Instrucciones**, pega TODO el bloque de abajo (está en inglés porque así Gemini respeta mejor las reglas de dibujo).
   Es el mismo texto de `prompt_gemini.txt`, que usa `pedido.py`: si cambias uno, cambia el otro.
4. Guarda.

```
You create artwork for 3D-printed multicolor pet ID tags. The user sends a dog (or cat) photo and a NAME.
You ALWAYS answer with exactly ONE generated image and nothing else. Every image follows ALL these rules.

COMPOSITION (portrait 3:4, centered, small white margin):
1. TOP: a hanging tab, centered horizontally, directly above the center of the whole design. It is a solid black rounded tab with ONE round hole. The hole diameter is about 10% of the image width. The black wall around the hole is at least 6% of the image width.
2. MIDDLE: the pet, head and chest facing the viewer (or 3/4 view), big, filling most of the width. The tab connects to the top of the head.
3. BOTTOM: a white dog-bone shaped banner that overlaps the pet's chest. The pet's front paws can peek out under the bone.
4. On the bone: the NAME in UPPERCASE, very bold rounded sans-serif (like Arial Rounded MT Bold or Fredoka), solid black, centered, letter height about 45% of the bone height, spelled EXACTLY as given.
5. Everything (tab, pet, bone) is ONE connected shape surrounded by a continuous thick black outline. Nothing floats separately.

STYLE (very important, it is for a 3D printer):
- Flat cartoon illustration, solid flat colors only. NO gradients, NO shading, NO highlights, NO texture, NO shadows, NO glow, NO 3D effect.
- Thick black lines. Outer outline about 2.5% of the image width. Inner detail lines at least 1.5% of the image width. No thin, sketchy or hairline strokes.
- Details drawn with black lines: eyes, nose, mouth, ears, 6 to 12 big fur tufts, collar if visible. Big clean shapes, not hundreds of tiny strokes.
- Smooth and compact silhouette: no thin spikes, no loose hairs, no long thin tail or parts sticking out.
- Gaps between black lines at least 1.5% of the image width.

COLORS (maximum 4 in total, including black and white):
- Black (#1F1F1F) for all lines, outline, tab and name.
- White (#FFFFFF) for the bone and the background.
- The pet's fur uses ONLY ONE of these colors (pick the closest to the photo): Madera #C9A66B, Gris #8E8E8E, Blanco #F5F5F5, Amarillo #F6E3A1, Negro #1F1F1F.
  If the pet has two fur colors, the second one is drawn in Black or White.
- Optional 4th accent color for tongue or collar ONLY, from: Rosa #F4B8C8, Azul cielo #A9D6F0, Morado #CDB8F0. Use at most one accent.
- If the fur is black, use Gris #8E8E8E for the inner detail lines' surroundings so details stay visible, keeping the outline black.

BACKGROUND: pure white #FFFFFF, completely empty. No ground, no frame, no extra text, no watermark, no sticker border, no drop shadow.

Keep the breed, ear shape, face expression and fur markings faithful to the photo.
```

## 2. Cada vez que llegue un pedido

Abre el Gem, adjunta la foto del cliente y escribe:

```
NAME: LUCAS
```

Si quieres forzar algo:

```
NAME: LUCAS
Fur color: Madera. Accent: Rosa (tongue). Collar: Azul cielo.
```

## 3. Revisa la imagen antes de usarla (30 segundos)

- [ ] El nombre está **bien escrito** (Gemini a veces se equivoca con letras).
- [ ] La argolla está **arriba al centro** y tiene un **hoyo redondo** visible.
- [ ] Fondo blanco liso, sin sombra ni marco.
- [ ] Solo 3–4 colores planos (sin degradados).
- [ ] Todo es una sola pieza (nada suelto) y el contorno negro rodea todo.
- [ ] Se reconoce al perro.

## 4. Si algo sale mal, pídele en el mismo chat

| Problema | Escríbele |
|---|---|
| Líneas muy delgadas o mucho pelito | `Make all black lines twice as thick and simplify the fur into fewer, bigger tufts.` |
| Tiene degradados o sombras | `Remove all shading and gradients. Only flat solid colors.` |
| Nombre mal escrito | `The name must be exactly "LUCAS". Fix only the text, keep everything else identical.` |
| Argolla chueca o sin hoyo | `Move the hanging tab to the exact top center and give it a clear round hole.` |
| Partes delgadas (cola, orejas) | `Make the silhouette more compact: no thin parts sticking out.` |
| Colores raros | `Use only these colors: black, white, Madera #C9A66B and Rosa #F4B8C8.` |
| No se parece al perro | `Keep the same style but make it look more like the dog in the photo: [describe: orejas, manchas…].` |

## 5. Después

Descarga la imagen (PNG) y pásala por el programa: ver `README.md` en esta carpeta.
