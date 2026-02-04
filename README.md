# 📔 Manual Maestro de Scripting para Creative Engine (.ces)

¡Bienvenido al manual definitivo de programación en **Creative Engine**! Este documento ha sido diseñado como un "pequeño libro" exhaustivo para que cualquier creador, desde principiantes hasta expertos, pueda dominar el sistema de scripting bilingüe del motor.

Si estás escribiendo un libro sobre programación, este manual te servirá como la base técnica perfecta. Aquí encontrarás cada palabra clave, cada componente y cada API explicada con lujo de detalles.

---

## 📑 Índice de Contenidos
1.  [Introducción a la Materia](#1-introducción-a-la-materia)
2.  [Estructura de un Script (.ces)](#2-estructura-de-un-script-ces)
3.  [Palabras Clave y Diccionario Bilingüe](#3-palabras-clave-y-diccionario-bilingüe)
4.  [Tipos de Datos y Variables](#4-tipos-de-datos-y-variables)
5.  [El Ciclo de Vida del Script](#5-el-ciclo-de-vida-del-script)
6.  [La Unidad Base: Materia](#6-la-unidad-base-materia)
7.  [Guía Detallada de Componentes (Leyes)](#7-guía-detallada-de-componentes-leyes)
    *   [Transformación (Transform)](#transformación-transform)
    *   [Renderizado de Imagen (SpriteRenderer)](#renderizado-de-imagen-spriterenderer)
    *   [Físicas 2D (Rigidbody2D)](#físicas-2d-rigidbody2d)
    *   [Colisionadores de Caja (BoxCollider2D)](#colisionadores-de-caja-boxcollider2d)
    *   [Colisionadores de Cápsula (CapsuleCollider2D)](#colisionadores-de-cápsula-capsulecollider2d)
    *   [Animación (Animator)](#animación-animator)
    *   [Controladores de Animación (AnimatorController)](#controladores-de-animación-animatorcontroller)
    *   [Fuentes de Audio (AudioSource)](#fuentes-de-audio-audiosource)
    *   [Cámaras (Camera)](#cámaras-camera)
    *   [Iluminación 2D (Lights)](#iluminación-2d-lights)
    *   [Interfaz de Usuario: Canvas](#interfaz-de-usuario-canvas)
    *   [Interfaz de Usuario: Imagen (UIImage)](#interfaz-de-usuario-imagen-uiimage)
    *   [Interfaz de Usuario: Texto (UIText)](#interfaz-de-usuario-texto-uitext)
    *   [Interfaz de Usuario: Botón (Button)](#interfaz-de-usuario-botón-button)
    *   [Tilemaps y Grillas](#tilemaps-y-grillas)
8.  [APIs Globales (Motor, Entrada, Escena)](#8-apis-globales-motor-entrada-escena)
9.  [Prefabs y Gestión de Assets](#9-prefabs-y-gestión-de-assets)
10. [Eventos de Colisión en Detalle](#10-eventos-de-colisión-en-detalle)
11. [Matemáticas y Lógica Útil](#11-matemáticas-y-lógica-útil)
12. [Tutorial: Tu Primer Juego Paso a Paso](#12-tutorial-tu-primer-juego-paso-a-paso)
13. [Ejemplos Avanzados de Lógica](#13-ejemplos-avanzados-de-lógica)
14. [Extendiendo el Motor (Librerías .celib)](#14-extendiendo-el-motor-librerías-celib)
15. [Creative H-Code (CHC) y Carl IA](#15-creative-h-code-chc-y-carl-ia)
16. [Depuración y Buenas Prácticas](#16-depuración-y-buenas-prácticas)
17. [Errores Comunes y FAQ](#17-errores-comunes-y-faq)
18. [Glosario Técnico y Diccionario de Teclas](#18-glosario-técnico-y-diccionario-de-teclas)
19. [Consejos para el Autor del Libro](#19-consejos-para-el-autor-del-libro)
20. [Conclusión y Futuro del Motor](#20-conclusión-y-futuro-del-motor)

---

## 1. Introducción a la Materia

En Creative Engine, todo lo que ves en pantalla es una **Materia**. Una Materia es un objeto vacío que cobra vida a través de los **Componentes** (también llamados "Leyes"). El sistema de scripting `.ces` te permite manipular estos componentes en tiempo real para crear interactividad, mecánicas de juego y sistemas complejos.

El lenguaje `.ces` es una versión simplificada y potenciada de JavaScript, diseñada para ser leída de forma natural tanto en español como en inglés. El motor transpila este código a JavaScript de alto rendimiento automáticamente cada vez que presionas "Play".

### Filosofía del Motor
Creative Engine cree en la libertad creativa. Por ello, el sistema de scripting no impone una estructura rígida, sino que te da las herramientas para que construyas tus propias reglas de juego (Leyes). Todo lo que ves en el Inspector del editor es accesible y modificable mediante código.

---

## 2. Estructura de un Script (.ces)

Un script típico se divide en tres bloques fundamentales. Respetar este orden asegura que el motor entienda perfectamente tus intenciones.

### Bloque 1: Importaciones
Se usa la palabra clave `go` para cargar librerías externas o módulos especiales del motor. Si quieres usar funciones de una librería que creaste, este es el lugar.
```javascript
go "ce.ui"
go "SistemaDeFisicasAvanzado"
```

### Bloque 2: Declaración de Variables
Aquí defines qué datos necesita tu objeto.
- **Variables Públicas**: Son los parámetros que quieres ajustar desde el editor sin abrir el código.
- **Variables Privadas**: Son para uso interno del script, como contadores o estados temporales.
```javascript
public numero velocidad = 5.5;      // Aparece en el Inspector
public Materia miObjetivo;          // Campo para arrastrar otro objeto
public Color tinteEspecial = "#FF0000";

private booleano estaSaltando = falso;
private numero cronometro = 0;
```

### Bloque 3: Funciones de Ciclo de Vida
Aquí es donde programas qué hace el objeto y cuándo.
```javascript
public iniciar() {
    consola.imprimir("¡Objeto listo para la acción!");
}

public actualizar(deltaTime) {
    // Lógica que corre constantemente
}
```

---

## 3. Palabras Clave y Diccionario Bilingüe

El motor es bilingüe para facilitar el aprendizaje. Aquí tienes la tabla de equivalencias:

### Definición y Alcance
| Español | Inglés | Función |
| :--- | :--- | :--- |
| `publico` / `public` | `public` | Variable editable desde el Inspector. |
| `privado` / `private` | `private` | Variable oculta, lógica interna. |
| `funcion` | `function` | Define una nueva acción personalizada. |
| `variable` | `let` / `var` | Define una variable local dentro de una función. |

### Tipos de Datos
| Español | Inglés | Descripción |
| :--- | :--- | :--- |
| `numero` | `number` | Números decimales o enteros. |
| `texto` | `string` | Cadenas de caracteres (siempre entre comillas). |
| `booleano` | `boolean` | Valores `verdadero` (true) o `falso` (false). |

### Lógica y Control
| Español | Inglés | Descripción |
| :--- | :--- | :--- |
| `si` | `if` | Si se cumple la condición... |
| `sino si` | `else if` | Si la anterior falló y esta se cumple... |
| `sino` | `else` | Si ninguna se cumplió... |
| `para` | `for` | Repite un bloque un número de veces. |
| `mientras` | `while` | Repite mientras algo sea cierto. |
| `retornar` | `return` | Devuelve un valor al final de una función. |

---

## 4. Tipos de Datos y Variables

### Variables Públicas (`public`)
Son la clave para un buen flujo de trabajo. Permiten que alguien que no sabe programar pueda cambiar la velocidad de un enemigo simplemente moviendo un deslizador en el editor.

### Tipos de Datos Específicos
1.  **`Materia`**: Es un puntero a otro objeto. Útil para que un script de "Cámara" sepa a qué "Jugador" debe seguir.
2.  **`Vector2`**: Una pareja de números `{x, y}`. Se usa para posiciones, escalas y direcciones.
3.  **`Color`**: Almacena información de color. Puedes asignarle un valor como `#FFFFFF`.
4.  **`Sprite`**: Guarda una referencia a un asset visual.
5.  **`Audio`**: Guarda una referencia a un archivo de sonido.
6.  **`Prefab`**: Es una Materia guardada como archivo. Útil para "spawnearla" múltiples veces.

---

## 5. El Ciclo de Vida del Script

1.  **`iniciar()` / `star()`**:
    - Ocurre una vez al inicio.
    - **Uso**: Configurar la vida inicial, buscar componentes con `getComponent`.
2.  **`actualizar(deltaTime)` / `update(deltaTime)`**:
    - Ocurre cada vez que la pantalla se refresca.
    - **Uso**: Leer el teclado, mover el personaje, actualizar temporizadores.
3.  **`actualizarFijo(deltaTime)` / `fixedUpdate(deltaTime)`**:
    - Ocurre a intervalos constantes, ignorando los FPS.
    - **Uso**: Aplicar fuerzas físicas, impulsos de salto.
4.  **`alHabilitar()` / `onEnable()`**:
    - Ocurre cuando el objeto pasa de estar desactivado a activado.
5.  **`alDeshabilitar()` / `onDisable()`**:
    - Ocurre cuando el objeto se desactiva.
6.  **`alDestruir()` / `onDestroy()`**:
    - Ocurre justo antes de que el objeto desaparezca por `removeMateria`.

---

## 6. La Unidad Base: Materia

Cada objeto en la escena es una instancia de la clase `Materia`.

### Propiedades de Materia
- `this.materia.id`: Identificador único numérico.
- `this.materia.name`: Texto con el nombre.
- `this.materia.tag`: Etiqueta identificativa (ej: "Enemigo").
- `this.materia.isActive`: Booleano para encender/apagar el objeto.
- `this.materia.layer`: Número de capa (0 a 31).
- `this.materia.parent`: Referencia al objeto padre (si tiene).

### Métodos de Materia
- `getComponent(Clase)`: Devuelve el primer componente de ese tipo.
- `getComponents(Clase)`: Devuelve un array con todos los componentes de ese tipo.
- `addChild(hijo)`: Convierte a otro objeto en su subordinado jerárquico.
- `clone()`: Crea un duplicado exacto en la escena.

---

## 7. Guía Detallada de Componentes (Leyes)

Aquí es donde reside la verdadera potencia del motor.

### Transformación (`Transform` / `transformacion`)
Define el "dónde" y "cómo" de la Materia.
- `x`, `y`: Coordenadas globales.
- `localPosition`: Vector con coordenadas relativas al padre.
- `localRotation`: Ángulo de giro en grados.
- `localScale`: Vector de tamaño relativo. `{x: 1, y: 1}` es el 100%.

### Renderizado de Imagen (`SpriteRenderer` / `renderizadorDeSprite`)
Define el "qué se ve".
- `source`: Ruta del archivo de imagen.
- `color`: Tinte que se aplica a la imagen (Hexadecimal).
- `opacity`: Valor decimal de 0 a 1.
- `spriteName`: Nombre del sprite si proviene de un archivo `.ceSprite`.

### Físicas 2D (`Rigidbody2D` / `fisica`)
Define el "cómo reacciona".
- `bodyType`: `"Dynamic"` (físico total), `"Kinematic"` (controlado por código), `"Static"` (suelo).
- `mass`: Peso en kg simulados.
- `gravityScale`: Fuerza de la gravedad sobre este objeto.
- `velocity`: Vector de velocidad actual `{x, y}`.
- `linearDrag`: Resistencia al aire (frena el movimiento).
- `angularDrag`: Resistencia al giro.
- **Método `addForce({x, y})`**: Aplica una fuerza constante.
- **Método `addImpulse({x, y})`**: Aplica una fuerza instantánea (salto).

### Colisionadores de Caja (`BoxCollider2D`)
- `size`: Dimensiones `{x, y}` del área de choque.
- `offset`: Desplazamiento respecto al centro del sprite.
- `isTrigger`: Si es cierto, detecta el toque pero no detiene el movimiento.

### Colisionadores de Cápsula (`CapsuleCollider2D`)
- `size`: Dimensiones del área.
- `direction`: `"Vertical"` o `"Horizontal"`.

### Animación (`Animator` / `animador`)
- `animationClipPath`: Ruta al archivo `.ceanimclip`.
- `speed`: Rapidez de la animación.
- `loop`: Booleano para repetir.
- `play()`: Iniciar reproducción.
- `stop()`: Detener reproducción.

### Controladores de Animación (`AnimatorController`)
- `controllerPath`: Ruta al archivo `.ceanim`.
- `play(nombreEstado)`: Cambia a una animación específica definida en el editor.

### Fuentes de Audio (`AudioSource` / `fuenteDeAudio`)
- `source`: Archivo de sonido.
- `volume`: De 0 a 1.
- `loop`: Repetición infinita.
- `playOnAwake`: Iniciar al nacer.

### Cámaras (`Camera`)
- `orthographicSize`: Define cuánto mundo se ve (Zoom).
- `backgroundColor`: Color de fondo.
- `depth`: Prioridad de dibujado.
- `cullingMask`: Máscara de bits para decidir qué capas ignora esta cámara.

### Iluminación 2D (Lights)
- **`PointLight2D`**: Luz circular. Propiedades: `color`, `intensity`, `radius`.
- **`SpotLight2D`**: Luz cónica. Propiedades: `color`, `intensity`, `radius`, `angle`.
- **`FreeformLight2D`**: Luz de forma libre basada en vértices.
- **`SpriteLight2D`**: Luz que usa una textura como máscara.

### Interfaz de Usuario: Canvas
- `renderMode`: `"Screen Space"` (fijo arriba de todo) o `"World Space"` (dentro del juego).
- `referenceResolution`: Tamaño base para escalar la UI.

### Interfaz de Usuario: Imagen (UIImage)
- `color`: Color de fondo del elemento.
- `source`: Imagen del elemento UI.

### Interfaz de Usuario: Texto (UIText)
- `text`: El mensaje.
- `fontSize`: Tamaño de fuente en píxeles.
- `horizontalAlign`: `"left"`, `"center"`, `"right"`.

### Interfaz de Usuario: Botón (Button)
- `interactable`: Habilitar o apagar el botón.
- `onClick`: Lista de acciones que ocurren al pulsar.

### Tilemaps y Grillas
- **`Grid`**: Define el tamaño de las celdas (ej: 32x32).
- **`Tilemap`**: Almacena los datos de los azulejos en múltiples capas.
- **`TilemapRenderer`**: Dibuja los azulejos en pantalla de forma eficiente.
- **`TilemapCollider2D`**: Genera colisiones automáticamente para todos los suelos dibujados.

---

## 8. APIs Globales (Motor, Entrada, Escena)

### Motor (`motor` / `engine`)
- `motor.buscar(nombre)`: Encuentra un objeto.
- `motor.alEntrarEnColision(tag)`: Devuelve lista de choques iniciales.
- `motor.alPermanecerEnColision(tag)`: Devuelve lista de choques constantes.
- `motor.alSalirDeColision(tag)`: Devuelve lista de choques que acaban de terminar.

### Entrada (`entrada` / `input`)
- `entrada.teclaPresionada(tecla)`: Cierto mientras se mantiene pulsada.
- `entrada.teclaRecienPresionada(tecla)`: Cierto solo el primer instante.
- `entrada.teclaLiberada(tecla)`: Cierto al soltar.

### Escena (`escena` / `scene`)
- `escena.establecerHora(h)`: Cambia la luz ambiental según la hora (0-23).
- `escena.establecerLuzAmbiental(color)`: Cambia el tinte global del mundo.

---

## 9. Prefabs y Gestión de Assets

### ¿Qué es un Prefab?
Imagina que has diseñado un cofre del tesoro con su sprite, un sonido de apertura, un sistema de partículas y un script de botín. No quieres repetir todo eso 50 veces. Lo guardas como Prefab.

### Uso en Scripting
Para crear un Prefab por código, primero debes tener una referencia a él:
```javascript
public Prefab explosiónPrefab;

public estallar() {
    let nuevaExplosion = explosiónPrefab.clone();
    nuevaExplosion.transform.position = this.transform.position;
    nuevaExplosion.isActive = verdadero;
}
```

---

## 10. Eventos de Colisión en Detalle

Cuando pides información de colisión, recibes un objeto con estos datos:
- `materia`: El objeto contra el que chocaste. Puedes leer su `tag` o su `name`.
- `transform`: Acceso directo a su posición.
- `collider`: El componente de choque del otro.

**Ejemplo de combate:**
```javascript
public actualizar(dt) {
    let golpes = motor.alEntrarEnColision("Enemigo");

    golpes.forEach(golpe => {
        consola.imprimir("Chocaste con: " + golpe.materia.name);
        this.salud -= 10;
    });
}
```

---

## 11. Matemáticas y Lógica Útil

Creative Engine usa las matemáticas estándar de programación:
- `Math.PI`: El número PI (3.14159...).
- `Math.random()`: Valor entre 0 y 1.
- `Math.floor(x)`: Redondea hacia abajo.
- `Math.abs(x)`: Valor absoluto (convierte negativos en positivos).
- `Math.sin(tiempo) * amplitud`: Crea movimientos suaves de vaivén.
- `Math.atan2(y, x)`: Calcula ángulos para apuntar a objetivos.

**Ejemplo de Movimiento Ondulante:**
```javascript
private numero tiempo = 0;
public actualizar(dt) {
    tiempo += dt;
    this.transform.y += Math.sin(tiempo * 2) * 50 * dt;
}
```

---

## 12. Tutorial: Tu Primer Juego Paso a Paso

### 1. Preparar la Escena
Crea un objeto llamado "Suelo", ponle un `SpriteRenderer` cuadrado, un `BoxCollider2D` y cambia su `tag` a "Suelo". Pon su `Rigidbody2D` en modo `Static`.

### 2. Crear el Protagonista
Crea una Materia "Héroe". Añade `SpriteRenderer`, `BoxCollider2D` y `Rigidbody2D` (Dynamic).

### 3. El Script de Control
Crea `Heroe.ces` y añádelo al Héroe:
```javascript
public numero fuerzaSalto = 600;
public numero velocidad = 200;

public actualizar(dt) {
    // Caminar
    si (entrada.teclaPresionada("d")) { this.transform.x += velocidad * dt; }
    si (entrada.teclaPresionada("a")) { this.transform.x -= velocidad * dt; }

    // Saltar (Solo si toca el suelo)
    si (entrada.teclaRecienPresionada("space")) {
        let enSuelo = motor.alPermanecerEnColision("Suelo");
        si (enSuelo.length > 0) {
            this.fisica.addImpulse({x: 0, y: -fuerzaSalto});
        }
    }
}
```

---

## 13. Ejemplos Avanzados de Lógica

### IA que Persigue al Jugador
```javascript
public Materia jugador;
public numero velocidadIA = 150;

public actualizar(dt) {
    si (jugador == nulo) {
        jugador = motor.buscar("Héroe");
        retornar;
    }

    let dirX = jugador.transform.x - this.transform.x;
    si (Math.abs(dirX) > 10) {
        let signo = dirX > 0 ? 1 : -1;
        this.transform.x += signo * velocidadIA * dt;
    }
}
```

### Barra de Salud Visual
```javascript
public Materia barraRoja; // Objeto UI hijo de un Canvas
private numero saludMaxima = 100;
private numero saludActual = 100;

public function herir(puntos) {
    saludActual -= puntos;
    let tf = barraRoja.getComponent(UITransform);
    tf.size.width = (saludActual / saludMaxima) * 200;
}
```

---

## 14. Extendiendo el Motor (Librerías .celib)

Las librerías `.celib` son paquetes JavaScript que devuelven un objeto con funciones. Son ideales para sistemas que vas a usar en muchos proyectos distintos.

**Estructura de una .celib:**
```javascript
return {
    miFuncionUtil: function() {
        consola.imprimir("¡Llamada desde librería!");
    }
};
```
Luego, en cualquier script, escribes `go "NombreDeTuLibreria"` y ya puedes usar `miFuncionUtil()`.

---

## 15. Creative H-Code (CHC) y Carl IA

**Carl** es el asistente de IA apasionado que vive en el motor. Si abres un archivo `.chc`, puedes escribirle en español:

> "Carl, por favor, haz que este enemigo se mueva de izquierda a derecha sin parar y que si me toca, me quite 1 de vida."

Carl generará toda la lógica técnica por ti. Es la herramienta definitiva para aprender viendo cómo Carl escribe el código.

---

## 16. Depuración y Buenas Prácticas

1.  **Imprimir en Consola**: Usa `consola.imprimir()` para saber si una función se está ejecutando.
2.  **Uso de DeltaTime**: Multiplica siempre las velocidades por `dt` para que el juego sea fluido en cualquier monitor.
3.  **No busques cada frame**: Guardar referencias en `iniciar` es 10 veces más rápido que usar `motor.buscar` en `actualizar`.
4.  **Capas de Colisión**: Configura en los Ajustes del Proyecto qué capas chocan entre sí para evitar cálculos innecesarios.

---

## 17. Errores Comunes y FAQ

- **¿Por qué mi objeto cae al infinito?** Revisa si tiene un `Rigidbody2D` pero no hay un `Collider` en el suelo con el que chocar.
- **¿Por qué la UI se ve borrosa?** Ajusta la `referenceResolution` en el componente `Canvas` principal.
- **¿Cómo cambio de escena?** Usa `Scene.load("NombreEscena")`.
- **¿El juego va lento?** Reduce el número de luces dinámicas o usa `TilemapCollider2D`.

---

## 18. Glosario Técnico y Diccionario de Teclas

### Diccionario de Términos
- **Materia**: Entidad base de todo objeto en la escena.
- **Ley**: Comportamiento o lógica (Componente).
- **Inspector**: Panel de edición de propiedades visuales.
- **Jerarquía**: Árbol de objetos de la escena actual.
- **Asset**: Cualquier archivo de recurso (imagen, audio, prefab).
- **Trigger**: Colisionador que detecta pero no detiene físicamente.
- **Ancla (Anchor)**: Punto de referencia para posicionar elementos UI.
- **DeltaTime**: Tiempo exacto entre el frame anterior y el actual.
- **Transpilador**: Sistema que traduce tu código `.ces` a `JavaScript`.

### Teclas Populares para `entrada.tecla`
- `"w"`, `"s"`, `"a"`, `"d"`
- `"arrowup"`, `"arrowdown"`, `"arrowleft"`, `"arrowright"`
- `"space"`, `"enter"`, `"escape"`, `"shift"`, `"control"`
- `"mouse0"` (Clic izquierdo), `"mouse1"` (Clic derecho)

---

## 19. Consejos para el Autor del Libro

Si integras este manual en tu libro de programación:
1.  **Usa negritas** para las palabras clave del motor.
2.  **Crea diagramas** que muestren la relación entre Materia -> Componente -> Script.
3.  **Desafía al lector**: "Ahora intenta tú hacer que el jugador se haga más grande al comer una seta".
4.  **Progresión**: Empieza con movimiento simple y termina con IA compleja.

---

## 20. Conclusión y Futuro del Motor

Creative Engine es un ecosistema vivo. Muy pronto, Carl IA será capaz de generar escenas completas y sistemas multijugador automáticamente. Al aprender `.ces` hoy, estás preparándote para el futuro del desarrollo de videojuegos asistido por IA.

¡Felicidades por llegar al final! Tienes en tus manos el conocimiento para ser un maestro del desarrollo en **Creative Engine**. ¡Adelante, el mundo que imagines te está esperando! 🚀🎨✨

*Escrito por Jules para la comunidad de Creative Engine. v1.3.2*

---
*Fin del Pequeño Libro de Scripting.*
