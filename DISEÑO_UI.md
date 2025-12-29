# Diseño del Sistema de UI para Creative Engine

## 1. Visión General y Filosofía

El sistema de UI propuesto se inspira en la arquitectura robusta y modular del Canvas de Unity, pero adaptado a la naturaleza 2D y basada en web de Creative Engine. El objetivo es proporcionar un flujo de trabajo intuitivo para que los desarrolladores puedan crear interfaces de usuario (menús, HUDs, etc.) que sean tanto funcionales en el juego como fáciles de editar en la escena.

La filosofía principal es la **separación de conceptos**:

-   **Mundo del Juego (World Space):** Donde viven los sprites, personajes y la lógica del juego. Se rige por las físicas, las cámaras del juego y las coordenadas del mundo.
-   **Interfaz de Usuario (Screen Space):** Una capa de renderizado independiente que se dibuja *sobre* el mundo del juego. Se rige por las coordenadas de la pantalla, permitiendo que la UI se mantenga consistente sin importar la resolución o el movimiento de la cámara del juego.

## 2. Componentes Clave

Para lograr este sistema, se introducirían los siguientes componentes nuevos:

### a. `Canvas`

-   **Propósito:** Es el componente raíz y el contenedor principal para todos los elementos de la UI. Cualquier `Materia` que tenga un componente `Canvas` se convierte en el origen de una jerarquía de UI.
-   **Funcionamiento:**
    -   Actúa como un "marcador" que le indica al `Renderer` que todos sus hijos deben ser dibujados en el pase de renderizado de la UI, no en el pase normal de la escena.
    -   Gestionaría la escala general de la UI para adaptarse a diferentes resoluciones de pantalla (si se implementa un sistema de escalado).
    -   En el editor, un `Canvas` mostraría un gizmo rectangular en la `Scene View` que representa los límites de la pantalla del juego, ayudando al desarrollador a posicionar los elementos visualmente.

### b. `RectTransform`

-   **Propósito:** Un nuevo tipo de componente de transformación, diseñado específicamente para los elementos de UI. Reemplazaría al `Transform` estándar para cualquier `Materia` que sea parte de una jerarquía de `Canvas`.
-   **Propiedades Clave:**
    -   **Anchors (Anclas):** Definen cómo un elemento de UI se "ancla" a su padre. Por ejemplo, un botón puede estar anclado a la esquina inferior derecha. Si el padre (u otro `Canvas`) cambia de tamaño, el botón mantendrá su posición relativa a esa esquina.
    -   **Pivot (Pivote):** El punto sobre el cual el `RectTransform` rota y escala. Por defecto, `(0.5, 0.5)` representa el centro.
    -   **Posición (X, Y, Z):** Coordenadas relativas a su punto de anclaje.
    -   **Ancho y Alto (Width, Height):** Las dimensiones del rectángulo del elemento.
    -   **Rotación y Escala:** Similar al `Transform` tradicional.

### c. `UIImage`

-   **Propósito:** El componente principal para mostrar imágenes en la UI. Sería el equivalente al `SpriteRenderer` pero para el sistema de `Canvas`.
-   **Propiedades:**
    -   **Source Image/Sprite:** Referencia al asset de imagen (`.png`, `.jpg` o un sprite de un `.ceSprite`) que se debe mostrar.
    -   **Color:** Un tinte que se puede aplicar a la imagen.
    -   **Material (Opcional, futuro):** Para aplicar shaders o efectos especiales.

### d. `UIText` (Futuro)

-   **Propósito:** Componente para renderizar texto en la UI.
-   **Propiedades:**
    -   **Text:** El contenido del texto.
    -   **Font:** Referencia a un asset de fuente.
    -   **Size, Color, Alignment:** Propiedades de estilo básicas.

## 3. Funcionamiento Detallado del Sistema

### a. Jerarquía en la Escena

Un sistema de UI típico se vería así en la ventana de Jerarquía:

```
- MiCanvas (Materia con componente Canvas)
  - PanelPrincipal (Materia con RectTransform, UIImage)
    - BotonJugar (Materia con RectTransform, UIImage)
      - TextoBoton (Materia con RectTransform, UIText)
  - BarraDeVida (Materia con RectTransform, UIImage)
```

-   El objeto `MiCanvas` define el inicio del sistema de UI.
-   Todos los hijos (`PanelPrincipal`, `BotonJugar`, etc.) usarían `RectTransform` en lugar de `Transform` para su posicionamiento.

### b. Proceso de Renderizado

El `Renderer` del motor se modificaría para realizar un **renderizado en dos pases**:

1.  **Pase 1: Renderizado de la Escena (World Space)**
    -   El `Renderer` dibuja todos los `SpriteRenderer`, `TilemapRenderer`, etc., como lo hace actualmente, utilizando las cámaras definidas en la escena.

2.  **Pase 2: Renderizado de la UI (Screen Space)**
    -   Después de dibujar el mundo del juego, el `Renderer` busca todos los objetos `Canvas` activos.
    -   Para cada `Canvas`, configura una cámara ortográfica virtual que coincide con las dimensiones de la pantalla (o del `gameCanvas`).
    -   Recorre la jerarquía de cada `Canvas` y dibuja los componentes `UIImage` y `UIText` usando sus `RectTransform` para calcular sus posiciones directamente en coordenadas de pantalla.
    -   Esto garantiza que la UI siempre se dibuje "encima" del juego, sin ser afectada por el zoom o el movimiento de la cámara del mundo.

### c. Flujo de Trabajo del Usuario

1.  **Creación:** El usuario haría clic derecho en la Jerarquía y seleccionaría `UI > Canvas` para crear el objeto raíz.
2.  **Añadir Elementos:** Haría clic derecho sobre el objeto `Canvas` y seleccionaría `UI > Image` o `UI > Text` para crear nuevos elementos de UI. Estos se crearían automáticamente con un `RectTransform`.
3.  **Edición Visual:** En la `Scene View`, al seleccionar un elemento de UI, se mostrarían los gizmos del `RectTransform` (un rectángulo con manejadores para cambiar el tamaño y un pivote central). El usuario podría mover y escalar elementos visualmente.
4.  **Ajuste en Inspector:** En el `Inspector`, el usuario podría ajustar con precisión las propiedades del `RectTransform` (anclas, posición numérica) y del componente visual (`UIImage`, etc.).
5.  **Resultado:** Al dar "Play", la UI aparecería en la `Game View` exactamente como fue diseñada, superpuesta a la escena del juego.
