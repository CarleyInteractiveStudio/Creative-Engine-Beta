# Creative Engine Scripting Reference

Este documento es la referencia oficial para el lenguaje de scripting `.ces` de Creative Engine. Úsalo para entender todas las características del lenguaje y las APIs del motor disponibles.

---

## 1. Estructura de un Script

Un archivo `.ces` tiene una estructura simple. Se compone de tres partes principales:

1.  **Declaraciones `using`**: Para importar módulos del motor.
2.  **Declaración de Variables**: Para definir las variables que tu script usará.
3.  **Funciones Principales**: `star()` y `update()`, donde vive la lógica de tu juego.

```javascript
// 1. Imports
using creative.engine.physics;

// 2. Variables
public sprite jugador;
private number velocidad = 200;

// 3. Funciones
public star() {
    // Código de inicialización
}

public update(deltaTime) {
    // Código que se ejecuta en cada frame
}
```

---

## 2. Palabras Clave del Lenguaje

### `using`
Importa módulos del motor para que puedas usar sus funciones. Siempre van al principio del archivo.

**Módulos Disponibles:**
-   `creative.engine`: Funciones principales.
-   `creative.engine.ui`: Para crear elementos de UI.
-   `creative.engine.physics`: Para usar el sistema de físicas.
-   `creative.engine.animator`: Para controlar animaciones.

### `public`
Declara una variable que será "pública". Esto significa:
-   Es accesible desde cualquier parte de tu script.
-   En el futuro, podría ser visible en el Inspector del editor para enlazar objetos fácilmente.

### `private`
Declara una variable que es "privada".
-   Solo puede ser accedida dentro de las funciones `star()` y `update()` de tu script.
-   Es útil para variables temporales o que no necesitan ser vistas desde fuera.

---

## 3. Tipos de Variables

Creative Engine usa tipos de variables especiales para manejar objetos del juego.

### `sprite`
Representa un objeto 2D en la escena con una imagen estática.
-   **Declaración:** `public sprite miSprite;`
-   **Creación:** `crear sprite miSprite con "assets/imagenes/mi_imagen.png";`
    -   Este comando crea una nueva `Materia` en la escena.
    -   Le añade los componentes `Transform` y `SpriteRenderer`.
    -   Asigna la imagen especificada al `SpriteRenderer`.
    -   Guarda la referencia al objeto en tu variable `miSprite`.

### `SpriteAnimacion`
Representa un objeto 2D diseñado para reproducir animaciones creadas en el Editor de Animación.
-   **Declaración:** `public SpriteAnimacion miPersonaje;`
-   **Creación:** (Próximamente) La creación de `SpriteAnimacion` se hace desde el editor, arrastrando un asset de animación a la escena.
-   **Control:** `cambiar estado en miPersonaje a "correr";`
    -   Este comando le dice al `Animator` del objeto que cambie al estado de animación "correr". Las transiciones y condiciones se definirán en el futuro Editor de Controladores de Animación.

---

## 4. Funciones Principales

### `public star()`
Esta función se ejecuta **una sola vez** cuando el juego o la escena comienza. Es el lugar ideal para toda la configuración inicial.
-   Crear objetos.
-   Establecer posiciones iniciales.
-   Obtener referencias a componentes.

### `public update(deltaTime)`
Esta función se ejecuta **en cada fotograma** del juego, continuamente. Aquí es donde pones toda la lógica que necesita actualizarse constantemente.
-   **`deltaTime`**: Es un parámetro crucial. Es el tiempo (en segundos) que ha pasado desde el fotograma anterior. **Siempre debes multiplicar tu movimiento por `deltaTime`** para que la velocidad del juego sea la misma sin importar si la computadora es rápida o lenta.

---

## 5. API del Motor (Funciones Útiles)

Una vez que tienes una variable (ej. `jugador`), puedes acceder a sus componentes y propiedades.

### `Transform`
Cada objeto (`sprite`, `SpriteAnimacion`, `Materia`) tiene un componente `Transform`. Puedes acceder a él para mover, rotar o escalar tu objeto.

```javascript
// Dentro de star() o update()
let transform = jugador.getComponent(Transform);

// Mover el objeto
transform.x = 100;
transform.y += 50 * deltaTime;

// Cambiar la escala
transform.scale.x = 2; // El doble de ancho
transform.scale.y = 0.5; // La mitad de alto
```

### `Input`
El objeto `Input` está disponible globalmente para leer la entrada del teclado y el ratón.

**Funciones más comunes:**
-   `Input.getKey("ArrowRight")`: Devuelve `true` si la tecla "Flecha Derecha" está **presionada**.
-   `Input.getKeyDown(" ")`: Devuelve `true` solo en el **primer fotograma** en que se presiona la barra espaciadora. Útil para acciones como saltar.
-   `Input.getKeyUp("w")`: Devuelve `true` solo en el **primer fotograma** en que se suelta la tecla "W".

**Ejemplo:**
```javascript
public update(deltaTime) {
    if (Input.getKey("ArrowUp")) {
        // Mover hacia arriba
    }
    if (Input.getKeyDown(" ")) {
        // Saltar
    }
}
```

Esta es una referencia básica. ¡Explora los diferentes componentes en el Inspector para descubrir más propiedades que puedes modificar desde el código!
