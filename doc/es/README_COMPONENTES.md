# 🧩 Guía de Componentes (Leyes) - Creative Engine

En Creative Engine, las **Materias** (objetos) cobran vida a través de las **Leyes** (componentes). Cada Ley añade una funcionalidad específica, como gravedad, renderizado de imagen o lógica de IA.

Esta guía detalla el uso de los componentes tanto en el **Inspector** como en los **Scripts (.ces)** utilizando la sintaxis moderna (sin prefijos como `this.` o `motor.`).

---

## 🏗️ 1. Componentes Base (Core)

### 📍 Transform (Transformación) / UITransform
Define la posición, rotación y escala de un objeto en el espacio 2D.
- **Uso en Inspector:** Edita los valores X e Y para mover el objeto. Usa los botones de volteo (Flip) para invertir la imagen.
- **Scripting:**
  ```ces
  posicion.x += 5; // Mueve a la derecha
  rotacion += 45;  // Rota 45 grados
  escala.x = 2;    // Duplica el tamaño horizontal
  voltearH = verdadero; // Invierte horizontalmente
  ```

### 🎥 Camera (Cámara)
Define el área visible del juego.
- **Uso en Inspector:** Configura el color de fondo, el zoom y la máscara de capas (Culling Mask) para decidir qué objetos ve esta cámara.
- **Scripting:**
  ```ces
  camara.orthographicSize = 10; // Cambia el zoom
  camara.backgroundColor = "#ff0000"; // Fondo rojo
  ```

---

## 🖼️ 2. Renderizado y Visuales

### 🖼️ SpriteRenderer (Renderizador de Sprite)
Muestra una imagen (.png, .jpg) o un cuadro de una hoja de sprites (.ceSprite).
- **Uso en Inspector:** Arrastra una imagen al campo "Source". Puedes cambiar el color para tintar la imagen o ajustar la opacidad.
- **Scripting:**
  ```ces
  renderizadorDeSprite.color = "#00ff00"; // Tinta de verde
  renderizadorDeSprite.opacity = 0.5;      // Semi-transparente
  renderizadorDeSprite.spriteName = "Salto"; // Cambia el sprite (si es .ceSprite)
  ```

### 🌊 Water (Agua)
Simulación física de fluidos basada en partículas.
- **Uso en Inspector:** Define el ancho y alto del área de agua. Ajusta la densidad (flotación) y viscosidad.
- **Scripting:**
  ```ces
  agua.densidad = 2.0; // Los objetos flotarán más
  agua.mostrarMareas = verdadero;
  ```

### 🎞️ VideoPlayer (Reproductor de Video)
Reproduce archivos de video en el mundo o en la UI.
- **Uso en Inspector:** Soporta formatos .mp4 y .webm. Puedes activar el bucle (loop) y ajustar el volumen.
- **Scripting:**
  ```ces
  reproductorDeVideo.reproducir();
  reproductorDeVideo.pausar();
  reproductorDeVideo.volumen = 0.8;
  ```

---

## ⚙️ 3. Físicas 2D

### ⚖️ Rigidbody2D (Física)
Permite que el objeto reaccione a la gravedad y colisiones.
- **Uso en Inspector:** Cambia el tipo de cuerpo a "Dynamic" para que caiga, o "Kinematic" para moverlo manualmente pero que detecte colisiones.
- **Scripting:**
  ```ces
  fisica.applyImpulse(nuevo Vector2(0, -10)); // Salto
  fisica.velocity.x = 5; // Velocidad constante
  fisica.gravityScale = 0; // Desactiva gravedad
  ```

### 📦 Colisionadores (Box, Circle, Capsule, Polygon, Line)
Definen la forma física para los choques.
- **BoxCollider2D:** Forma rectangular.
- **CircleCollider2D:** Forma circular (radio).
- **CapsuleCollider2D:** Forma de cápsula (ideal para personajes).
- **LineCollider2D:** Cadena de puntos para formas irregulares o bordes.
- **PolygonCollider2D:** Polígono libre (usado automáticamente en terrenos).
- **Uso en Inspector:** Ajusta el tamaño o radio. Si marcas "Is Trigger", el objeto no chocará físicamente pero detectará cuando algo entre en su área.
- **Scripting:**
  ```ces
  si (estaTocandoTag("Suelo")) {
      imprimir("En el suelo");
  }
  ```

---

## 🗺️ 4. Mapas y Entorno

### 🗺️ Tilemap (Mapa de Tiles)
Permite construir niveles usando rejillas de imágenes. Requiere un componente **Grid** en el padre.
- **Uso en Inspector:** Se gestiona principalmente desde la ventana de **Paleta de Tiles**.

### 🏔️ Parallax
Crea efecto de profundidad moviendo capas a distintas velocidades respecto a la cámara.
- **Scripting:**
  ```ces
  parallax.scrollFactor = nuevo Vector2(0.5, 0.5); // Se mueve a la mitad de velocidad
  ```

---

## 🚗 5. Vehículos y Controladores Avanzados

### 🚁 HelicopterController (Controlador de Helicóptero)
Simulación de vuelo lateral para helicópteros.
- **Parámetros:** Potencia de motor, potencia de despegue (vDespegue), agilidad de giro y auto-estabilidad.
- **Scripting:**
  ```ces
  controladorDeHelicoptero.potencia = 2500;
  controladorDeHelicoptero.vDespegue = 1200;
  ```

### ✈️ PlaneController (Controlador de Avión)
Física de sustentación aerodinámica y vuelo lateral.
- **Parámetros:** Velocidad de despegue, fuerza de sustentación, agilidad de giro y arrastre de aire.
- **Scripting:**
  ```ces
  controladorDeAvion.sustentacion = 1.5;
  controladorDeAvion.velocidadDespegue = 500;
  ```

### 🏎️ VehicleTopDown (Vehículo Cenital)
Control arcade para coches en vista desde arriba.
- **Parámetros:** Potencia, velocidad máxima, agilidad de giro e intensidad de derrape (drift).
- **Scripting:**
  ```ces
  controladorVehiculoTopDown.derrape = 0.5;
  controladorVehiculoTopDown.giro = 200;
  ```

---

## 🤖 6. Inteligencia y Movimiento

### 🧠 BasicAI (IA Básica)
Comportamientos automáticos para NPCs y enemigos.
- **Modos:** Follow (Seguir), Escape (Huir), Wander (Vagar).
- **Scripting:**
  ```ces
  iaBasica.speed = 250;
  iaBasica.behavior = "Follow";
  iaBasica.target = buscar("Jugador");
  ```

### 🏃 BasicMovement (Movimiento Básico)
Añade controles simples de caminar y saltar sin necesidad de programar.
- **Uso en Inspector:** Configura la velocidad y fuerza de salto.

### 👮 Patrol (Patrulla)
Mueve el objeto entre dos puntos.
- **Scripting:**
  ```ces
  patrulla.distancia = 500;
  patrulla.velocidad = 100;
  ```

### 🚀 ProjectileLauncher (Lanzador)
Facilita el disparo de objetos (balas, flechas).
- **Scripting:**
  ```ces
  lanzador.disparar(); // Crea una instancia del prefab configurado
  ```

---

## 📱 7. Interfaz de Usuario (UI)

### 🖼️ Canvas (Lienzo)
El contenedor principal para todos los elementos de interfaz. Soporta modo Pantalla o Espacio de Mundo.

### 🔘 Button (Botón)
Detecta clics del usuario.
- **Uso en Inspector:** Permite definir colores para los estados. Puedes añadir eventos "On Click" que llamen a funciones de otros scripts sin programar.
- **Scripting:**
  ```ces
  alHacerClick() {
      imprimir("¡Botón presionado!");
  }
  ```

### 📊 ProgressBar (Barra de Progreso)
Ideal para barras de vida o carga.
- **Uso en Inspector:** Asocia una imagen de "Fill" (Relleno) y ajusta el valor actual.

### 🍱 Grupos de Layout (Vertical, Horizontal, Grid)
Organizan automáticamente los elementos hijos en filas, columnas o rejillas.

---

## ⚔️ 8. Combate y Mecánicas

### ❤️ Health (Vida)
Gestiona la salud del objeto y su destrucción o animación al morir.
- **Scripting:**
  ```ces
  salud.currentHealth -= 10; // Recibir daño
  ```

### ⚔️ Attack (Ataque)
Permite configurar múltiples ataques con diferentes teclas, animaciones y daño.
- **Scripting:**
  ```ces
  ataque.atacar(0); // Ejecuta el primer ataque configurado
  ```

---

## 🛠️ 9. Utilidades y Efectos

### ✨ ParticleSystem (Partículas)
Genera efectos visuales como fuego, humo o explosiones.
- **Uso en Inspector:** Ajusta la cantidad, velocidad, vida y color de las partículas.

### ⏲️ AutoDestroy (Auto-Destrucción)
Elimina el objeto automáticamente después de un tiempo o al salir de pantalla.

### 📡 RaycastSource (Origen de Rayo)
Permite realizar detecciones de línea (raycasting) visualmente desde el editor.

### 🎯 Gyzmo (Áreas)
Dibuja rectángulos de colores en la escena para marcar zonas (triggers, límites) que pueden ser visibles o no en el juego.

---

## 🎬 10. Animación, Esqueleto e Iluminación

### 🎮 AnimatorController (Controlador)
Gestiona estados de animación (Caminar, Saltar, Quieto).
- **Smart Mode:** Anima automáticamente según el movimiento del objeto.

### 🦴 SkeletonRenderer (Esqueleto) e IK (Cinemática Inversa)
- **SkeletonRenderer:** Renderiza mallas deformadas por huesos (Skinning).
- **Bone (Hueso):** Define cada parte del esqueleto.
- **IKManager2D (Gestor IK):** Controla cadenas de huesos para que una mano o pie siga un objetivo.

### 💡 Iluminación 2D (Lights)
- **PointLight2D (Luz Puntual):** Luz en todas las direcciones.
- **SpotLight2D (Luz Focal):** Luz en forma de cono.
- **SpriteLight2D:** Usa un sprite como forma de luz.

---

## 💡 Pro-Tip de Scripting

Recuerda que en **Creative Engine**, puedes acceder a cualquier componente directamente por su nombre en español. No necesitas usar prefijos.

**Ejemplo de un script completo:**
```ces
ve motor;

publico numero fuerzaSalto = 12;

alActualizar(delta) {
    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
        reproducir.Salto(); // Llama al sonido o animación
    }
}
```
