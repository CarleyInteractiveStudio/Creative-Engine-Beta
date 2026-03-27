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

## 🤖 4. Inteligencia y Movimiento

### 🧠 BasicAI (IA Básica)
Comportamientos automáticos para NPCs y enemigos.
- **Modos:**
  - **Follow:** Sigue a una Materia objetivo.
  - **Escape:** Huye de un objetivo.
  - **Wander:** Camina aleatoriamente.
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

---

## 📱 5. Interfaz de Usuario (UI)

### 🖼️ Canvas (Lienzo)
El contenedor principal para todos los elementos de interfaz.
- **Scripting:**
  ```ces
  lienzo.scaleChildren = verdadero;
  ```

### 🔘 Button (Botón)
Detecta clics del usuario.
- **Uso en Inspector:** Permite definir colores para los estados (Normal, Presionado, Desactivado) o cambiar sprites.
- **Scripting:**
  ```ces
  alHacerClick() {
      imprimir("¡Botón presionado!");
  }
  ```

### 📝 UIText (Texto UI)
Muestra texto en pantalla con fuentes personalizadas.
- **Scripting:**
  ```ces
  textoUI.text = "Puntos: " + puntos;
  textoUI.fontSize = 40;
  ```

---

## 🎬 6. Animación y Audio

### 🎮 AnimatorController (Controlador)
Gestiona estados de animación (Caminar, Saltar, Quieto).
- **Uso en Inspector:** Requiere un archivo `.ceanim`. El "Smart Mode" anima automáticamente según el movimiento del Rigidbody2D o el componente Movement.
- **Scripting:**
  ```ces
  controlador.play("Atacar"); // Fuerza un estado
  ```

### 🔊 AudioSource (Fuente de Audio)
Reproduce efectos de sonido o música.
- **Uso en Inspector:** Soporta **Audio Espacial** (el volumen baja si el objeto se aleja de la cámara).
- **Scripting:**
  ```ces
  fuenteDeAudio.reproducir();
  fuenteDeAudio.loop = verdadero;
  reproducir.Explosion(); // Atajo proxy (reproduce sonido por nombre)
  ```

---

## 📡 7. Otros Componentes

- **RaycastSource (Rallo):** Lanza rayos invisibles para detectar paredes o enemigos al frente.
- **ParticleSystem (Partículas):** Crea efectos de fuego, humo o chispas usando un prefab como base.
- **Parallax:** Crea fondos infinitos que se mueven a distinta velocidad para dar profundidad.
- **Light2D (Luces):** Ilumina tu escena con luces puntuales, focales o formas libres.

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
