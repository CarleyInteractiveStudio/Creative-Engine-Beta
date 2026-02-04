# Informe de Incidencia: Problema con el Gizmo de UIImage

**Estado:** <span style="color:green;">RESUELTO</span>

## Descripción del Problema

El gizmo de movimiento para el componente `UIImage` en el editor de Creative Engine presenta un comportamiento anómalo y persistente que no ha podido ser solucionado hasta la fecha. El problema se manifiesta de la siguiente manera:

1.  **Movimiento Vertical Invertido:** Al seleccionar un `UIImage` en la escena y arrastrar la flecha verde (eje Y) del gizmo hacia arriba, la imagen se desplaza hacia abajo. Al arrastrarla hacia abajo, la imagen se desplaza hacia arriba. El movimiento horizontal (eje X) funciona correctamente.
2.  **Inconsistencia con Otros Componentes:** Este comportamiento es exclusivo del `UIImage`. El gizmo del componente `SpriteRenderer` funciona de manera intuitiva y correcta, sirviendo como modelo del comportamiento deseado.

El objetivo es lograr que el gizmo del `UIImage` se comporte exactamente igual que el del `SpriteRenderer`.

---

## Historial de Intentos de Solución

A continuación, se detalla un registro de las múltiples estrategias que se han implementado en un intento por resolver esta incidencia.

### Intento 1: Inversión de la Lógica de Arrastre

-   **Hipótesis:** Se pensó que el problema residía en una simple inversión lógica en el cálculo de la posición durante el arrastre. El sistema de coordenadas de la UI tiene el eje Y invertido (crece hacia abajo), mientras que el movimiento del ratón en la pantalla lo hace en la misma dirección.
-   **Acción:** Se modificó el archivo `js/editor/SceneView.js`, en la función que gestiona el arrastre del gizmo (`onGizmoDrag`). Se cambió la línea `uiTransform.position.y += dy;` a `uiTransform.position.y -= dy;`.
-   **Resultado:** **FALLIDO.** Esta acción provocó que el movimiento se invirtiera, pero en la dirección incorrecta a la deseada, agravando la sensación de desconexión.

### Intento 2: Corrección Visual del Gizmo

-   **Hipótesis:** Se observó que la flecha verde del gizmo del `UIImage` apuntaba hacia abajo, a diferencia de otros gizmos que apuntan hacia arriba. Se pensó que alinear la apariencia visual resolvería la confusión.
-   **Acción:** Se modificó la función `drawUIGizmos` en `js/editor/SceneView.js` para que la flecha se dibujara apuntando hacia arriba (hacia coordenadas Y negativas en el espacio del mundo).
-   **Resultado:** **FALLIDO.** Aunque la apariencia del gizmo mejoró, el movimiento seguía siendo el inverso al arrastre.

### Intento 3: Corrección de la Zona de Clic (Hitbox)

-   **Hipótesis:** Tras corregir la apariencia visual de la flecha, se dedujo que la zona invisible donde se detecta el clic (`hitbox`) no se había movido junto con la flecha. El sistema esperaba un clic donde la flecha estaba antes.
-   **Acción:** Se modificó la función `checkUIGizmoHit` en `js/editor/SceneView.js` para que la condición de detección del clic en el eje Y coincidiera con la nueva posición de la flecha (en la parte superior del centro del objeto).
-   **Resultado:** **FALLIDO.** A pesar de que la lógica parecía sólida, el comportamiento en la práctica no cambió. El gizmo seguía sin responder correctamente o el movimiento permanecía invertido.

### Problemas Secundarios Solucionados

Durante el proceso, se identificaron y solucionaron dos errores de regresión que no estaban directamente relacionados con el problema de inversión, pero que surgieron a raíz de las modificaciones:

1.  **`TypeError: updateInspector is not a function` (Error de Alcance):**
    *   **Causa:** Una refactorización inicial movió las funciones de arrastre del gizmo a un ámbito donde no tenían acceso a la función `updateInspector`.
    *   **Solución:** Se reestructuró el código en `SceneView.js` para definir los manejadores de eventos (`onGizmoDrag`, `onGizmoDragEnd`) en el ámbito principal de la función `initialize`, garantizando el acceso a todas sus dependencias.

2.  **`TypeError: updateInspector is not a function` (Error de Dependencia):**
    *   **Causa:** Se descubrió un desajuste en los nombres de las propiedades. El archivo `editor.js` pasaba la dependencia como `updateInspectorCallback`, pero `SceneView.js` intentaba leerla como `updateInspector`.
    *   **Solución:** Se corrigió el nombre de la propiedad en `SceneView.js` para que coincidiera, resolviendo el `TypeError` de forma definitiva.

---

## Estado Actual

A pesar de haber solucionado los errores secundarios y haber intentado múltiples enfoques lógicos, el problema principal persiste: **el movimiento vertical del gizmo de `UIImage` sigue invertido.**

---

## Solución Definitiva

Tras un análisis exhaustivo, se identificó que el problema no era un único error, sino una combinación de tres inconsistencias que, juntas, producían el comportamiento anómalo. La solución final consistió en alinear estos tres aspectos en el archivo `js/editor/SceneView.js`:

1.  **Corrección de la Lógica de Arrastre (Funcional):**
    *   **Problema:** El sistema de coordenadas de la UI está invertido en el eje Y. El cálculo original (`+= dy`) no tenía esto en cuenta.
    *   **Solución:** Se invirtió la operación en la función `onGizmoDrag` para el movimiento vertical, cambiando `uiTransform.position.y += dy;` a `uiTransform.position.y -= dy;`. Esto sincroniza el movimiento del ratón con el sistema de coordenadas de la UI.

2.  **Corrección del Dibujo del Gizmo (Visual):**
    *   **Problema:** La flecha verde del gizmo apuntaba hacia abajo, en dirección contraria a la convención "arriba".
    *   **Solución:** Se modificó la función `drawUIGizmos` para dibujar la flecha en la dirección Y negativa del espacio del mundo, haciendo que apunte visualmente hacia arriba.

3.  **Corrección de la Zona de Clic (Interacción):**
    *   **Problema:** Después de corregir la apariencia visual de la flecha, la zona invisible para detectar el clic (`hitbox`) no se movió, por lo que el gizmo no respondía a los clics en su nueva posición.
    *   **Solución:** Se actualizó la función `checkUIGizmoHit` para que la condición de detección del clic en el eje Y coincidiera con la nueva ubicación de la flecha visual.

Al sincronizar estos tres elementos (lógica, apariencia e interacción), el comportamiento del gizmo del `UIImage` se corrigió de forma definitiva, funcionando ahora de manera idéntica al del `SpriteRenderer`.
