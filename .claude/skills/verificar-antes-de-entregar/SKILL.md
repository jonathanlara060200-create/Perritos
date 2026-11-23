---
name: verificar-antes-de-entregar
description: Úsala antes de decir que un modelo, render, QR, archivo 3MF/STL o cotización está listo, y antes de hacer commit o mandarle archivos al dueño. Primero evidencia, después afirmaciones.
---

# Verificar antes de entregar

Adaptado de *verification-before-completion* de [obra/superpowers](https://github.com/obra/superpowers) (MIT).

## Ley de hierro
```
NADA DE "YA QUEDÓ" SIN UNA VERIFICACIÓN HECHA EN ESTE MISMO MENSAJE
```
Una pieza mal impresa cuesta filamento, horas y la confianza del cliente. Revisar cuesta segundos.

## Qué prueba cada afirmación

| Afirmación | Evidencia necesaria | No es suficiente |
|---|---|---|
| "Los QR funcionan" | `python3 totems/tools/verificar_qr.py <render> <urls...>` con salida OK en cada link | "el QR se ve bien" |
| "Cabe en la impresora" | Medidas de la caja de cada pieza ≤ 240 × 240 mm (impresas) | La altura del tótem |
| "Máximo 4 colores" | Lista de colores por placa, contada | "creo que son 4" |
| "No es frágil" | Pared mínima ≥ 1.2 mm y trazo mínimo ≥ 0.8 mm, medidos en el modelo | A ojo en el render |
| "Ensambla" | Holgura = tolerancia del config (0.2 mm) en cada ranura/pestaña | "debería entrar" |
| "El 3MF abre bien" | Recargar el archivo y contar objetos y colores | Que se exportó sin error |
| "Cuesta $X" | Gramos y horas del laminador, más la fórmula de `cotizar-impresion` | Estimado a ojo presentado como dato |
| "Revisé la referencia" | Haber abierto el link o la imagen en esta sesión | Suponer qué contiene |

## Pasos
1. **Identifica** qué comando o medición prueba lo que vas a decir.
2. **Ejecútalo** completo, en este momento.
3. **Lee** toda la salida.
4. **Afirma** solo lo que la salida respalda. Si algo falló, dilo con la evidencia.

## Señales de alerta
- Palabras como "debería", "probablemente", "se ve bien".
- Festejar ("¡Listo!", "¡Perfecto!") antes de verificar.
- Mandar estimados como si fueran datos. Siempre márcalos como estimados.
- Creerle a un subagente que dice "ya quedó" sin revisar los archivos tú mismo.
