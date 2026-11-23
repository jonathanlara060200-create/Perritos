---
name: tienda-3d-etapas
description: Úsala antes de diseñar, modelar o cotizar cualquier pieza 3D para Ajolote de Bolsillo (tótems/exhibidores, llaveros, clickers, placas, piezas personalizadas) o cuando el dueño pida un producto nuevo. Trabaja por etapas con aprobación del dueño entre cada una.
---

# Trabajo por etapas (Ajolote de Bolsillo)

Adaptado de la habilidad *brainstorming* de [obra/superpowers](https://github.com/obra/superpowers) (MIT).

El dueño decide; tú propones. Construyes lo que *crees* que quiere, y esa creencia suele ser más débil de lo
que parece. Antes de modelar, averigua qué quiere y para qué.

## Antes de preguntar, revisa
- `totems/config/negocio.yaml`: datos del negocio, impresora, filamentos y reglas de diseño. Nunca preguntes
  lo que ya está ahí.
- El `README.md` de la carpeta del proyecto y las decisiones ya tomadas. No reabras lo que ya se decidió.
- Las imágenes o links que mandó el dueño. Si un link no abre, dilo y arréglalo; no digas que lo revisaste.

## Las etapas
1. **Conceptos**: 3 opciones con boceto a escala, piezas, colores por placa, gramos y horas estimados, y tu
   recomendación con el porqué.
2. **Modelo**: modelo paramétrico, renders (frente y 3/4) y verificación (habilidad `verificar-antes-de-entregar`).
3. **Archivos de impresión**: 3MF por placa, STL por pieza y una guía corta de impresión y ensamble.
4. **Plantilla**: convertirlo en algo reutilizable para otros clientes o giros.
5. **Precio**: habilidad `cotizar-impresion`.

**Regla de oro:** no pases a la siguiente etapa sin un "sí" explícito del dueño. "Se ve bien" sobre una
etapa no aprueba la siguiente.

## Cómo preguntar
- Máximo 5 preguntas por mensaje, numeradas, en español sencillo y sin jerga de CAD.
- Cuando haya opciones, da 2 o 3 concretas, con qué gana y qué pierde cada una, y di cuál elegirías tú.
- Si una respuesta es ambigua (por ejemplo, un "sí" a una pregunta de opciones), elige lo más sensato,
  dilo en una línea y sigue.

## Restricciones que siempre se revisan al proponer
- Solo los filamentos de `negocio.yaml`. Si el logo usa un color que no hay, propón el sustituto y pregunta.
- Máximo 4 colores por placa; si hacen falta más, divide en piezas que se ensamblen.
- Todo cabe en el área útil (240 × 240 mm) y se imprime acostado, con la cara al frente hacia arriba.
- Los colores van en las capas de arriba (relieve o inlay de 0.6 a 1.0 mm) para gastar menos en purgas.
- Diseños originales: las referencias de otras marcas son solo inspiración; nunca copies su forma ni su arte.

## Registro
Al cerrar cada etapa, anota en el `README.md` del proyecto qué se decidió y por qué. Después haz commit.
