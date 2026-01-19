# Creative Engine Scripting (.ces) Transpiler

This toolset allows you to write scripts in `.ces` and transpile them to JavaScript to be used in the Creative Engine.

---

## Cómo Empezar: Crear un Nuevo Proyecto

Hemos incluido un script para generar un nuevo proyecto con todo lo que necesitas para empezar.

**Uso:**
```bash
node create-project.js MiNuevoJuego
```
Esto creará una nueva carpeta llamada `MiNuevoJuego` con la siguiente estructura:
- `MANUAL.md`: La guía completa de programación en `.ces`.
- `main.ces`: Tu archivo de script principal, listo para editar.
- `assets/`: Una carpeta para guardar tus modelos 3D, texturas, etc.

---

## Flujo de Trabajo de Desarrollo

El ciclo de desarrollo en Creative Engine es simple y consta de 3 pasos:

### Paso 1: Escribe tu Código
Modifica tus archivos `.ces` (por ejemplo, `main.ces`) para añadir la lógica de tu juego.

### Paso 2: Traduce tu Código
Usa el `transpiler.js` para convertir tu script `.ces` a JavaScript. El nombre del archivo de salida debe ser `game.js` para que el lanzador lo encuentre.

**Comando:**
```bash
node transpiler.js main.ces game.js
```

### Paso 3: Prueba tu Juego
Abre el archivo `launcher.html` en tu navegador. Este lanzador cargará automáticamente tu `game.js` y el motor, permitiéndote probar tu juego al instante.

---

## Guía de Programación en .ces

Esta guía explica cómo escribir scripts para el Creative Engine usando la sintaxis `.ces`.

### 1. Importar Módulos (`using`)

Para usar las APIs del motor, primero debes importarlas. Cada `using` carga un conjunto de herramientas específicas.

**Sintaxis:**
```ces
using creative.engine;           // Funciones base del motor
using creative.engine.core;      // Escenas, cámara, assets
using creative.engine.ui;        // Interfaz de usuario (botones, texto)
using creative.engine.animator;  // Animaciones
using creative.engine.physics;   // Física y colisiones
```

### 2. Declarar Variables (`public materia/gameObject`)

Usa esta sintaxis para declarar variables que contendrán tus objetos de juego (llamados "materia").

**Sintaxis:**
```ces
public materia/gameObject miJugador;
public materia/gameObject enemigo_01;
```
Esto se traduce a `let miJugador;` y `let enemigo_01;` en JavaScript.

### 3. Funciones Principales (`star` y `update`)

Tu lógica de juego se escribe dentro de dos funciones principales:

*   `public star()`: Se ejecuta una sola vez cuando el juego comienza. Ideal para configurar la escena, crear objetos e inicializar valores.
*   `public update(deltaTime)`: Se ejecuta en cada frame del juego. `deltaTime` es el tiempo transcurrido desde el último frame. Úsalo para la lógica continua como el movimiento o la entrada del jugador.

**Ejemplo:**
```ces
public star() {
    // Código de inicialización aquí
}

public update(deltaTime) {
    // Lógica del juego que se repite aquí
}
```

### 4. Crear Objetos (`materia crear`)

Este es un comando especial para cargar y crear un objeto en el juego.

**Sintaxis:**
```ces
materia crear <variable>, "<ruta_al_modelo>";
```

**Ejemplo:**
```ces
public materia/gameObject jugador;

public star() {
    // Asigna el modelo "player.glb" a la variable "jugador"
    materia crear jugador, "assets/player.glb";
}
```

### 5. Usar Leyes Físicas (`ley`)

Los comandos `ley` son atajos para controlar sistemas globales, como la física.

**Sintaxis:**
```ces
ley <sistema> <estado>;
```

**Ejemplo:**
```ces
public star() {
    // Activa la gravedad para toda la escena
    ley gravedad activar;
}

public update(deltaTime) {
    if (condicion) {
        // También se puede desactivar
        ley gravedad desactivar;
    }
}
```
