# Estado del Problema del Sistema de UI - Canvas

Este documento describe un problema persistente con el sistema de UI, específicamente con el componente `Canvas` y sus modos `World Space` y `Screen Space`.

## Descripción del Problema

El objetivo es que los elementos de la interfaz de usuario (UI) dentro de un `Canvas` configurado en modo **'Screen Space'** se posicionen y se comporten en relación con los límites de la pantalla del juego.

El problema actual es una inconsistencia fundamental entre cómo se visualiza el `Canvas` en el editor y cómo se comporta la lógica de posicionamiento de sus elementos hijos:

1.  **Visualización del Gizmo**: Al seleccionar un `Canvas` en modo `Screen Space`, el editor dibuja correctamente un "gizmo" (un recuadro punteado) que representa los límites del `Canvas` y lo expande para que ocupe toda la vista de la escena. Esto da la impresión visual de que el `Canvas` abarca toda la pantalla.
2.  **Lógica de Posicionamiento**: Sin embargo, la lógica subyacente que controla la interacción y el posicionamiento de los elementos UI hijos (como `UIImage`) no respeta estos límites visuales. En su lugar, sigue utilizando las dimensiones definidas para el modo `World Space`.

El resultado es que cuando un usuario intenta mover un elemento UI hacia los bordes del gizmo visible en `Screen Space`, el elemento puede ser recortado (clipping) o desaparecer, porque la lógica interna cree que los límites son mucho más pequeños (los del `World Space`).

## Intentos de Solución

Se han realizado dos intentos principales para solucionar este problema, ambos sin éxito.

### Intento 1: Modificar el Renderizado en el Editor

*   **Hipótesis**: Se creyó que el problema era que el editor forzaba un modo de renderizado incorrecto (`World Space`) para todos los `Canvas`, ignorando la configuración de `Screen Space`.
*   **Acción**: Se modificó `js/engine/Renderer.js` para eliminar la lógica que forzaba el renderizado en `World Space` dentro del editor. La idea era que si el `Canvas` se renderizaba correctamente "despegado" y superpuesto a toda la pantalla, el problema de límites desaparecería.
*   **Resultado**: **Incorrecto**. Esta solución empeoró el problema. El `Canvas` y sus elementos se "despegaron" del gizmo en la escena, rompiendo la correspondencia visual entre el objeto en la jerarquía y su representación en el editor, lo cual no era el comportamiento deseado.

### Intento 2: Unificar la Lógica de Cálculo de Límites

*   **Hipótesis**: Se identificó que el problema era una discrepancia entre dos sistemas: la lógica de dibujado de gizmos (`SceneView.js`) y la lógica de renderizado en tiempo de ejecución (`Renderer.js`). La solución propuesta fue centralizar el cálculo de la posición y tamaño en una única función (`getAbsoluteRect` en `UITransformUtils.js`) y hacerla "consciente" del modo del `Canvas`.
*   **Acción**:
    1.  Se modificó `getAbsoluteRect` para que aceptara el `renderer` como parámetro y así pudiera acceder a las dimensiones reales de la pantalla.
    2.  Cuando `getAbsoluteRect` detectaba un `Canvas` en `Screen Space`, utilizaba las dimensiones del `renderer` como el rectángulo base.
    3.  Se actualizaron todas las llamadas a esta función en `SceneView.js` (para los gizmos) y en `Renderer.js` (para el dibujado final) para que usaran esta nueva lógica unificada.
*   **Resultado**: **Incorrecto**. A pesar de que la lógica parecía sólida y completa, el feedback fue que el problema no solo no se solucionó, sino que empeoró.

## Estado Actual

Actualmente, todos los cambios relacionados con estos intentos han sido revertidos. El problema persiste en su estado original. Se necesita un nuevo enfoque para diagnosticar la causa raíz del porqué la lógica de posicionamiento de los elementos UI no utiliza los límites correctos del `Canvas` padre cuando este se encuentra en modo `Screen Space`.
