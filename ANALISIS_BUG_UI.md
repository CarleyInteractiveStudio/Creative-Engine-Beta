# Análisis del Bug de Cálculo de Posición en la UI

## 1. Resumen del Problema

Se ha detectado un bug crítico en la función `UITransformUtils.getAbsoluteRect`, que es la responsable de calcular la posición y el tamaño final de los elementos de la interfaz de usuario (UI) en el espacio del mundo.

El problema se manifiesta como un cálculo incorrecto de las coordenadas `x` e `y` de los elementos, especialmente cuando se utilizan diferentes configuraciones de anclaje y pivote. La lógica matemática actual no traduce correctamente las coordenadas del sistema de la UI (Y-UP, donde el eje Y positivo va hacia arriba) al sistema de coordenadas del `Canvas` del mundo (Y-DOWN, donde el eje Y positivo va hacia abajo).

## 2. Cómo Reproducir el Bug

He creado una prueba automatizada que demuestra este fallo de forma fiable. Para reproducirlo:

### Paso 1: Activa la Prueba de Auditoría

1.  Abre el archivo `tests/ui_audit.spec.js`.
2.  Cambia la línea `test.describe.skip('UI System Audit', () => {` por `test.describe('UI System Audit', () => {` (es decir, elimina el `.skip`).

### Paso 2: Ejecuta el Conjunto de Pruebas

Desde la terminal, ejecuta el siguiente comando:

```bash
node node_modules/@playwright/test/cli.js test
```

### Resultado Esperado (Fallo)

La prueba `ui_audit.spec.js` fallará. La salida te mostrará las discrepancias exactas entre los valores de posición **esperados** y los **recibidos** (calculados por el motor). Por ejemplo:

```
Error: expect(received).toEqual(expected)

- Expected: {"height": 50, "width": 100, "x": -400, "y": 250}
+ Received: {"height": 50, "width": 100, "x": -450, "y": -325}
```

Este fallo confirma el bug en la lógica de cálculo.

## 3. Causa Técnica del Bug

El problema se encuentra en el archivo `js/engine/UITransformUtils.js`, dentro de la función `getAbsoluteRect`.

La lógica actual intenta convertir las coordenadas, pero falla en cómo maneja los sistemas de referencia, especialmente al calcular la posición `y`:

*   **Sistema de Coordenadas de la UI (Lógico):** El anclaje y la posición de los `UITransform` se definen en un sistema Y-UP. El punto `{0,0}` está en la esquina inferior izquierda del elemento padre, y la `y` positiva se mueve hacia arriba.
*   **Sistema de Coordenadas del Mundo/Canvas (Renderizado):** El `Canvas` del navegador renderiza en un sistema Y-DOWN. El punto `{0,0}` está en la esquina superior izquierda, y la `y` positiva se mueve hacia abajo.

La función `getAbsoluteRect` mezcla incorrectamente estos dos sistemas. Por ejemplo, al calcular `finalY`, resta valores del borde superior (`parentRect.y`), pero usa cálculos basados en la lógica Y-UP, lo que produce un resultado incorrecto y aparentemente ilógico.

## 4. Estrategia de Solución Recomendada

Para solucionar este bug, te recomiendo seguir un enfoque de Desarrollo Guiado por Pruebas (TDD) utilizando el test que he preparado:

1.  **Habilita la prueba `ui_audit.spec.js`** para que se ejecute y falle. Esto te dará una señal clara de "rojo".

2.  **Refactoriza `getAbsoluteRect`:** Modifica la función en `js/engine/UITransformUtils.js` con el objetivo de hacer que la prueba pase. La clave es separar claramente los cálculos:
    *   **Cálculo de la posición del pivote:** Primero, calcula la posición del punto de pivote del elemento *dentro* del sistema de coordenadas de su padre (Y-UP).
    *   **Cálculo de la esquina superior izquierda:** A partir de la posición del pivote, calcula dónde estaría la esquina superior izquierda del rectángulo del elemento.
    *   **Conversión a Coordenadas del Mundo:** Finalmente, convierte esta posición de esquina al sistema de coordenadas del mundo (Y-DOWN).

3.  **Ejecuta la prueba repetidamente:** Después de cada pequeño cambio en la lógica de `getAbsoluteRect`, ejecuta la prueba. Tu objetivo es que todas las aserciones en `ui_audit.spec.js` pasen (señal de "verde").

4.  **Verifica que no haya regresiones:** Asegúrate de que la prueba `uitext_render.spec.js` siga pasando.

Al seguir este proceso, puedes estar seguro de que tu nueva lógica de cálculo es correcta para todos los casos de anclaje, anidamiento y pivote definidos en la prueba, y que has solucionado el bug de forma robusta.
