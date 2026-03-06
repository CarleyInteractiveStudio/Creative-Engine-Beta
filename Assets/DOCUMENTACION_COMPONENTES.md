# 🧩 Atlas de Componentes (Leyes): Creative Engine

En Creative Engine, los componentes (llamados **Leyes**) son módulos de datos y lógica que se adjuntan a las **Materias** (objetos). Esta guía detalla cada uno de los más de 50 componentes integrados, sus propiedades y su integración con scripting.

---

## 🏗️ 1. Componentes del Núcleo (Core)

### 📍 Transform (Posición)
Define la presencia física del objeto en el espacio 2D.
- **Propiedades:** `posicion` (x, y), `rotacion`, `escala` (x, y), `voltearH`, `voltearV`.
- **Scripting:** `posicion.x = 200;`

### 📷 Camera (Cámara)
Define el punto de vista del jugador y qué se debe dibujar.
- **Propiedades:** `zoom`, `backgroundColor` (Fondo), `cullingMask` (Capas visibles), `depth` (Prioridad).
- **Scripting:** `camara.zoom = 1.2;`

### 🎨 DrawingOrder (Orden de Dibujo)
Sobrescribe el orden visual sin cambiar el eje Z.
- **Propiedades:** `order` (Número entero).
- **Scripting:** `ordenDeDibujo.order = 10;`

---

## 🎨 2. Renderizado y Visuales

### 🖼️ SpriteRenderer
Dibuja imágenes simples o cuadros de un spritesheet.
- **Propiedades:** `source` (imagen), `spriteAssetPath` (.ceSprite), `color`, `opacity`.
- **Scripting:** `renderizadorDeSprite.opacity = 0.5;`

### 🎞️ VideoPlayer
Reproduce clips de video en un plano 2D o UI.
- **Propiedades:** `source`, `volume`, `loop`, `playbackRate`.
- **Scripting:** `reproductorDeVideo.reproducir();`

### 🌊 Water (Agua)
Simula una masa de agua con físicas de partículas y flotación.
- **Propiedades:** `ancho`, `alto`, `densidad`, `viscosidad`, `mostrarMareas`.

### 🌈 TextureRender
Dibuja formas procedimentales rápidas (Círculos, Rectángulos).
- **Scripting:** `renderizadorDeTextura.radius = 50;`

### 🌫️ ParticleSystem
Emite prefabs como partículas con optimización de pooling.
- **Propiedades:** `maxParticulas`, `tasaEmision`, `vidaParticula`, `dispersion`.
- **Scripting:** `particulas.reproducir();`

---

## ⚙️ 3. Físicas y Detección

### ⚖️ Rigidbody2D
Convierte al objeto en una entidad física dinámica.
- **Propiedades:** `mass` (Masa), `gravityScale`, `linearDrag`, `bodyType` (Dynamic, Static, Kinematic).
- **Atajos Scripting:** `fisica.addForce(x, y)`, `fisica.velocity.y = -10`.

### 📦 Colisionadores (2D)
Definen los límites físicos para choques y triggers.
- **Tipos:** `BoxCollider2D`, `CircleCollider2D`, `CapsuleCollider2D`, `PolygonCollider2D`, `LineCollider2D`.
- **Propiedades:** `size`, `radius`, `offset`, `isTrigger` (No choca, solo detecta).
- **Atajo Scripting:** `colisionador2d.isTrigger = verdadero;`

### 📡 RaycastSource (Rallo)
Lanza rayos desde el objeto para detectar obstáculos o sensores.
- **Propiedades:** `rayos` (Lista de rayos con ángulo y longitud).
- **Scripting:** `rallo.rayos[0].length = 1000;`

---

## 🚗 4. Vehículos y Movilidad

### 🚜 SuspensionHC
Simulación avanzada de suspensión tipo Hill Climb Racing.
- **Propiedades:** `chasis` (Materia), `dureza`, `amortiguacion`, `longitudReposo`, `potenciaMotor`.
- **Uso:** Se añade a los objetos que actúan como ruedas.

### 🏎️ VehicleTopDown
Controlador arcade para juegos de vista aérea.
- **Propiedades:** `potencia`, `velocidadMaxima`, `intensidadDerrape`, `frenadoMotor`.

### ✈️ PlaneController
Físicas de vuelo lateral con sustentación y ángulo de ataque.
- **Propiedades:** `potenciaMotor`, `vDespegue`, `fuerzaSustentacion`, `agilidadGiro`.

### 🚁 HelicopterController
Físicas de helicóptero con empuje vertical y auto-estabilización.

---

## 🤖 5. Inteligencia Artificial y Navegación

### 🧠 BasicAI
Lógica simplificada para enemigos o NPCs.
- **Modos:** `Follow` (Seguir), `Escape` (Huir), `Wander` (Deambular).
- **Scripting:** `iaBasica.speed = 150;`

### 👮 Patrol (Patrulla)
Mueve al objeto entre dos puntos infinitamente.
- **Propiedades:** `distancia`, `velocidad`, `horizontal`, `tiempoPausa`.

---

## 🗺️ 6. Mapas y Entorno

### 🗺️ Tilemap & Renderer
Dibuja niveles por rejilla cargados desde paletas.
- **Propiedades:** `ancho`, `alto`, `sourceLayerIndex`.
- **Scripting:** `mapaDeAzulejos.layers[0].position.x = 5;`

### ⛰️ Terreno2D & Collider
Crea terrenos destructibles mediante pincel de píxeles.
- **Propiedades:** `baseColor`, `capas`, `resolution` (Simplificación de colisión).

### 🌌 Parallax
Crea efectos de profundidad en fondos.
- **Propiedades:** `scrollFactor` (Velocidad relativa), `mirroring` (Repetir), `autoscroll`.

---

## 📱 7. Interfaz de Usuario (UI)

### 🖼️ Canvas (Lienzo)
Contenedor raíz necesario para cualquier elemento de UI.
- **Scripting:** `lienzo.renderMode = "Screen Space";`

### 📑 Elementos de Interfaz
- **UITransform:** Posicionamiento UI con anclajes (Anchors).
- **UIImage / UIText:** Muestran imágenes y textos escalables.
- **Button:** Detecta clics y permite asignar acciones de scripting.
- **Layout Groups:** `VerticalLayoutGroup`, `HorizontalLayoutGroup`, `GridLayoutGroup` (Auto-ordenado).

---

## 🔄 8. Animación y Sonido

### 🎬 Animator
Reproduce clips de animación (.cea).
- **Scripting:** `animador.play("Caminar");`

### 🎮 AnimatorController
Máquina de estados visual para transiciones complejas.
- **Función:** `smartMode` (Mapea movimiento a animaciones automáticamente).

### 🔊 AudioSource
Controlador de sonido espacial y 2D.
- **Propiedades:** `volume`, `loop`, `spatial` (Sonido 3D), `minDistance`.
- **Scripting:** `fuenteDeAudio.reproducir();`

---

## 🗂️ Atajos de Scripting (Exhaustivos)

| Componente | Atajo (ES) | Atajo (EN) |
| :--- | :--- | :--- |
| Transform | `posicion` | `transform` |
| Rigidbody2D | `fisica` | `rigidbody2D` |
| SpriteRenderer | `renderizadorDeSprite` | `spriteRenderer` |
| AudioSource | `fuenteDeAudio` | `audioSource` |
| Camera | `camara` | `camera` |
| Animator | `animador` | `animator` |
| Tilemap | `mapaDeAzulejos` | `tilemap` |
| Water | `agua` | `water` |
| ParticleSystem | `sistemaDeParticulas` | `particleSystem` |
| BasicAI | `iaBasica` | `basicAI` |
| VideoPlayer | `reproductorDeVideo` | `videoPlayer` |
| Canvas | `lienzo` | `canvas` |
| UIText | `textoUI` | `uiText` |
| Button | `boton` | `button` |
| UIImage | `imagenUI` | `uiImage` |
| Transform UI | `posicionUI` | `uiTransform` |
