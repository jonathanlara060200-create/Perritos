---
name: diagnosticar-impresion
description: Úsala cuando una pieza sale mal (no encaja, se despega, se dobla, hilos, colores manchados por el CFS, QR que no escanea, capas débiles) o cuando un modelo o script falla. Busca la causa raíz antes de cambiar nada.
---

# Diagnosticar fallas de impresión

Adaptado de *systematic-debugging* de [obra/superpowers](https://github.com/obra/superpowers) (MIT).

## Ley de hierro
```
NO HAY AJUSTE SIN CAUSA RAÍZ IDENTIFICADA
```
Subir la temperatura, mover la tolerancia o reimprimir "a ver si sale" gasta filamento y esconde el problema real.

## Fase 1 · Entender
- Pide una foto de la falla, de cerca y de lado, y en qué placa o pieza pasó.
- Pregunta qué cambió desde la última vez que salió bien: filamento, rollo nuevo, perfil, modelo, clima.
- Revisa si es del **modelo** (medidas, tolerancias, voladizos) o de la **impresión** (perfil, cama, filamento).

## Fase 2 · Comparar con lo que funciona
Busca una pieza que sí salió bien con el mismo filamento o perfil y anota cada diferencia.

## Fase 3 · Una hipótesis a la vez
Escribe "Creo que X causa Y porque Z". Prueba **un solo** cambio con una pieza de prueba chica (un cubo,
una ranura de prueba o un QR suelto), no con el tótem completo.

## Tabla rápida de causas comunes
| Síntoma | Primero revisa |
|---|---|
| Pestaña no entra / queda floja | La tolerancia en el config contra la medida real con vernier; pata de elefante en la primera capa |
| Esquinas levantadas (warping) | Limpieza de la cama, primera capa, piezas muy largas y delgadas |
| Color manchado en el relieve | Volumen de purga del CFS; orden de colores (claro → oscuro) |
| QR no escanea impreso | Módulo < 1.5 mm, falta zona silenciosa, blanco poco opaco (subir capas blancas) |
| Hilos entre piezas | Retracción y temperatura del filamento |
| Se rompe al ensamblar | Pared < 1.2 mm o capas orientadas a lo largo del esfuerzo |

## Si 3 ajustes no funcionan
Detente. Probablemente el problema es de diseño, no de parámetros. Plantéalo al dueño antes de seguir.
