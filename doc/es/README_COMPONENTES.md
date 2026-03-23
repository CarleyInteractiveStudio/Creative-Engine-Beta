# 🧩 Guía de Componentes (Leyes) - Creative Engine

En Creative Engine, las **Materias** (objetos) cobran vida a través de las **Leyes** (componentes). Cada Ley añade una funcionalidad específica, como gravedad, renderizado de imagen o lógica de IA.

Esta guía detalla el uso de los componentes tanto en el **Inspector** como en los **Scripts (.ces)** utilizando la sintaxis moderna (sin prefijos como `this.` o `motor.`).

---

## 🏗️ 1. Componentes Base (Core)

### 📍 Transform (Transformación)
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

### 📦 BoxCollider2D / CircleCollider2D (Colisionadores)
Definen la forma física para los choques.
- **Uso en Inspector:** Ajusta el tamaño o radio. Si marcas "Is Trigger", el objeto no chocará pero detectará cuando algo entre en su área.
- **Scripting:**
  ```ces
  si (estaTocandoTag("Suelo")) {
      imprimir("En el suelo");
  }
  ```

---

## 🚗 4. Vehículos y Controladores Avanzados

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

## 🤖 5. Inteligencia y Movimiento

### 🧠 BasicAI (IA Básica)
Comportamientos automáticos para NPCs y enemigos.
- **Modos:** Follow (Seguir), Escape (Huir), Wander (Vagar).
- **Scripting:**
  ```ces
  iaBasica.speed = 250;
  iaBasica.behavior = "Follow";
  iaBasica.target = buscar("Jugador");
  ```

### 👮 Patrol (Patrulla)
Mueve el objeto entre dos puntos.
- **Scripting:**
  ```ces
  patrulla.distancia = 500;
  patrulla.velocidad = 100;
  ```

### 🎬 SceneLoader (Cargar Escena)
Permite cambiar de nivel o escena automáticamente.
- **Modos de Activación:**
  - **Colisión:** Se activa cuando el jugador choca con el objeto.
  - **Tecla:** Se activa al presionar una tecla específica.
  - **Botón UI:** Se activa al hacer clic en un botón de la interfaz.
- **Uso en Inspector:** Arrastra el archivo `.ceScene` al campo "Ruta de Escena" y configura el activador.
- **Scripting:**
  ```ces
  sceneLoader.scenePath = "Assets/Nivel2.ceScene";
  sceneLoader.load(); // Carga la escena manualmente
  ```

---

## 📱 6. Interfaz de Usuario (UI)

### 🖼️ Canvas (Lienzo)
El contenedor principal para todos los elementos de interfaz. Soporta modo Pantalla o Espacio de Mundo.

### 🔘 Button (Botón)
Detecta clics del usuario.
- **Uso en Inspector:** Permite definir colores para los estados (Normal, Presionado, Desactivado).
- **Scripting:**
  ```ces
  alHacerClick() {
      imprimir("¡Botón presionado!");
  }
  ```

### 📝 UIText (Texto UI)
Muestra texto en pantalla con fuentes personalizadas (.ttf, .otf).

---

## 🎬 7. Animación, Esqueleto e Iluminación

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
