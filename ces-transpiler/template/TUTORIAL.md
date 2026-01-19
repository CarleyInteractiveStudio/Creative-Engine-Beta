# ¡Bienvenido a Creative Engine! - Tu Primer Juego 2D

¡Felicidades por iniciar tu viaje como creador de videojuegos! Esta guía te llevará paso a paso a través de la creación de un juego 2D simple, desde un proyecto vacío hasta un personaje que puedes mover por la pantalla.

---

### Paso 1: Creando tu Proyecto

Todo comienza en el **Launcher**. Si aún no lo has hecho, crea tu primer proyecto:
1.  Haz clic en **"Crear Nuevo Proyecto"**.
2.  Dale un nombre (por ejemplo, `Mi-Primer-Juego-2D`).
3.  Elige una carpeta en tu computadora donde se guardarán todos tus proyectos.

Una vez creado, haz clic en tu proyecto para abrir el **Editor de Creative Engine**.

---

### Paso 2: Importando tu Personaje (Sprite)

Un juego 2D necesita imágenes (sprites).
-   Busca o crea una imagen simple en formato `.png` con fondo transparente.
-   **Arrastra y suelta el archivo de imagen** desde tu computadora directamente a la ventana del **Navegador de Assets** (el panel inferior).

---

### Paso 3: Escribiendo tu Primer Script

Ahora vamos a escribir la lógica del juego. ¡Gracias a las nuevas mejoras en el lenguaje `.ces`, podemos hacer todo desde un solo script!

1.  En el **Navegador de Assets**, haz clic derecho en un espacio vacío.
2.  En el menú que aparece, ve a `Crear` -> `Script (.ces)`.
3.  Nombra el script `JuegoPrincipal`.
4.  Haz doble clic en `JuegoPrincipal.ces` para abrirlo en el **editor de código integrado**.
5.  Borra el contenido de ejemplo y escribe o pega el siguiente código:

```javascript
// Declara una variable pública de tipo 'sprite' para nuestro jugador.
// 'public' significa que podremos verla en el editor más adelante.
public sprite jugador;

// Declara una variable privada de tipo 'number' para la velocidad.
// 'private' significa que solo existe dentro de este script.
private number velocidad = 250;

// --- Funciones Principales ---

// public star() se ejecuta UNA SOLA VEZ cuando el juego comienza.
// Es el lugar perfecto para crear nuestros objetos.
public star() {
    // Usamos el nuevo comando para crear un sprite.
    // Esto crea un objeto en la escena y lo asigna a nuestra variable 'jugador'.
    // ¡Asegúrate de que la ruta a tu imagen sea correcta!
    crear sprite jugador con "Assets/mi-personaje.png";

    console.log("¡El juego ha comenzado! Mueve al jugador con las flechas.");
}

// public update(deltaTime) se ejecuta EN CADA FOTOGRAMA.
// Aquí va toda la lógica de movimiento y juego.
public update(deltaTime) {
    // Si la variable 'jugador' aún no ha sido creada, no hagas nada.
    if (!jugador) return;

    // Obtenemos el componente 'Transform' de nuestro jugador para moverlo.
    let transform = jugador.getComponent(Transform);

    if (Input.getKey("ArrowRight")) {
        transform.x += velocidad * deltaTime;
    }
    if (Input.getKey("ArrowLeft")) {
        transform.x -= velocidad * deltaTime;
    }
    if (Input.getKey("ArrowUp")) {
        transform.y -= velocidad * deltaTime; // El eje Y es 0 arriba, y aumenta hacia abajo.
    }
    if (Input.getKey("ArrowDown")) {
        transform.y += velocidad * deltaTime;
    }
}
```

6.  **¡IMPORTANTE!** Cambia `"Assets/mi-personaje.png"` en la línea `crear sprite...` por el nombre real de tu archivo de imagen.
7.  Guarda el script presionando **`Ctrl + S`**.

---

### Paso 4: ¡A Jugar! (El "Build")

A diferencia de antes, no necesitas arrastrar nada a la escena. ¡Nuestro script lo hace todo!

1.  En la parte superior de la ventana central, asegúrate de que estás en la vista **"Juego"**.
2.  Presiona el botón de **Play (▶️)**.

Cuando presionas Play, Creative Engine "construye" tu juego: lee tu script, crea el sprite del jugador en la posición (0,0) y empieza a ejecutar la lógica de `update`.

¡Ahora deberías ver a tu personaje en la pantalla y moverlo con las teclas de flecha!

---

### Conclusión y Próximos Pasos

**¡Felicidades!** Has creado un juego simple usando el nuevo y mejorado lenguaje de scripting de Creative Engine.

Desde aquí, las posibilidades son infinitas. Intenta experimentar:
-   **Animación:** Si declaras tu variable como `public SpriteAnimacion jugador;`, puedes usar el nuevo comando `cambiar estado en jugador a "correr";` para controlar las animaciones que crees en el nuevo editor.
-   **Físicas:** Ve al Inspector, añade un componente `Rigidbody` y `BoxCollider` a tu personaje para que reaccione a la gravedad.
-   **UI:** Explora los componentes de UI para añadir un contador de puntos o un menú.

Para una guía detallada de todos los comandos y funciones, consulta el otro archivo en esta carpeta: **`Creative Engine Scripting.md`**.

¡Sigue creando!
