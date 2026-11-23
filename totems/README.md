# Tótems / exhibidores de mostrador — Ajolote de Bolsillo

Proyecto de exhibidores impresos en 3D (Creality SparkX i7 + CFS Lite).

- Impresora: área 260 × 260 × 255 mm → diseñamos dentro de **240 × 240 mm** de cama.
- Máx. 4 colores por placa. Filamentos PLA: rosa bajito, azul cielo, morado, amarillo pastel, negro, blanco, beige, gris.
- QR: 1.5 mm/módulo, zona silenciosa de 4 módulos, negro sobre blanco.

## Etapas
1. **Conceptos** → `etapa1/` · elegido: **A · El Bolsillo** (pendiente imagen de referencia del dueño)
2. Modelo paramétrico + renders + verificación de QR
3. Archivos de impresión (3MF/STL) + guía
4. Plantillas por giro
5. Precios

## Herramientas
- `config/negocio.yaml`: datos del negocio, impresora, filamentos y reglas.
- `tools/verificar_qr.py`: escanea los QR de un render y los compara con los links esperados.
- Habilidades del proyecto en `.claude/skills/` (adaptadas de obra/superpowers, MIT): `tienda-3d-etapas`,
  `verificar-antes-de-entregar`, `diagnosticar-impresion`, `cotizar-impresion`.
