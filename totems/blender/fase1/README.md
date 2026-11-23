# Fase 1 · Análisis de la referencia (vista frontal)

Fuente: `../referencia_frente.webp` (1199 × 1312 px). Escala: tótem de 200 mm = 1277 px → **6.385 px/mm**.
Las burbujas miden igual de ancho que de alto (relación 0.98–1.03), así que el panel está de frente y sin
deformación. La base está dibujada vista un poco desde arriba (los botones se ven al 49 %, unos 29°).

Scripts: `../fase1_analisis.py` (máscaras y contornos) y `../fase1_lamina.py` (lámina).
Salidas: `mascara_*.png`, `contornos_mm.json` (contorno de cada pieza en mm, con origen al centro abajo), `medidas.json`.

| Pieza | Ancho × alto (mm) | Posición X (mm) | Posición Y (mm) |
|---|---|---|---|
| Tótem completo | 182 × 200 | −90.5 … 90.5 | 0 … 200 |
| Panel (con el halo alrededor del ajolote) | 161 × 165 | −80.3 … 81.0 | 35 … 200 |
| Ajolote (cabeza, branquias, contorno) | 128 × 69 | −63.7 … 63.9 | 128 … 198 |
| Manitas | 2 × ~16 × 12 | −51 … 52 | 128 … 140 |
| Bolsillo (borde exterior) | 105 × 100 | −51.1 … 54.2 | 39 … 138 |
| Franja superior del bolsillo | 105 × 7.8 | | 130.5 … 138.3 |
| Texto "Ajolote de Bolsillo" | 84 × 33 | −38 … 45 | 92 … 125 |
| Placas QR (2) | 34 × 38.5 c/u | −34 … 41 | 51 … 89 |
| Burbujas (7) | Ø 6–17.5 | −72 … −48 | 46 … 144 |
| Alga (3 tallos) | 32 × 76 | 48.6 … 80.8 | 34 … 110 |
| Base | 181 de ancho | | 0 … 36 (con perspectiva) |
| Botones NFC (3) | Ø ~32 | centros en −46, 0, +48 | |
| Puntadas de costura | 85 | | |

Burbujas (centro x, y, diámetro en mm): (−63.3, 135.8, 17.3) (−56.2, 122.6, 6.1) (−63.0, 109.9, 17.5)
(−59.7, 93.1, 10.4) (−55.0, 82.7, 6.7) (−60.6, 70.1, 16.1) (−55.4, 53.1, 14.7).

## Conflictos de fabricación detectados
1. **QR**: las placas de la referencia miden 34 mm. Un QR legible a ≥ 1.5 mm/módulo necesita ≥ 43.5 mm
   (versión 2, zona silenciosa de 2 módulos) o 49.5 mm (zona de 4). A 34 mm el módulo queda en 1.17 mm.
2. **Botón de tarjeta**: en la referencia es azul rey, que no hay en el taller. En azul cielo no se distingue de la base.
3. **Cachetes**: aparecen en la referencia; se quitan por decisión del dueño.
