# Explicación del Arreglo en el Sistema de Colisiones

Este documento detalla el problema original con el sistema de colisiones, específicamente con el `TilemapCollider2D`, y la solución que se implementó para corregirlo.

## El Problema Original: "Colisiones Fantasma"

El motor del juego presentaba un error donde se detectaban colisiones con el mapa de azulejos (Tilemap) incluso cuando el personaje estaba muy lejos de él. Este comportamiento ocurría si el objeto `Tilemap` en la escena había sido **movido, rotado o escalado**.

La causa raíz del problema estaba en la función `isColliderVsTilemap` dentro del archivo `js/engine/Physics.js`. Esta función es la encargada de verificar si un colisionador (como el del jugador) está chocando contra alguna de las celdas del Tilemap.

El error consistía en que la función **no tomaba en cuenta la transformación del objeto `Tilemap` padre**. Calculaba la posición de las celdas del mapa como si el Tilemap siempre estuviera en la posición (0,0) del mundo, sin rotación y con una escala de 1.

**En resumen:** Si movías el Tilemap en el editor, sus colisionadores invisibles se quedaban "atrás" en la posición original del mundo, provocando estas "colisiones fantasma".

## La Solución Implementada

Para resolver esto, se modificó la función `isColliderVsTilemap` para que aplicara correctamente la posición, rotación y escala del objeto `Tilemap` a cada una de sus celdas antes de comprobar la colisión.

Los pasos de la corrección fueron los siguientes:

1.  **Obtener la Transformación Mundial del Tilemap**: Antes de empezar a comprobar las celdas, el código ahora obtiene la transformación completa (posición, rotación y escala) del `Materia` que contiene el componente `TilemapCollider2D`.

2.  **Transformar cada Celda Individualmente**: Por cada celda (o rectángulo de colisión generado) dentro del Tilemap, el sistema ahora aplica la transformación mundial del padre. Esto significa que cada pequeño colisionador es "movido", "rotado" y "escalado" para que coincida perfectamente con la posición y apariencia del Tilemap en la escena.

3.  **Realizar la Comprobación con Coordenadas Corregidas**: Una vez que la celda de colisión del Tilemap está en su posición correcta en el mundo, se realiza la comprobación de colisión contra el otro objeto (por ejemplo, el jugador).

Este cambio asegura que los límites de la colisión del Tilemap siempre estén sincronizados con lo que se ve en la pantalla, eliminando por completo las "colisiones fantasma" y haciendo que la detección sea precisa y fiable.
