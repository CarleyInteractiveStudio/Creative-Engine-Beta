# 🎨 Guía de Editores Visuales - Creative Engine

Creative Engine incluye herramientas especializadas para la creación de activos y construcción de mundos sin necesidad de código.

---

## 🎭 1. Controlador de Animación (.ceanim)
Gestiona la lógica de estados de tus personajes.

### Conceptos Clave
- **Estados:** Nodos que contienen un clip de animación (.cea).
- **Transiciones:** Flechas que conectan estados bajo ciertas condiciones.
- **Smart Mode:** Si está activo, el motor elige automáticamente el estado (Caminar, Saltar, Quieto) basándose en la velocidad del Rigidbody2D o el componente Movement.

### Uso
1. Crea un asset de **Controlador de Animación**.
2. Haz doble clic para abrir el editor visual.
3. Arrastra clips `.cea` al grafo.
4. Conecta estados haciendo clic derecho sobre un nodo y seleccionando **Crear Transición**.

---

## 🦴 2. Animación Esquelética y Skinning
A diferencia de la animación por cuadros, la esquelética permite mover partes de un objeto de forma fluida.

- **Bone (Hueso):** Define la estructura jerárquica.
- **SkeletonRenderer:** Toma una imagen y la deforma según el movimiento de los huesos.
- **IK (Cinemática Inversa):** Permite mover el final de una cadena (como un pie) y que el resto de los huesos (pierna, rodilla) se ajusten automáticamente.

---

## 🗺️ 3. Paleta de Tiles (.cepalette)
Pinta niveles rápidamente usando rejillas de sprites.

1. Crea un asset de **Paleta de Tiles**.
2. Ábrelo y asocia una hoja de sprites (Spritesheet) o imágenes sueltas.
3. En la ventana **Paleta**, selecciona un tile.
4. En la escena, usa el **Pincel (B)** para pintar o la **Goma (N)** para borrar.

---

## 🖼️ 4. Editor de Sprites (Slicer)
Extrae cuadros individuales de una imagen grande.

- **Automatic:** Carl IA detecta automáticamente los bordes de los sprites.
- **Grid:** Divide por tamaño de celda (ej: 32x32) o por conteo de filas/columnas.
- **Pivote:** Define el centro de rotación y posición del sprite.

---

## ⛰️ 5. Editor de Terreno 2D
Permite pintar formas orgánicas de suelo y paredes con texturas personalizadas.

- **Capas:** Puedes tener múltiples texturas superpuestas.
- **Colisiones:** El componente **TerrenoCollider2D** genera automáticamente la forma física de lo que has pintado.

---

## 🍱 6. Editor de UI
Crea menús y HUDs arrastrando elementos. Los componentes **Layout Group** ayudan a mantener todo organizado automáticamente.

- **UITransform:** Reemplaza al Transform tradicional para elementos de interfaz, permitiendo usar anclajes (anchors) y pivotes para diseño responsivo.

---

## 🎞️ 7. VidSpri: Conversor de Video a Sprite
Herramienta integrada para convertir archivos de video en hojas de sprites o secuencias de imágenes optimizadas para el motor. Accede desde **Ventana > Vid Spri**.
