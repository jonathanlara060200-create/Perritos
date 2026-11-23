# Tótem "Ajolote de Bolsillo" · 20 cm · entrega de fabricación

Exhibidor de mostrador con QR y NFC, modelado en Blender a partir de la referencia `referencia_frente.webp`.
Impresora: Creality SparkX i7 + CFS Lite (máx. 4 colores por placa). Filamento: PLA.

## Archivos

| Archivo | Para qué |
|---|---|
| `totem/totem.blend` | Modelo editable (Blender 5.x), una colección por pieza |
| `impresion/3mf/placa_1.3mf` … `placa_5.3mf` | Una placa por archivo, cada pieza con sus colores ya asignados a las ranuras del CFS |
| `impresion/stl/<pieza>/*.stl` | Una STL por pieza y color, ya acostada sobre la cama (respaldo del 3MF) |
| `impresion/stl_ensamble/totem_completo.stl` | Todo el tótem armado, solo de referencia |
| `impresion/revision/*.json` | Revisión de imprimibilidad de cada pieza (Blender Kiln `print_check`) |
| `fase5/lamina_4_vistas.png` | Vistas ortográficas: frente, espalda, lado izquierdo y lado derecho |
| `fase5/render/explosion.png` | Vista explotada del ensamble |
| `fase4/corte_boton_nfc.png` | Corte de la base por un botón: alojamiento, cavidad del tag y orificio para expulsar |
| `uv_dtf/` | Alternativa: calcomanías UV DTF para los QR, con su línea de corte (`qr_modo: uv_dtf`) |

Para regenerar todo (desde `totems/blender/`):
`python3 construir_totem.py` → `python3 exportar_impresion.py` → `python3 exportar_3mf.py` → `python3 material.py`

## Piezas, medidas y materiales

| # | Pieza | Medida en la cama (mm) | Colores (ranura del CFS) | Placa |
|---|---|---|---|---|
| 1 | Panel trasero con costuras y texto en la espalda | 169 × 190 × 8 | azul (1), blanco (2), amarillo (3) | 1 |
| 2 | Bolsillo con texto, costuras y 2 QR impresos | 115 × 109 × 6 | azul (1), blanco (2), amarillo (3), negro (4) | 2 |
| 3 | Ajolote (contorno, cabeza, ojos, boca, branquias) | 140 × 65 × 7 | negro (1), blanco (2), morado (3), rosa (4) | 3 |
| 4 | Manita izquierda / derecha | 21 × 15 × 3 c/u | negro (1), rosa (4) | 3 |
| 5 | Burbujas (7 piezas) | Ø6.7 a Ø19 × 4.6 | blanco (2) | 3 |
| 6 | Alga (3 tallos en una pieza) | 36 × 81 × 9 | morado (3) | 3 |
| 7 | Base con rampa, ranura y 3 alojamientos NFC | 199 × 76 × 20 | azul (1), blanco (2) | 4 |
| 8 | Botón Instagram (tapa del tag) | Ø32 × 7.9 | morado (3) + ícono blanco (2) | 5 |
| 9 | Botón WhatsApp (tapa del tag) | Ø32 × 7.9 | rosa (4) + ícono blanco (2) | 5 |
| 10 | Botón Tarjeta (tapa del tag) | Ø32 × 7.9 | blanco (2) + ícono azul (1) | 5 |
| — | Tags NFC NTAG213/215 de 25 mm (3) | Ø25 × ~0.5 | — | — |

Tótem armado: **199 × 76 × 200 mm**. QR impresos: Tienda versión 3 (módulo de 1.14 mm), WhatsApp versión 2 (módulo de 1.30 mm).
Los dos escanean desde el render. Conviene imprimir primero el bolsillo y probarlo con el celular.

### Filamento (estimación; el dato real sale al laminar)

| Color | Gramos |
|---|---|
| Azul cielo | ~188 |
| Negro | ~18 |
| Rosa bajito | ~17 |
| Blanco | ~16 |
| Morado | ~12 |
| Amarillo pastel | ~1 |
| **Total con purga** | **~296 g**, unas 20 h |

## Guía de impresión

- **Orden y rollos del CFS:** imprime en orden **1 → 2 → 4 → 5 → 3** para cambiar solo 4 rollos en total:
  - Placas 1, 2 y 4: azul, blanco, amarillo y negro (ranura 4, solo para la placa 2).
  - Placa 5: cambia el amarillo por morado (ranura 3) y el negro por rosa (ranura 4).
  - Placa 3: cambia el azul por negro (ranura 1).
- **Al abrir el 3MF en Creality Print:** revisa que cada parte tenga el color correcto. Si el programa no respeta la asignación, abre las STL de la pieza y elige "cargar como una sola pieza con varias partes". Luego asigna a cada parte su ranura según la tabla.
- **Perfil:** PLA, capa de 0.2 mm, 2 paredes, 4 capas sólidas arriba y abajo. Relleno de 15 % (base: 8–10 %). **Sin soportes:** todo está diseñado acostado, con los huecos de ensamble del lado de la cama.
- **Orientación:** tal como viene en el archivo. Panel, bolsillo, ajolote, burbujas y alga con la cara al frente hacia arriba; base y botones de pie.
- **Torre de purga:** actívala en las placas 2, 3 y 5, que tienen muchos cambios de color.

## Ensamble (sin pegamento)

Todo embona a presión. Los huecos son 0.1 mm más grandes que los pernos (`ajuste_pernos` en la configuración). Si una pieza entra muy dura, súbelo a 0.15. Si queda floja, una gota de pegamento la fija; es solo un respaldo.

1. **Tags NFC:** programa cada tag con la app NFC Tools: Instagram, WhatsApp y el link de pago con tarjeta. Pega cada uno en la cavidad redonda del fondo de su alojamiento en la base, con su propio adhesivo.
2. **Botones:** presiona cada botón en su alojamiento: Instagram a la izquierda, WhatsApp al centro, Tarjeta a la derecha. Para cambiar un tag, empuja el botón desde abajo con una pluma por el orificio de 6 mm.
3. **Bolsillo:** presiónalo sobre los 4 pernos de 4 mm del panel.
4. **Ajolote:** presiónalo sobre los 3 pernos de la parte de arriba. Queda justo arriba del borde del bolsillo.
5. **Manitas:** presiónalas sobre los 2 pernos chicos de la franja del bolsillo.
6. **Burbujas:** cada una va sobre su perno en la columna de la izquierda. Las chicas tienen perno de 2 mm; las grandes, de 3 mm.
7. **Alga:** presiónala sobre sus 3 pernos a la derecha del bolsillo.
8. **Panel en la base:** mete el panel de pie en la ranura de la base, que tiene 10 mm de profundidad y 0.2 mm de holgura por lado.

## Validación hecha

- **Imprimibilidad (Blender Kiln `print_check`, FDM):** ver `impresion/revision/` (veredicto, bordes abiertos, partes flotantes y área con paredes de menos de 0.8 mm, pieza por pieza).
- **Medidas:** todas caben en el área útil de 240 × 240 mm. Ninguna placa pasa de 4 colores.
- **Ensamble:** ninguna pieza choca con otra. Los 17 pernos del panel quedan a 13 mm o más de su borde.
- **Parecido con la referencia (medido):** 97.5 % de coincidencia de color en la vista frontal.
- **QR:** los 2 se leen desde el render frontal.
