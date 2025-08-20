# Libro de Referencia de Creative Engine

¡Bienvenido, creador! Este documento es la guía definitiva y el manual de referencia para programar con **Creatin Engine Scripting (.ces)**. Úsalo para dominar todas las herramientas que el motor pone a tu disposición.

---

## **Capítulo 1: El Lenguaje .ces**

### **1.1. Estructura de un Script**
Un script `.ces` organiza tu código de forma clara y eficiente.

```ces
// 1. Importaciones de módulos que necesitarás.
using creative.engine;
using creative.engine.core;
using creative.engine.physics;

// 2. Declaración de tus objetos de juego (GameObjects).
public materia/gameObject miNave;

// 3. Función de inicio (se ejecuta una vez).
public star() {
    // Lógica de inicialización.
}

// 4. Función de actualización (se ejecuta en cada fotograma).
public update(deltaTime) {
    // Lógica que se repite constantemente.
}
```

### **1.2. Variables: `public materia/gameObject`**
Declara un "contenedor" para un objeto que existirá en tu juego.
`public materia/gameObject <nombre>;`

### **1.3. Comandos Especiales**
- `materia crear <variable>, "<ruta_asset>";`
  - Carga un modelo 3D y lo asigna a tu variable.
- `ley <sistema> <estado>;`
  - Controla sistemas globales. Ejemplo: `ley gravedad activar;`

---

## **Capítulo 2: Módulo `creative.engine`**
El corazón del motor. Proporciona las herramientas más básicas y esenciales.

### **API: `Input`**
Permite detectar la entrada del teclado, ratón o mandos.

#### `Input.keyDown("nombre_tecla")`
- **Propósito:** Comprueba si una tecla está siendo presionada en el fotograma actual.
- **Parámetros:**
  - `nombre_tecla` (texto): El nombre de la tecla a comprobar.
- **Devuelve:** `true` si está presionada, `false` si no.
- **Nombres Comunes:** `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"Enter"`, `"w"`, `"a"`, `"s"`, `"d"`.
- **Ejemplo:**
  ```ces
  public update(deltaTime) {
      if (Input.keyDown("ArrowUp")) {
          miNave.y += 50 * deltaTime; // Mover hacia arriba
      }
  }
  ```

---

## **Capítulo 3: Módulo `creative.engine.core`**
Gestiona los elementos centrales de tu escena: la cámara, los objetos y la carga de escenas.

### **API: `Scene`**
#### `Scene.load("nombre_escena")`
- **Propósito:** Carga un nivel o escena completamente nueva.
- **Ejemplo:** `Scene.load("Nivel_02");`

### **API: `Camera`**
#### `Camera.setPosition(x, y, z)`
- **Propósito:** Cambia la posición de la cámara en el mundo 3D.
- **Ejemplo:** `Camera.setPosition(0, 20, -50); // Vista elevada y alejada`

### **API: `Assets`**
(Normalmente se usa a través de `materia crear`)
#### `Assets.loadModel("nombre", "ruta")`
- **Propósito:** Carga un recurso 3D para ser usado en el juego.
- **Ejemplo:** `Assets.loadModel("jugador", "modelos/jugador.glb");`

---

## **Capítulo 4: Módulo `creative.engine.ui`**
Te permite mostrar información y botones en la pantalla del jugador.

### **API: `UI`**
#### `UI.text("mensaje", x, y)`
- **Propósito:** Muestra un texto en una posición 2D de la pantalla.
- **Ejemplo:** `UI.text("Puntuación: 100", 20, 20);`

#### `UI.button("etiqueta", x, y, funcion_a_llamar)`
- **Propósito:** Crea un botón clicable. (Función avanzada, no implementada en el simulador base).
- **Ejemplo:** `UI.button("Reiniciar", 100, 100, reiniciar_juego);`

---

## **Capítulo 5: Módulo `creative.engine.animator`**
Controla las animaciones de tus modelos 3D.

### **API: `Animator`**
#### `Animator.play("nombre_animacion")`
- **Propósito:** Inicia la reproducción de una animación en un objeto.
- **Ejemplo:** `Animator.play("correr_jugador");`

#### `Animator.stop("nombre_animacion")`
- **Propósito:** Detiene una animación.
- **Ejemplo:** `Animator.stop("correr_jugador");`

---

## **Capítulo 6: Módulo `creative.engine.physics`**
Controla las fuerzas físicas de tu mundo.

### **API: `Physics`**
#### `Physics.enableGravity(estado)`
- **Propósito:** Activa o desactiva la gravedad para toda la escena.
- **Parámetros:** `true` para activar, `false` para desactivar.
- **Atajo en .ces:** `ley gravedad activar;` o `ley gravedad desactivar;`
- **Ejemplo:** `Physics.enableGravity(true);`

#### `Physics.setGravity(vector)`
- **Propósito:** Define la dirección y fuerza de la gravedad. (Avanzado).
- **Ejemplo:** `Physics.setGravity({x: 0, y: -9.8, z: 0});`

#### `Physics.addBody(gameObject)`
- **Propósito:** Añade un objeto al sistema de físicas para que pueda colisionar y ser afectado por la gravedad.
- **Ejemplo:** `Physics.addBody(miNave);`
