# Diseño del Sistema de UI para Creative Engine

## 1. Visión General y Filosofía

El sistema de UI propuesto se inspira en la arquitectura robusta y modular del Canvas de Unity, pero adaptado a la naturaleza 2D y basada en web de Creative Engine. El objetivo es proporcionar un flujo de trabajo intuitivo para que los desarrolladores puedan crear interfaces de usuario (menús, HUDs, etc.) que sean tanto funcionales en el juego como fáciles de editar en la escena.

La filosofía principal es la separación de conceptos y modos de renderizado:

*   **Mundo del Juego (World Space):** Donde viven los sprites, personajes y la lógica del juego. Se rige por las físicas, las cámaras del juego y las coordenadas del mundo.
*   **Interfaz de Usuario (Screen Space):** Una capa de renderizado independiente que se dibuja sobre el mundo del juego. Se rige por las coordenadas de la pantalla, permitiendo que la UI se mantenga consistente sin importar la resolución o el movimiento de la cámara del juego.

## 2. Componentes Clave

Para lograr este sistema, se introducirían los siguientes componentes nuevos:

### a. Canvas

*   **Propósito:** Es el componente raíz y el contenedor principal para todos los elementos de la UI. Cualquier `Materia` que tenga un componente `Canvas` se convierte en el origen de una jerarquía de UI.
*   **Propiedades Clave:**
    *   `renderMode`: Un selector con dos opciones:
        *   `Screen Space`: El comportamiento por defecto. El `Canvas` y todo su contenido se renderizan en una capa superpuesta al juego, ignorando la cámara del mundo. Ideal para HUDs, menús principales, etc.
        *   `World Space`: El `Canvas` y su contenido se comportan como cualquier otro objeto en la escena. Su posición, rotación y escala son relativas al mundo del juego y necesita estar dentro del frustum de una cámara para ser visible. Ideal para barras de vida sobre personajes, terminales interactivas en un nivel, etc.
*   **Funcionamiento:**
    *   Actúa como un "marcador" que le indica al `Renderer` que todos sus hijos deben ser tratados como elementos de UI.
    *   En el editor, un `Canvas` mostrará un gizmo rectangular en la `Scene View` que representa sus límites, ayudando al desarrollador a posicionar los elementos visualmente.

### b. RectTransform

*   **Propósito:** Un nuevo tipo de componente de transformación, diseñado específicamente para los elementos de UI. Reemplazaría al `Transform` estándar para cualquier `Materia` que sea parte de una jerarquía de `Canvas`.
*   **Propiedades Clave:**
    *   **Anchors (Anclas):** Definen cómo un elemento de UI se "ancla" a su padre. Por ejemplo, un botón puede estar anclado a la esquina inferior derecha. Si el padre (u otro `Canvas`) cambia de tamaño, el botón mantendrá su posición relativa a esa esquina.
    *   **Pivot (Pivote):** El punto sobre el cual el `RectTransform` rota y escala. Por defecto, `(0.5, 0.5)` representa el centro.
    *   **Posición (X, Y, Z):** Coordenadas relativas a su punto de anclaje.
    *   **Ancho y Alto (Width, Height):** Las dimensiones del rectángulo del elemento.
    *   **Rotación y Escala:** Similar al `Transform` tradicional.

### c. UIImage

*   **Propósito:** El componente principal para mostrar imágenes en la UI. Sería el equivalente al `SpriteRenderer` pero para el sistema de `Canvas`.
*   **Propiedades:**
    *   `sourceImage`: Referencia al asset de imagen (.png, .jpg o un sprite de un `.ceSprite`) que se debe mostrar.
    *   `color`: Un tinte que se puede aplicar a la imagen.

## 3. Funcionamiento Detallado del Sistema

### a. Jerarquía en la Escena

Un sistema de UI típico se vería así en la ventana de Jerarquía:

```
- MiCanvas (Materia con componente Canvas y RectTransform)
  - PanelPrincipal (Materia con RectTransform, UIImage)
    - BotonJugar (Materia con RectTransform, UIImage)
    - BarraDeVida (Materia con RectTransform, UIImage)
```

El objeto `MiCanvas` define el inicio del sistema de UI. Todos los hijos usarían `RectTransform` en lugar de `Transform` para su posicionamiento.

### b. Proceso de Renderizado

El `Renderer` del motor se modificaría para realizar un renderizado en dos pases:

*   **Pase 1: Renderizado de la Escena (World Space)**
    *   El `Renderer` dibuja todos los `SpriteRenderer`, `TilemapRenderer`, etc., como lo hace actualmente.
    *   Adicionalmente, en este pase, busca y dibuja todos los `UIImage` que pertenezcan a un `Canvas` cuyo `renderMode` esté configurado en `World Space`.

*   **Pase 2: Renderizado de la UI (Screen Space)**
    *   Después de dibujar el mundo del juego, el `Renderer` busca todos los objetos `Canvas` activos con `renderMode` en `Screen Space`.
    *   Para cada uno de estos `Canvas`, configura una cámara ortográfica virtual que coincide con las dimensiones de la pantalla.
    *   Recorre la jerarquía de cada `Canvas` y dibuja los componentes `UIImage` usando sus `RectTransform` para calcular sus posiciones directamente en coordenadas de pantalla.

## 4. Flujo de Trabajo del Usuario e Integración en el Editor

### a. Creación de Elementos

*   **Lógica:** Se debe modificar `js/editor/ui/HierarchyWindow.js`.
*   **Ejemplo de Código (simulado):**
    ```javascript
    // Dentro del manejador del menú contextual de la jerarquía

    const createMenuItem = (label, parent) => { /* ... */ };
    const uiMenu = createMenuItem("UI", parentMenu);

    createMenuItem("Canvas", uiMenu).addEventListener('click', () => {
        const canvasMateria = MateriaFactory.createCanvasObject(); // Nueva función en MateriaFactory
        SceneManager.currentScene.addMateria(canvasMateria);
        updateHierarchy();
    });

    createMenuItem("Image", uiMenu).addEventListener('click', () => {
        // Lógica para añadir un objeto Image como hijo del seleccionado
        const selectedMateria = getSelectedMateria();
        if (selectedMateria && selectedMateria.getComponent(Canvas) || selectedMateria.getComponent(RectTransform)) {
            const imageMateria = MateriaFactory.createImageObject(); // Nueva función
            imageMateria.parent = selectedMateria.id;
            SceneManager.currentScene.addMateria(imageMateria);
            updateHierarchy();
        }
    });
    ```

### b. Edición en el Inspector

*   **Lógica:** Se debe ampliar `js/editor/ui/InspectorWindow.js`.
*   **Ejemplo de Código (simulado):**
    ```javascript
    // Dentro de la función que renderiza componentes

    // ... otros componentes
    else if (component instanceof Canvas) {
        html += `<div>
            <h3>Canvas</h3>
            <label>Render Mode</label>
            <select data-component="Canvas" data-prop="renderMode">
                <option value="Screen Space" ${component.renderMode === 'Screen Space' ? 'selected' : ''}>Screen Space</option>
                <option value="World Space" ${component.renderMode === 'World Space' ? 'selected' : ''}>World Space</option>
            </select>
        </div>`;
    }
    else if (component instanceof RectTransform) {
        // HTML para editar anclas, pivote, posición, tamaño, etc.
    }
    else if (component instanceof UIImage) {
        // HTML para asignar una imagen fuente y un color
    }
    ```

### c. Gizmos en la Vista de Escena

*   **Lógica:** Se debe modificar `js/editor/SceneView.js`.
*   **Ejemplo de Código (simulado):**
    ```javascript
    // Dentro del bucle de dibujo del overlay (drawOverlay)

    if (selectedMateria) {
        const rectTransform = selectedMateria.getComponent(RectTransform);
        if (rectTransform) {
            // Lógica para obtener las 4 esquinas del rectángulo en coordenadas de pantalla
            const worldCorners = rectTransform.getWorldCorners();
            const screenCorners = worldCorners.map(c => worldToScreenPoint(c));

            // Dibujar el rectángulo del RectTransform
            ctx.strokeStyle = 'cyan';
            ctx.beginPath();
            ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
            ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
            ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
            ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
    ```
