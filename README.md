# Informe de Bug: Problema de Clipping en el Canvas (Screen Space)

**Estado:** <span style="color:red;">NO SOLUCIONADO</span>

Este documento detalla un bug identificado en el sistema de renderizado de la UI del motor, específicamente con los componentes `Canvas` configurados en modo "Screen Space".

## Descripción del Problema

Cuando un `Materia` tiene un componente `Canvas` y su modo de renderizado está configurado como "Screen Space", todos los elementos de UI hijos de este `Canvas` (como `Imagen`, `Texto`, etc.) se ven incorrectamente cortados (clipping) si se posicionan fuera de un área de 800x600 píxeles, contada desde la esquina superior izquierda de la vista de juego o escena.

El comportamiento esperado es que los elementos de UI en modo "Screen Space" se puedan posicionar en cualquier lugar de la pantalla y se ajusten al tamaño real de la ventana o vista del juego, sin ser cortados por un límite fijo.

**Ejemplo:** Un botón anclado a la esquina inferior derecha de una pantalla de 1920x1080 no será visible, porque está fuera del área permitida de 800x600.

## Análisis de la Causa Raíz

La investigación del código ha revelado que la causa del problema se encuentra en la interacción entre el componente `Canvas` y el `Renderer`.

1.  **Inicialización con Tamaño Fijo:** En `js/engine/Components.js`, el constructor del componente `Canvas` inicializa su tamaño con un valor fijo:
    ```javascript
    this.size = { width: 800, height: 600 };
    ```

2.  **Aplicación de Clipping en el Renderizador:** En `js/engine/Renderer.js`, dentro de la función `drawCanvas`, se utiliza este tamaño para crear un área de recorte (clipping path) antes de dibujar los elementos de la UI.
    ```javascript
    // Dentro de Renderer.prototype.drawCanvas
    ctx.save();
    // ...
    ctx.rect(0, 0, canvasComponent.size.width, canvasComponent.size.height);
    ctx.clip();
    // ... se dibujan los elementos hijos ...
    ctx.restore();
    ```

3.  **Falta de Actualización:** El problema principal es que el valor `canvasComponent.size` **nunca se actualiza** cuando la ventana principal del editor o la vista de juego cambia de tamaño. Permanece fijo en 800x600, causando el efecto de clipping no deseado en viewports más grandes.

## Solución Propuesta (No Implementada)

La solución consiste en modificar la función `resize()` en `js/engine/Renderer.js` para que, además de redimensionar el lienzo del `<canvas>`, itere sobre todos los `Materia` de la escena actual, busque los componentes `Canvas` en modo "Screen Space" y actualice su propiedad `size` para que coincida con las nuevas dimensiones del viewport.

**Por solicitud expresa, esta solución no ha sido implementada y los cambios relacionados han sido revertidos.**

El sistema permanece en su estado original y el bug persiste. Este documento sirve como registro del problema para futura referencia.
