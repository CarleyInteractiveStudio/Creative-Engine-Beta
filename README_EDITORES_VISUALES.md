# 🎨 Guía de Editores Visuales - Creative Engine

Creative Engine incluye una suite de herramientas visuales para gestionar gráficos, animaciones y niveles de forma intuitiva.

---

## ✂️ 1. Editor de Sprites (Sprite Slicer)

Permite recortar una imagen grande en múltiples sprites pequeños (útil para hojas de personajes o tilesets).

- **Cómo Abrirlo:** Haz doble clic en cualquier imagen (.png, .jpg) en el Navegador de Assets.
- **Modos de Recorte:**
  - **Automático:** Detecta los bordes de los dibujos.
  - **Grid:** Divide la imagen en celdas iguales (ej: 32x32).
- **Pivotes:** Define el punto central de cada sprite (ej: los pies de un personaje).

---

## 🎞️ 2. Editor de Animaciones (.cea)

Crea secuencias de imágenes para tus personajes u objetos.

- **Cómo Abrirlo:** Haz doble clic en un archivo `.cea`.
- **Línea de Tiempo:** Arrastra sprites desde el navegador hacia la línea de tiempo para añadir fotogramas.
- **Cebolla (Onion Skin):** Muestra el frame anterior y posterior de forma transparente para ayudarte a animar con fluidez.
- **Velocidad (FPS):** Ajusta qué tan rápido se reproduce la animación.

---

## 🎮 3. Controlador de Animación (StateMachine)

Gestiona la lógica de cuándo debe reproducirse cada animación (ej: Quieto -> Caminar).

- **Cómo Abrirlo:** Haz doble clic en un archivo `.ceanim`.
- **Grafo Visual:** Haz clic derecho para crear estados. Conecta estados arrastrando desde un nodo a otro.
- **Smart Mode (Modo Inteligente):** Si lo activas, el motor detectará automáticamente si el personaje se mueve arriba, abajo, izquierda o derecha y reproducirá la animación correspondiente sin necesidad de programar.

---

## 🗺️ 4. Editor de Tilemaps (Mapas de Azulejos)

Diseña niveles basados en rejilla de forma rápida.

- **Componente:** Añade una Ley de tipo **Tilemap** a una Materia.
- **Paletas:** Abre la ventana **Paleta de Tiles** (Ventana > Paleta de Tiles) y arrastra tu tileset.
- **Herramientas:**
  - **Pincel:** Pinta azulejos individuales.
  - **Cubo:** Rellena áreas grandes.
  - **Goma:** Borra azulejos.
- **Capas:** Crea múltiples capas para tener fondos y decoraciones por separado.
- **Colisiones:** Añade la Ley **TilemapCollider2D** para generar colisiones automáticas basadas en los azulejos pintados.
