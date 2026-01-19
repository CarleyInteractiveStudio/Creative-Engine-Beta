# Guía de Scripting en Creative Engine (.ces)

¡Bienvenido a la guía de scripting de Creative Engine! Este documento te enseñará todo lo que necesitas saber para dar vida a tus objetos y crear la lógica de tu juego usando archivos `.ces` (Creative Engine Script).

El lenguaje de scripting está diseñado para ser sencillo, potente y bilingüe (español/inglés), permitiéndote trabajar de la forma que te resulte más cómoda.

---

## 1. Conceptos Fundamentales

### ¿Qué es un Script?

Un script es un componente que añades a un objeto (`Materia`) en tu escena. Contiene código que define el comportamiento de ese objeto: cómo se mueve, cómo reacciona a los controles del jugador, cómo interactúa con otros objetos, etc.

### Creación de un Script

Para crear un nuevo script, haz clic derecho en el **Navegador de Assets**, selecciona `Crear > Script`, y dale un nombre. Esto generará un nuevo archivo con la extensión `.ces`.

### El Objeto `this`

Dentro de un script, la palabra clave `this` es muy importante. Se refiere a la **instancia del script actual**. A través de `this`, puedes acceder a todas las variables y funciones que has declarado, así como a las APIs del motor y a los componentes del objeto al que está asociado el script.

---

## 2. Sintaxis del Lenguaje

El lenguaje `.ces` tiene una sintaxis clara y sencilla para declarar variables y funciones.

### Comentarios

Usa `//` para añadir comentarios de una sola línea. Todo lo que venga después en esa línea será ignorado por el motor.

```javascript
// Esto es un comentario. El motor no lo leerá.
publico numero velocidad = 10; // También puedes poner comentarios aquí.
```

### Variables

Las variables te permiten guardar datos como la velocidad de un jugador, la cantidad de vida, un nombre, etc. Se declaran siguiendo la estructura: `[visibilidad] [tipo] [nombre] = [valor inicial];`

#### Visibilidad

-   **`publico`** (o `public`): La variable será visible en el **Inspector** de Creative Engine. Esto te permite cambiar su valor fácilmente sin tener que modificar el código, ideal para ajustar parámetros como la velocidad o la fuerza de un salto.
-   **`privado`** (o `private`): La variable solo se puede usar dentro del script. No aparecerá en el Inspector.

#### Tipos de Datos

| Tipo (Español) | Tipo (Inglés) | Descripción                                       | Ejemplo de Valor     |
| :------------- | :------------ | :------------------------------------------------ | :------------------- |
| `numero`       | `number`      | Para números, tanto enteros como decimales.       | `10`, `3.14`, `-50`  |
| `texto`        | `text`        | Para cadenas de caracteres.                       | `"Hola"`, `'Player'` |
| `booleano`     | `boolean`     | Para valores de verdadero o falso.                | `verdadero`, `falso` |
| `Materia`      | `Materia`     | Para guardar una referencia a otro objeto del juego. | `null` (por defecto) |

#### Ejemplos de Declaración de Variables

```javascript
// Una variable pública que aparecerá en el Inspector.
publico numero velocidadMovimiento = 5;

// Una variable privada solo para uso interno del script.
privado booleano puedeSaltar = verdadero;

// Una variable de texto para identificar al enemigo.
publico texto tagEnemigo = "Enemigo";

// Una referencia a otro objeto, que puedes asignar desde el Inspector.
publico Materia puertaDeSalida;
```

---

## 3. El Ciclo de Vida de un Script

Creative Engine llama automáticamente a ciertas funciones en tus scripts en momentos específicos. A esto se le llama "ciclo de vida". Entenderlo es fundamental para crear la lógica de tu juego.

### `iniciar()` o `star()`

Esta función se llama **una sola vez** cuando el juego comienza, justo antes del primer fotograma. Es el lugar perfecto para configurar el estado inicial de tu objeto.

**Casos de uso comunes:**
-   Obtener referencias a otros componentes.
-   Establecer valores iniciales para variables privadas.
-   Imprimir mensajes de depuración para confirmar que el script ha empezado.

```javascript
publico iniciar() {
    // Imprime un mensaje en la consola del editor.
    consola.imprimir("¡El script del jugador ha comenzado!");

    // Guardamos una referencia al componente de físicas para usarla después.
    this.miRigidbody = this.rigidbody2D;
}
```

### `actualizar(deltaTime)` o `update(deltaTime)`

Esta función se llama **en cada fotograma** del juego. Es donde reside la mayor parte de la lógica que necesita ejecutarse constantemente.

El parámetro `deltaTime` es muy importante: es el tiempo (en segundos) que ha pasado desde el último fotograma. Usarlo para tus cálculos de movimiento asegura que el juego se comporte igual sin importar si se ejecuta a 30, 60 o 120 FPS.

**Casos de uso comunes:**
-   Leer los controles del jugador.
-   Mover o rotar objetos.
-   Comprobar condiciones (ej: ¿la vida ha llegado a cero?).

```javascript
publico actualizar(deltaTime) {
    // Mover el objeto hacia la derecha a una velocidad constante.
    // Multiplicar por deltaTime hace que el movimiento sea suave e independiente de los FPS.
    this.transform.position.x = this.transform.position.x + (this.velocidad * deltaTime);
}
```

### `actualizarFijo(deltaTime)` o `fixedUpdate(deltaTime)`

Esta función también se llama repetidamente, pero a un **intervalo de tiempo fijo** (por defecto, 50 veces por segundo). Es el lugar ideal para toda la lógica relacionada con **físicas**.

Como se ejecuta a un ritmo constante, las interacciones físicas son más estables y predecibles si se calculan aquí.

**Casos de uso comunes:**
-   Aplicar fuerzas o impulsos a un `Rigidbody2D`.
-   Realizar comprobaciones de colisiones.

```javascript
publico actualizarFijo(deltaTime) {
    // Aplicar una fuerza hacia abajo para simular una gravedad personalizada.
    if (this.rigidbody2D) {
        this.rigidbody2D.addForce({ x: 0, y: 10 });
    }
}
```

---

## 4. Acceso a Componentes

Un script puede interactuar con otros componentes que estén en el **mismo objeto**. El motor te da "atajos" para que puedas acceder a ellos fácilmente usando `this`.

El nombre del atajo es el nombre del componente con su primera letra en minúscula, tanto en inglés como en español.

| Componente          | Atajo en Inglés        | Atajo en Español           |
| :------------------ | :--------------------- | :------------------------- |
| `Transform`         | `this.transform`       | `this.transformacion`      |
| `Rigidbody2D`       | `this.rigidbody2D`     | `this.fisica`              |
| `SpriteRenderer`    | `this.spriteRenderer`  | `this.renderizadorDeSprite` |
| `Animator`          | `this.animator`        | `this.animador`            |
| `AudioSource`       | `this.audioSource`     | `this.fuenteDeAudio`       |
| `BoxCollider2D`     | `this.boxCollider2D`   | `this.colisionadorCaja2D`   |
| ... y muchos más.   | ...                    | ...                        |

### Ejemplo: Mover un Objeto

Para mover un objeto, necesitas acceder a su componente `Transform`.

```javascript
publico numero velocidad = 100;

publico actualizar(deltaTime) {
    // Accedemos al componente Transform a través del atajo 'this.transform'.
    // Luego modificamos su propiedad 'position'.
    this.transform.position.x += this.velocidad * deltaTime;
}
```

---

## 5. APIs del Motor

El motor de Creative Engine te proporciona varias APIs (conjuntos de funciones) para realizar tareas comunes. Puedes acceder a ellas a través de `this`.

### `consola` (API de Consola)

Úsala para imprimir mensajes en la consola del editor. Es tu herramienta principal para depurar y entender qué está pasando en tu juego.

-   **`consola.imprimir(mensaje)`** o **`consola.log(mensaje)`**

```javascript
publico iniciar() {
    consola.imprimir("Script iniciado.");
}

publico actualizar(deltaTime) {
    // Imprime la posición del objeto en cada fotograma.
    consola.imprimir("Posición X: " + this.transform.position.x);
}
```

### `input` / `entrada` (API de Controles)

Te permite detectar las acciones del jugador con el teclado.

-   **`input.teclaPresionada(tecla)`** / `input.isKeyPressed(key)`
    Devuelve `verdadero` mientras la tecla especificada se mantenga presionada. Ideal para movimiento continuo.
-   **`input.teclaRecienPresionada(tecla)`** / `input.isKeyJustPressed(key)`
    Devuelve `verdadero` **solo en el fotograma** en que la tecla fue presionada por primera vez. Perfecto para acciones únicas como saltar o disparar.
-   **`input.teclaLiberada(tecla)`** / `input.isKeyReleased(key)`
    Devuelve `verdadero` **solo en el fotograma** en que la tecla fue soltada. Útil para acciones como cargar un disparo y soltarlo.

Los nombres de las teclas son en minúsculas (ej: `'a'`, `'w'`, `' '` para la barra espaciadora, `'ArrowUp'` para la flecha arriba).

#### Ejemplo de Movimiento y Salto

```javascript
publico numero velocidad = 5;
publico numero fuerzaSalto = 10;

publico actualizarFijo(deltaTime) {
    // Movimiento horizontal continuo
    if (input.teclaPresionada('d')) {
        this.rigidbody2D.velocity.x = this.velocidad;
    } else if (input.teclaPresionada('a')) {
        this.rigidbody2D.velocity.x = -this.velocidad;
    } else {
        this.rigidbody2D.velocity.x = 0;
    }

    // Salto (acción única)
    if (input.teclaRecienPresionada(' ')) {
        this.rigidbody2D.addImpulse({ x: 0, y: -this.fuerzaSalto });
    }
}
```

### `motor` / `engine` (API del Motor)

Esta es la API más grande y te da control sobre el mundo del juego y las físicas.

#### Buscar Objetos

-   **`motor.buscar(nombre)`** / `engine.find(name)`
    Busca y devuelve el primer objeto (`Materia`) en la escena que tenga el nombre especificado.

```javascript
publico Materia puerta;

publico iniciar() {
    // Busca el objeto llamado "PuertaNivel1" y lo guarda en la variable.
    this.puerta = motor.buscar("PuertaNivel1");
}
```

#### Físicas y Colisiones

Estas funciones te permiten saber cuándo tu objeto está chocando con otros.

**Importante:** Para que las colisiones funcionen, los objetos deben tener un componente `Rigidbody2D` y un componente `Collider` (como `BoxCollider2D`).

-   **`motor.alEntrarEnColision(tag)`** / `engine.getCollisionEnter(tag)`
    Devuelve una lista de colisiones que **acaban de empezar** en este fotograma.
-   **`motor.alPermanecerEnColision(tag)`** / `engine.getCollisionStay(tag)`
    Devuelve una lista de colisiones que **siguen activas**.
-   **`motor.alSalirDeColision(tag)`** / `engine.getCollisionExit(tag)`
    Devuelve una lista de colisiones que **acaban de terminar**.

Puedes usar estas funciones con o sin el parámetro `tag`. Si lo usas, solo devolverá colisiones con objetos que tengan esa etiqueta específica.

#### Ejemplo: Detección de Suelo para Saltar

```javascript
privado booleano estaEnElSuelo = falso;

publico actualizarFijo(deltaTime) {
    // Comprueba si estamos tocando un objeto con el tag "Suelo".
    const colisiones = motor.alPermanecerEnColision("Suelo");

    if (colisiones.length > 0) {
        this.estaEnElSuelo = verdadero;
    } else {
        this.estaEnElSuelo = falso;
    }

    // Solo permite saltar si estamos en el suelo.
    if (this.estaEnElSuelo && input.teclaRecienPresionada(' ')) {
        this.rigidbody2D.addImpulse({ x: 0, y: -10 });
    }
}
```

#### Ejemplo: Recoger una Moneda

```javascript
// Script para un objeto "Moneda"
publico iniciar() {
    // Hacemos que el colisionador sea un "Trigger" para que no sea sólido.
    this.boxCollider2D.isTrigger = verdadero;
}

publico actualizarFijo(deltaTime) {
    // Comprobamos si el jugador (con tag "Player") ha entrado en nuestro trigger.
    const colisiones = motor.alEntrarEnColision("Player");

    if (colisiones.length > 0) {
        consola.imprimir("¡Moneda recogida!");

        // Aquí iría la lógica para sumar puntos.

        // Destruimos la moneda.
        this.materia.destroy();
    }
}
```

---

¡Felicidades! Ahora conoces los fundamentos del scripting en Creative Engine. ¡Experimenta, combina estos conceptos y empieza a crear comportamientos increíbles para tus juegos!
