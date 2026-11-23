---
name: cotizar-impresion
description: Úsala cuando el dueño pida el precio o el costo de cualquier pieza 3D (tótems, llaveros, clickers, placas, encargos) o quiera compararse con la competencia.
---

# Cotizar una impresión

## Datos de entrada (nunca inventados)
- **Gramos y horas**: del laminador (Creality Print) o del cálculo del modelo. Si son estimados, dilo.
- **Costos**: sección `costos` de `totems/config/negocio.yaml`. Si falta alguno, pregúntalo antes de cotizar.

## Fórmula
```
material   = (gramos de pieza + gramos de purga) × (precio del kg / 1000) × 1.10   # 10 % de merma y fallas
máquina    = horas de impresión × (luz por hora + desgaste, que por defecto es 5 MXN/h)
extras     = NFC + empaque + envío si aplica
mano_obra  = horas de diseño, armado y post-proceso × tarifa
costo      = material + máquina + extras + mano_obra
precio     = costo × margen     # se elige viendo el mercado
```

## Entrega
- Una tabla por tamaño (chico, mediano, grande) con el costo desglosado, el precio sugerido y el margen.
- Compara con el rango de la competencia que dio el dueño (tótems: $900 a $1,550 MXN) y di dónde quedas.
- Separa lo que es dato (laminador) de lo que es estimado.
- Antes de presentarla, aplica la habilidad `verificar-antes-de-entregar`.
