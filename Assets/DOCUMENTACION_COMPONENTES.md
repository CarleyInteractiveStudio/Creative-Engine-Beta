# 🧩 Guía Maestra de Componentes (Leyes): Creative Engine

En Creative Engine, los componentes (Leyes) definen el comportamiento y la apariencia de tus objetos (Materias). A continuación se detallan todos los componentes disponibles, sus propiedades y cómo controlarlos desde scripting.

---

## 🏗️ Núcleo y Transformación

### 📍 Transform (Posición)
Componente obligatorio en todo objeto espacial.
- **Propiedades:** `position` (Vector2), `rotation` (número), `scale` (Vector2), `flipX`, `flipY`.
- **Scripting:**
  - `posicion.x = 500;`
  - `posicion.rotation += 10;`
  - `voltearH = verdadero;` (Atajo para flipX)

### 📷 Camera (Cámara)
Define la vista del jugador.
- **Propiedades:** `zoom`, `backgroundColor`, `cullingMask` (capas visibles), `depth`.
- **Scripting:** `camara.zoom = 2.0;`

---

## 🎨 Renderizado y Visuales

### 🖼️ SpriteRenderer
Dibuja imágenes en 2D.
- **Propiedades:** `source` (imagen), `spriteAssetPath` (.ceSprite), `color`, `opacity`, `orderInLayer`.
- **Scripting:** `renderizadorDeSprite.color = "#00FF00";`

### 🎞️ VideoPlayer
Reproduce archivos de video.
- **Propiedades:** `source`, `volume`, `loop`, `playbackRate`.
- **Scripting:** `reproductorDeVideo.reproducir();`

### 🌈 TextureRender
Dibuja formas geométricas (Rectángulo, Círculo, Triángulo, Cápsula) rellenas de color o textura repetida.
- **Scripting:** `renderizadorDeTextura.radius = 100;`

---

## ⚙️ Físicas y Colisiones

### ⚖️ Rigidbody2D
Controla la física dinámica del objeto.
- **Propiedades:** `mass`, `gravityScale`, `linearDrag`, `bodyType` (Dynamic/Static/Kinematic).
- **Scripting:**
  - `fisica.addForce(nuevo Vector2(0, -500));`
  - `fisica.velocity.x = 5;`

### 📦 Colisionadores
Definen la forma física para impactos.
- **Tipos:** `BoxCollider2D`, `CircleCollider2D`, `CapsuleCollider2D`, `PolygonCollider2D`, `LineCollider2D`.
- **Propiedades:** `size`, `radius`, `offset`, `isTrigger`.
- **Scripting:** `colisionador2d.isTrigger = verdadero;`

---

## 🚗 Vehículos y Movimiento

### 🚜 SuspensionHC
Simulación física para vehículos con ruedas.
- **Propiedades:** `dureza` (stiffness), `amortiguacion` (damping), `longitudReposo`, `fuerzaInclinacion`.
- **Uso:** Requiere un objeto "Chasis" asignado.

### 🏎️ VehicleTopDown
Controlador arcade para vista cenital.
- **Propiedades:** `potencia`, `velocidadMaxima`, `intensidadDerrape` (drift).

### ✈️ PlaneController
Controlador de vuelo lateral con sustentación física.
- **Propiedades:** `potenciaMotor`, `fuerzaSustentacion`, `vDespegue`.

### 🚁 HelicopterController
Vuelo de helicóptero con potencia vertical y balanceo.

---

## 🤖 Inteligencia y Lógica

### 🧠 BasicAI
Comportamientos predefinidos de IA.
- **Modos:** `Follow` (Seguir), `Escape` (Huir), `Wander` (Deambular).
- **Propiedades:** `target`, `speed`, `detectionDistance`, `obstacleAvoidance`.
- **Eventos de Script:** `onTargetSeen`, `onTargetLost`, `onTargetNear`.

### 📡 RaycastSource (Rallo)
Lanza múltiples rayos de detección.
- **Propiedades:** `rays` (lista de ángulos y longitudes), `autoRotate`.
- **Scripting:** `rallo.rayos[0].length = 500;`

---

## 🗺️ Mapas y Terreno

### 🗺️ Tilemap
Pintado de niveles por azulejos.
- **Propiedades:** `width`, `height`, `layers`.
- **Soporte:** `TilemapCollider2D` genera colisiones automáticas de los tiles pintados.

### ⛰️ Terreno2D
Terreno destructible por pincel (píxeles).
- **Funciones:** `paint(x, y, radio, borrar, capa)`.
- **Soporte:** `TerrenoCollider2D` actualiza la colisión dinámicamente al pintar/borrar.

---

## 📱 Interfaz de Usuario (UI)

### 🖼️ Canvas (Lienzo)
El contenedor raíz para todos los elementos de UI.
- **Propiedades:** `renderMode` (Screen/World Space).

### 📑 Elementos de UI
- **UIImage / UIText:** Muestran imágenes o texto.
- **Button:** Botón interactivo.
- **Layout Groups:** `VerticalLayoutGroup`, `HorizontalLayoutGroup`, `GridLayoutGroup`. Organizan hijos automáticamente.
- **ContentSizeFitter:** Ajusta el tamaño del panel al contenido de sus hijos.

---

## 🔄 Animación

### 🎬 Animator
Reproduce un clip de animación (.cea).
- **Scripting:** `animador.reproducir("Assets/Caminar.cea");`

### 🎮 AnimatorController
Gestiona estados y transiciones complejas.
- **Funciones:** `smartMode` (Mapeo automático de movimiento a animaciones).

---

## Atajos de Scripting (Exhaustivo)

| Clase | Atajo (ES) | Atajo (EN) |
| :--- | :--- | :--- |
| **Transform** | `posicion` / `transformacion` | `transform` |
| **Rigidbody2D** | `fisica` | `rigidbody2D` |
| **SpriteRenderer** | `renderizadorDeSprite` | `spriteRenderer` |
| **AudioSource** | `fuenteDeAudio` | `audioSource` |
| **Camera** | `camara` | `camera` |
| **Animator** | `animador` | `animator` |
| **Tilemap** | `mapaDeAzulejos` | `tilemap` |
| **Water** | `agua` | `water` |
| **ParticleSystem**| `sistemaDeParticulas` | `particleSystem` |
| **BasicAI** | `iaBasica` | `basicAI` |
| **VideoPlayer** | `reproductorDeVideo` | `videoPlayer` |
| **Canvas** | `lienzo` | `canvas` |
| **UIText** | `texto` | `textoUI` |
| **Button** | `boton` | `button` |
| **UIImage** | `imagen` | `uiImage` |
