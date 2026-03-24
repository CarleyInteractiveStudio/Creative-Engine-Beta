# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**
```ces
ve motor;
publico numero velocidadGiro = 100;

alActualizar(delta) {
    rotacion += velocidadGiro * delta;
    si (teclaPresionada("Space")) {
        fisica.applyImpulse(0, 10); // Un pequeño salto
    }
}
```
3.  **Asigna:** Arrástralo a una Materia. ¡Dale a Play y presiona Espacio!

---

## 🏛️ CAPÍTULO 1: FILOSOFÍA Y ARQUITECTURA

### ¿Qué es CES?
CES no es un lenguaje nuevo; es una **Abstracción de Alto Nivel** sobre JavaScript (ES6+). Ha sido diseñado para que la lógica de tu juego se lea como una frase en tu idioma natal.

**La diferencia clave:**
*   **JS Normal:** `this.materia.getComponent("Rigidbody2D").velocity.x = 5;`
*   **CES (Español):** `fisica.velocidadX = 5;`

El transpilador interno se encarga de convertir esa simplicidad en código profesional de alto rendimiento que el navegador ejecuta a velocidades de vértigo.

---

## 🦴 CAPÍTULO 2: LÓGICA NATURAL

CES introduce la **Lógica Natural**, permitiendo usar palabras en lugar de símbolos crípticos para las condiciones.

### Operadores Soportados (Español):
*   `si` en lugar de `if`.
*   `y` en lugar de `&&`.
*   `o` en lugar de `||`.
*   `es` / `igual a` en lugar de `===`.
*   `diferente a` en lugar de `!==`.
*   `no` en lugar de `!`.

**Ejemplo de código legible:**
```ces
si (vida es 0 y no estaMuerto) {
    reproducir.Muerte();
    estaMuerto = verdadero;
}
```

---

## 💎 CAPÍTULO 3: EL INSPECTOR DINÁMICO

El Inspector no es solo una lista de variables; es una ventana en tiempo real al estado de tu juego.

### Atributos de Visibilidad
Usar `publico` antes de una variable le indica al motor que debe crear un control de edición en la interfaz:

*   **`publico numero`**: Crea un campo numérico.
*   **`publico texto`**: Crea un campo de escritura.
*   **`publico booleano`**: Crea una casilla de verificación.
*   **`publico Materia`**: Crea un slot de "Drag & Drop" para objetos de la escena.
*   **`publico Sprite`**: Permite seleccionar imágenes.
*   **`publico Prefab`**: Permite seleccionar archivos `.ceprefab`.

---

## ⏱️ CAPÍTULO 4: EL CICLO DE VIDA (EL LATIDO)

Tu script tiene etapas biológicas por las que pasa en cada ejecución:

1.  **`alEmpezar()` (o `start`):** Se ejecuta una vez cuando el objeto nace. Ideal para buscar referencias.
2.  **`alActualizar(delta)` (o `update`):** El loop principal. Se ejecuta cada frame.
3.  **`actualizarFijo(delta)` (o `fixedUpdate`):** Especial para físicas constantes.
4.  **`alChocar(otro)` (o `onCollisionEnter`):** Se activa al tocar un objeto sólido.
5.  **`alEntrarEnTrigger(otro)`:** Se activa al entrar en una zona fantasma.
6.  **`alClicar()`:** Se activa al hacer clic con el mouse o tocar en el móvil.
7.  **`alDestruir()`:** Se ejecuta justo antes de que el objeto desaparezca de la memoria.

---

## ⌨️ CAPÍTULO 5: INPUT POLÍGLOTA

Creative Engine abstrae la complejidad del hardware en una API de consulta directa (Polling).

### Teclado (Alias en Español):
*   `teclaPresionada("a")`: Verdadero mientras se mantiene hundida.
*   `teclaRecienPresionada("Space")`: Solo el primer frame del pulso.
*   `teclaLiberada("Enter")`: Al soltar la tecla.

### Mouse y Touch:
*   `botonMousePresionado(0)`: 0 es Izquierdo, 1 Central, 2 Derecho.
*   `obtenerPosicionMouse()`: Devuelve `{x, y}` en coordenadas del mundo.

### Mandos (Gamepad):
*   `mandoConectado(0)`: Revisa si hay un mando en el puerto 0.
*   `mandoBotonPresionado("A", 0)`: Revisa el botón A del mando 0.
*   `mandoEje(0, 0)`: Valor del stick izquierdo X (-1 a 1).

---

## 📦 CAPÍTULO 6: LA GRAN REFERENCIA DE ALIAS (API)

Aquí tienes los atajos que puedes usar directamente en tus scripts CES:

### 📍 Transformación (`posicion`, `transform`)
*   `.x`, `.y`: Coordenadas espaciales.
*   `.rotacion`: Ángulo en grados.
*   `.escala`: Tamaño relativo.
*   `mover(x, y)`: Desplazamiento relativo.
*   `mirarA(objetivo)`: Rota instantáneamente hacia un punto o materia.

### ⚖️ Físicas (`fisica`, `rigidbody2D`)
*   `.velocidadX`, `.velocidadY`: Rapidez en los ejes.
*   `.velocidadAngular`: Rapidez de giro.
*   `.masa`: Peso físico.
*   `.escalaGravedad`: Qué tanto le afecta el mundo.
*   `applyForce(x, y)`: Empuje constante.
*   `applyImpulse(x, y)`: Golpe instantáneo.

### 🩸 Salud (`vida`, `health`)
*   `.vidaActual`: Puntos de salud ahora.
*   `.vidaMaxima`: Límite de salud.
*   `danar(cantidad)`: Resta vida y dispara eventos.
*   `curar(cantidad)`: Suma vida sin pasar el máximo.

### 🎬 Animación (`animador`, `animacion`)
*   `play("Nombre")`: Cambia al estado deseado.
*   `stop()`: Congela el cuadro.
*   `reproducir.Correr()`: Acceso rápido dinámico.

---

## 📡 CAPÍTULO 7: LA RED NEURONAL (MENSAJERÍA)

Evita las referencias directas para que tu juego no se rompa si borras un objeto.

*   **`difundir("EXPLOSION", { fuerza: 500 })`**: Envía una señal al aire.
*   **`alRecibir("EXPLOSION", (datos) => { ... })`**: El script reacciona si le llega el mensaje.

---

## 🪄 CAPÍTULO 8: CONTROL DEL TIEMPO Y ASINCRONÍA

CES maneja corrutinas automáticas. No necesitas saber programación asíncrona compleja.

### Corrutinas (`esperar`)
```ces
alHacerClick() {
    imprimir("Iniciando secuencia...");
    esperar(1);
    imprimir("Pasó 1 segundo");
    esperar(0.5);
    imprimir("Fin.");
}
```

### El Bucle Periódico (`cada`)
```ces
alEmpezar() {
    cada(2) {
        imprimir("Han pasado 2 segundos más");
    }
}
```

---

## 🍳 CAPÍTULO 9: EL RECETARIO MAESTRO (BÁSICO)

### 9.1 Sistema de Monedas y Puntaje
```ces
ve motor;
publico numero valorMoneda = 10;

alEntrarEnTrigger(otro) {
    si (otro.tieneTag("Player")) {
        difundir("SUMAR_PUNTOS", valorMoneda);
        destruir(materia);
    }
}
```

### 9.2 IA de Patrulla Simple
```ces
ve motor;
publico numero distancia = 200;
variable inicioX;
variable direccion = 1;

alEmpezar() {
    inicioX = x;
}

alActualizar(delta) {
    posicion.x += 100 * direccion * delta;
    si (absoluto(x - inicioX) > distancia) {
        direccion *= -1;
        voltearH = (direccion < 0);
    }
}
```

### 9.3 Cámara que Sigue Suavemente (Lerp)
```ces
ve motor;
publico Materia objetivo;
publico numero suavizado = 5;

alActualizar(delta) {
    si (objetivo) {
        posicion.x += (objetivo.x - x) * suavizado * delta;
        posicion.y += (objetivo.y - y) * suavizado * delta;
    }
}
```

---

## 🧪 CAPÍTULO 10: OPTIMIZACIÓN Y BUENAS PRÁCTICAS

1.  **Cachear Búsquedas:** No uses `buscar("Jugador")` dentro de `alActualizar`. Búscalo una vez en `alEmpezar` y guárdalo en una variable.
2.  **Uso de Delta:** Siempre multiplica tus movimientos por `delta` para que el juego no vaya más rápido en ordenadores potentes.
3.  **Desactivar vs Destruir:** Si vas a crear muchos enemigos iguales, es mejor desactivarlos (`materia.estaActivado = falso`) y volverlos a activar luego que destruirlos y crearlos.

---

## 🛠️ CAPÍTULO 11: BAJO EL CAPÓ (TRANSPILACIÓN)

Cuando guardas un script `.ces`, ocurre este proceso en milisegundos:
1.  **Analizador Léxico:** Identifica las palabras clave (`si`, `ve`, `publico`).
2.  **Mapeador de Alias:** Traduce los términos (ej: `fisica` -> `this.getComponent('Rigidbody2D')`).
3.  **Envoltorio de Clase:** Tu código se mete dentro de una clase que hereda de `CreativeScriptBehavior`.
4.  **Generación de JS:** Se crea un archivo de JavaScript puro que el motor carga en la escena.

---

## 📖 CAPÍTULO 12: GLOSARIO DE ALIAS POR IDIOMA

El motor es políglota. Aquí tienes los alias más comunes:

### 🇪🇸 Español (ES)
`vida`, `fisica`, `posicion`, `reproducir`, `imprimir`, `esperar`, `si`, `sino`, `verdadero`, `falso`, `numero`, `texto`, `booleano`, `funcion`, `variable`, `retornar`, `bucle`, `cada`.

### 🇺🇸 Inglés (EN)
`health`, `physics`, `transform`, `play`, `log`, `wait`, `if`, `else`, `true`, `false`, `number`, `string`, `boolean`, `function`, `let`, `return`, `loop`, `every`.

---

## 🔍 CAPÍTULO 13: DEPURACIÓN (DEBUGGING)

### La Consola del Editor
Todos tus `imprimir("mensaje")` aparecerán aquí. Úsala para saber si una parte de tu código se está ejecutando o para ver el valor de una variable en tiempo real.

### Errores Comunes en CES:
*   **"Variable no definida":** Revisa que hayas declarado tu variable con `variable` o `publico`.
*   **"Error de sintaxis":** Revisa si olvidaste cerrar un paréntesis `)` o una llave `{`.

---

## 🚀 CAPÍTULO 14: SCRIPTING AVANZADO CON CELIB

Si necesitas funciones que el motor no tiene de serie, puedes crear tus propias librerías en JavaScript puro con la extensión `.celib`.

**Ejemplo de una librería simple:**
```javascript
// MiLibreria.celib
export function calcularDistancia(a, b) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}
```

---

## 📜 CAPÍTULO 15: REFERENCIA DE FUNCIONES MATEMÁTICAS

*   `azar(min, max)`: Devuelve un número aleatorio.
*   `absoluto(n)`: Convierte un número negativo en positivo.
*   `redondear(n)`: Quita los decimales al número más cercano.
*   `seno(angulo)` / `coseno(angulo)`: Para movimientos circulares.
*   `limitar(valor, min, max)`: Asegura que un número no se pase de ciertos límites.

---

## 🎨 CAPÍTULO 16: INTERACCIÓN CON LA UI MEDIANTE CÓDIGO

### 16.1 Cambiar Texto de un Marcador
```ces
ve motor;
publico Materia puntajeUI;
variable puntos = 0;

alRecibir("SUMAR_PUNTOS", (valor) => {
    puntos += valor;
    puntajeUI.textoContenido = "PUNTOS: " + puntos;
});
```

### 16.2 Controlar una Barra de Vida (ProgressBar)
```ces
ve motor;
publico Materia barraVida;

alActualizar() {
    barraVida.porcentaje = vida.vidaActual / vida.vidaMaxima;
}
```

---

## 🏷️ CAPÍTULO 17: GESTIÓN DE CAPAS Y TAGS

### 17.1 Uso de Tags para Identificación
```ces
alEntrarEnColision(otro) {
    si (otro.tieneTag("Enemigo")) {
        danar(10);
    }
}
```

### 17.2 Cambiar de Capa Dinámicamente
```ces
alPresionarTecla("g") {
    materia.capa = "Ghost";
    opacidad = 0.5;
    esperar(3);
    materia.capa = "Default";
    opacidad = 1.0;
}
```

---

## 📂 CAPÍTULO 18: EL SISTEMA DE PREFABS DESDE CÓDIGO

*   **`instanciar(miPrefab, x, y)`**: Lo crea en un punto específico.

**Ejemplo de Spawn de Enemigos:**
```ces
ve motor;
publico Prefab enemigoPrefab;

alEmpezar() {
    cada(5) {
        variable e = instanciar(enemigoPrefab, azar(-500, 500), 400);
        e.nombre = "Enemigo Clon";
    }
}
```

---

## 🧩 CAPÍTULO 19: ACCESO A OTROS SCRIPTS (COMUNICACIÓN DIRECTA)

```ces
// En Jugador.ces
publico funcion saltar() {
    fisica.applyImpulse(0, 500);
}

// En ControlRemoto.ces
publico Materia jugador;
alClicar() {
    jugador.obtenerScript("Jugador").saltar();
}
```

---

## 🏃 CAPÍTULO 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)

En este capítulo profundizaremos en el género que definió los videojuegos. Un buen plataformas depende de la "sensación" (game feel).

### 20.1 Movimiento Profesional (Con Inercia)
No solo muevas el objeto; dale peso.
```ces
ve motor;
publico numero fuerzaCaminado = 50;
publico numero velocidadMax = 500;
publico numero fuerzaSalto = 800;
variable enSuelo = falso;

alActualizar(delta) {
    variable h = 0;
    si (teclaPresionada("a")) h = -1;
    sino si (teclaPresionada("d")) h = 1;

    // Aplicar fuerza gradualmente
    si (h != 0) {
        fisica.applyForce(h * fuerzaCaminado * 100 * delta, 0);
        voltearH = (h < 0);
        reproducir.Caminar();
    } sino {
        // Frenado por fricción si no hay input
        fisica.velocidadX *= 0.9;
        reproducir.Idle();
    }

    // Limitar velocidad máxima
    si (absoluto(fisica.velocidadX) > velocidadMax / 100) {
        fisica.velocidadX = (velocidadMax / 100) * signo(fisica.velocidadX);
    }

    // Salto con Coyote Time (Tiempo de gracia)
    si (teclaRecienPresionada("Space") y enSuelo) {
        fisica.applyImpulse(0, -fuerzaSalto);
        reproducir.Salto();
    }
}

alChocar(otro) {
    si (otro.y > y + 20) { // Si el objeto está debajo
        enSuelo = verdadero;
    }
}

alSalirDeColision() {
    enSuelo = falso;
}
```

### 20.2 Doble Salto y Salto en Pared (Wall Jump)
```ces
ve motor;
variable saltosRestantes = 2;
variable tocandoPared = falso;

alActualizar() {
    si (enSuelo) saltosRestantes = 2;

    si (teclaRecienPresionada("Space")) {
        si (saltosRestantes > 0) {
            fisica.setVelocity(fisica.velocidadX, -15);
            saltosRestantes -= 1;
        } sino si (tocandoPared) {
            // Salto impulsado desde la pared
            fisica.applyImpulse(voltearH ? 10 : -10, -15);
        }
    }
}

alEntrarEnColision(otro) {
    si (otro.tieneTag("Pared")) tocandoPared = verdadero;
}
```

### 20.3 Plataformas Móviles y Deslizantes
```ces
ve motor;
publico numero velocidad = 200;
publico numero limiteX = 400;
variable inicioX;
variable dir = 1;

alEmpezar() { inicioX = x; }

alActualizar(delta) {
    x += velocidad * dir * delta;
    si (absoluto(x - inicioX) > limiteX) dir *= -1;
}

// Hacer que el jugador se mueva con la plataforma
alEntrarEnColision(otro) {
    si (otro.tieneTag("Player")) {
        otro.materia.setParent(materia);
    }
}

alSalirDeColision(otro) {
    si (otro.tieneTag("Player")) {
        otro.materia.setParent(nulo);
    }
}
```

---

## 🗡️ CAPÍTULO 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)

Los RPG requieren gestión de estadísticas, inventarios y estados persistentes.

### 21.1 Sistema de Atributos y Experiencia (XP)
```ces
ve motor;
publico numero nivel = 1;
publico numero xpActual = 0;
publico numero xpSiguienteNivel = 100;

publico funcion ganarXP(cantidad) {
    xpActual += cantidad;
    imprimir("¡Ganaste " + cantidad + " de experiencia!");

    si (xpActual >= xpSiguienteNivel) {
        subirNivel();
    }
}

funcion subirNivel() {
    nivel += 1;
    xpActual -= xpSiguienteNivel;
    xpSiguienteNivel = redondear(xpSiguienteNivel * 1.5);
    vida.vidaMaxima += 20;
    vida.curar(20);
    imprimir("¡SUBISTE AL NIVEL " + nivel + "!");
    difundir("UPDATE_UI_STATS");
}
```

### 21.2 Sistema de Inventario de Datos (Data-Oriented)
```ces
ve motor;
variable items = []; // Lista de nombres de items

publico funcion agregarItem(nombre) {
    si (items.length < 10) {
        items.push(nombre);
        imprimir("Obtenido: " + nombre);
        retornar verdadero;
    }
    imprimir("Inventario lleno");
    retornar falso;
}

publico funcion tieneItem(nombre) {
    retornar items.includes(nombre);
}
```

### 21.3 Guardado y Carga Permanente (LocalStorage)
Creative Engine permite usar la persistencia del navegador.
```ces
ve motor;

publico funcion guardarPartida() {
    variable datos = {
        lvl: nivel,
        pos: { x: x, y: y },
        inv: items
    };
    // Guardar en el disco del navegador
    almacenar("PARTIDA_01", datos);
    imprimir("Juego guardado");
}

publico funcion cargarPartida() {
    variable datos = recuperar("PARTIDA_01");
    si (datos) {
        nivel = datos.lvl;
        x = datos.pos.x;
        y = datos.pos.y;
        items = datos.inv;
        imprimir("Juego cargado");
    }
}
```

---

## 🛡️ CAPÍTULO 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)

El movimiento en 8 direcciones y el combate multidireccional son clave aquí.

### 22.1 Movimiento en 8 Direcciones con Animación
```ces
ve motor;
publico numero velocidad = 300;
variable movX = 0;
variable movY = 0;

alActualizar(delta) {
    movX = 0; movY = 0;

    si (teclaPresionada("a")) movX = -1;
    si (teclaPresionada("d")) movX = 1;
    si (teclaPresionada("w")) movY = -1;
    si (teclaPresionada("s")) movY = 1;

    // Normalizar para que el movimiento diagonal no sea más rápido
    si (movX != 0 y movY != 0) {
        movX *= 0.707;
        movY *= 0.707;
    }

    x += movX * velocidad * delta;
    y += movY * velocidad * delta;

    // Actualizar animaciones según dirección
    si (movY < 0) reproducir.CaminarArriba();
    sino si (movY > 0) reproducir.CaminarAbajo();
    sino si (movX != 0) {
        reproducir.CaminarLado();
        voltearH = (movX < 0);
    } sino {
        reproducir.Idle();
    }
}
```

### 22.2 Sistema de Proyectiles (Disparo en 360°)
```ces
ve motor;
publico Prefab flechaPrefab;
publico numero fuerzaFlecha = 800;

alActualizar() {
    si (teclaRecienPresionada("f")) {
        variable ratonPos = obtenerPosicionMouse();
        variable flecha = instanciar(flechaPrefab, x, y);

        // Calcular dirección hacia el mouse
        variable dx = ratonPos.x - x;
        variable dy = ratonPos.y - y;
        variable dist = distancia(x, y, ratonPos.x, ratonPos.y);

        flecha.fisica.applyImpulse((dx / dist) * fuerzaFlecha, (dy / dist) * fuerzaFlecha);
        flecha.rotacion = calcularAngulo(x, y, ratonPos.x, ratonPos.y);
    }
}
```

---

## 🧩 CAPÍTULO 23: MECÁNICAS DE PUZZLE Y LÓGICA

Los juegos de puzzle dependen de disparadores, estados lógicos y manipulación de objetos.

### 23.1 Sistema de Botón y Puerta
```ces
// En Boton.ces
ve motor;
publico Materia puerta;
variable activado = falso;

alEntrarEnColision(otro) {
    si (otro.tieneTag("Player") o otro.tieneTag("Caja")) {
        activado = verdadero;
        color = "#ff0000";
        puerta.obtenerScript("Puerta").abrir();
    }
}

alSalirDeColision(otro) {
    activado = falso;
    color = "#ffffff";
    puerta.obtenerScript("Puerta").cerrar();
}

// En Puerta.ces
ve motor;
variable abierta = falso;
variable inicioY;

alEmpezar() { inicioY = y; }

publico funcion abrir() { abierta = verdadero; }
publico funcion cerrar() { abierta = falso; }

alActualizar(delta) {
    variable targetY = abierta ? inicioY - 200 : inicioY;
    y += (targetY - y) * 5 * delta;
}
```

### 23.2 Inventario de Llaves y Cerraduras
```ces
// En Llave.ces
ve motor;
publico texto colorLlave = "Rojo";

alEntrarEnTrigger(otro) {
    si (otro.tieneTag("Player")) {
        otro.obtenerScript("Jugador").recogerLlave(colorLlave);
        destruir(materia);
    }
}

// En Cerradura.ces
ve motor;
publico texto colorRequerido = "Rojo";

alEntrarEnColision(otro) {
    si (otro.tieneTag("Player")) {
        si (otro.obtenerScript("Jugador").tieneLlave(colorRequerido)) {
            destruir(materia); // La cerradura desaparece
            imprimir("Cerradura abierta");
        } sino {
            imprimir("Necesitas la llave " + colorRequerido);
        }
    }
}
```

---

## 🤖 CAPÍTULO 24: INTELIGENCIA ARTIFICIAL AVANZADA

Crea enemigos que no solo se muevan, sino que "piensen" y reaccionen.

### 24.1 IA de Sigilo (Detección por Cono de Visión)
```ces
ve motor;
publico Materia jugador;
publico numero rangoVision = 400;
publico numero anguloVision = 45;

alActualizar(delta) {
    si (!jugador) retornar;

    variable dist = distancia(x, y, jugador.x, jugador.y);

    si (dist < rangoVision) {
        variable anguloAlJugador = calcularAngulo(x, y, jugador.x, jugador.y);
        variable diferenciaAngulo = absoluto(anguloAlJugador - rotacion);

        si (diferenciaAngulo < anguloVision) {
            // ¡Te vi!
            perseguirJugador(delta);
        } sino {
            patrullar(delta);
        }
    } sino {
        patrullar(delta);
    }
}

funcion perseguirJugador(delta) {
    mirarA(jugador.x, jugador.y);
    moverHacia(jugador.x, jugador.y, 200 * delta);
    color = "#ff0000";
}

funcion patrullar(delta) {
    color = "#ffffff";
    // Lógica de patrulla aquí...
}
```

### 24.2 Jefe Final con Fases (Máquina de Estados)
```ces
ve motor;
variable fase = 1;
variable cronometro = 0;

alActualizar(delta) {
    cronometro += delta;

    si (fase == 1) {
        faseDeDisparo();
        si (vida.vidaActual < 500) fase = 2;
    }
    sino si (fase == 2) {
        faseDeEmbestida();
        si (vida.vidaActual < 100) fase = 3;
    }
}

funcion faseDeDisparo() {
    si (cronometro > 1) {
        lanzarProyectil();
        cronometro = 0;
    }
}

funcion faseDeEmbestida() {
    // Código para que el jefe cargue contra el jugador a gran velocidad
}
```

---

## 🎒 CAPÍTULO 25: SISTEMAS DE INVENTARIO Y OBJETOS

### 25.1 Objeto Consumible (Poción de Vida)
```ces
ve motor;
publico numero curacion = 50;

alEntrarEnTrigger(otro) {
    si (otro.tieneTag("Player")) {
        otro.vida.curar(curacion);
        imprimir("Vida recuperada");
        destruir(materia);
    }
}
```

### 25.2 Equipamiento de Armas (Cambio de Sprite y Daño)
```ces
ve motor;
publico Sprite spriteEspadaMera;
publico numero danoMadera = 10;
publico Sprite spriteEspadaFuego;
publico numero danoFuego = 50;

variable danoActual = 10;

publico funcion equiparFuego() {
    renderizadorDeSprite.sprite = spriteEspadaFuego;
    danoActual = danoFuego;
    imprimir("¡Espada de Fuego equipada!");
}
```

---

## 💬 CAPÍTULO 26: DIÁLOGOS Y NARRATIVA

### 26.1 Sistema de Diálogo por Proximidad
```ces
ve motor;
publico texto[] frases = [
    "Hola viajero...",
    "¿Has visto mis vacas?",
    "Dicen que hay un tesoro en el bosque."
];
variable indiceActual = 0;
publico Materia globoTexto;

alEntrarEnTrigger(otro) {
    si (otro.tieneTag("Player")) {
        globoTexto.estaActivado = verdadero;
        mostrarSiguienteFrase();
    }
}

alSalirDeTrigger(otro) {
    si (otro.tieneTag("Player")) {
        globoTexto.estaActivado = falso;
        indiceActual = 0;
    }
}

funcion mostrarSiguienteFrase() {
    globoTexto.texto.textoContenido = frases[indiceActual];
    indiceActual = (indiceActual + 1) % frases.length;
}
```

---

## ✨ CAPÍTULO 27: EFECTOS VISUALES (CÓDIGO ESTÉTICO)

### 27.1 Pantalla de Sacudida (Screen Shake)
Pon este script en la **Cámara**.
```ces
ve motor;
variable tiempoSacudida = 0;
variable intensidad = 0;
variable originalPos;

alEmpezar() { originalPos = { x: x, y: y }; }

publico funcion sacudir(duracion, fuerza) {
    tiempoSacudida = duracion;
    intensidad = fuerza;
}

alActualizar(delta) {
    si (tiempoSacudida > 0) {
        x = originalPos.x + azar(-intensidad, intensidad);
        y = originalPos.y + azar(-intensidad, intensidad);
        tiempoSacudida -= delta;
    } sino {
        x = originalPos.x;
        y = originalPos.y;
    }
}
```

### 27.2 Flash de Daño (Hit Flash)
```ces
ve motor;
publico funcion parpadear() {
    color = "#ff0000"; // Rojo
    esperar(0.1);
    color = "#ffffff"; // Blanco original
    esperar(0.1);
    color = "#ff0000";
    esperar(0.1);
    color = "#ffffff";
}
```

---

## 🏗️ CAPÍTULO 28: FÍSICAS EXPERIMENTALES POR CÓDIGO

### 28.1 Sistema de Gravedad Inversa (Botas Magnéticas)
```ces
ve motor;
variable gravedadInvertida = falso;

alActualizar() {
    si (teclaRecienPresionada("g")) {
        gravedadInvertida = !gravedadInvertida;
        fisica.escalaGravedad = gravedadInvertida ? -1 : 1;
        voltearV = gravedadInvertida; // Girar el sprite
    }
}
```

### 28.2 Gancho de Agarre (Grappling Hook)
```ces
ve motor;
publico Materia anclaje;
variable enganchado = falso;

alActualizar(delta) {
    si (teclaRecienPresionada("e")) {
        variable hit = lanzarRayo(posicion, obtenerDireccionRaton(), 500);
        si (hit y hit.materia.tieneTag("Anclaje")) {
            anclaje = hit.materia;
            enganchado = verdadero;
            fisica.escalaGravedad = 0;
        }
    }

    si (enganchado y teclaPresionada("e")) {
        // Tirar hacia el anclaje
        variable dx = anclaje.x - x;
        variable dy = anclaje.y - y;
        fisica.applyForce(dx * 10, dy * 10);
    } sino {
        enganchado = falso;
        fisica.escalaGravedad = 1;
    }
}
```

---

## 👥 CAPÍTULO 29: MULTIJUGADOR LOCAL (COOPERATIVO)

### 29.1 Configuración de Controles Independientes
```ces
ve motor;
publico numero jugadorID = 1; // 1 para P1, 2 para P2
variable teclas = { up: "w", down: "s", left: "a", right: "d" };

alEmpezar() {
    si (jugadorID == 2) {
        teclas = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
    }
}

alActualizar(delta) {
    si (teclaPresionada(teclas.up)) y -= 300 * delta;
    si (teclaPresionada(teclas.down)) y += 300 * delta;
    si (teclaPresionada(teclas.left)) x -= 300 * delta;
    si (teclaPresionada(teclas.right)) x += 300 * delta;
}
```

---

## 🧊 CAPÍTULO 30: GENERACIÓN PROCEDURAL (MUNDOS INFINITOS)

### 30.1 Generador de Mazmorras Aleatorias
```ces
ve motor;
publico Prefab salaPrefab;
publico numero maxSalas = 10;
variable salasCreadas = 0;
variable ultimaPos = { x: 0, y: 0 };

alEmpezar() {
    generarMazmorra();
}

funcion generarMazmorra() {
    mientras (salasCreadas < maxSalas) {
        variable dir = redondear(azar(0, 3)); // 0: N, 1: E, 2: S, 3: O

        si (dir == 0) ultimaPos.y -= 400;
        sino si (dir == 1) ultimaPos.x += 400;
        sino si (dir == 2) ultimaPos.y += 400;
        sino ultimaPos.x -= 400;

        instanciar(salaPrefab, ultimaPos.x, ultimaPos.y);
        salasCreadas += 1;
        esperar(0.1); // Pequeña pausa visual
    }
    imprimir("Mazmorra generada con " + salasCreadas + " salas.");
}
```

---

## 🌊 CAPÍTULO 31: MECÁNICAS DE AGUA Y FLOTACIÓN

### 31.1 Buoyancy (Flotación Física)
Script para objetos que caen al agua.
```ces
ve motor;
variable estaEnAgua = falso;
publico numero fuerzaFlotacion = 15;

alEntrarEnTrigger(otro) {
    si (otro.tieneTag("Agua")) estaEnAgua = verdadero;
}

alSalirDeTrigger(otro) {
    si (otro.tieneTag("Agua")) estaEnAgua = falso;
}

alActualizar(delta) {
    si (estaEnAgua) {
        // Aplicar fuerza hacia arriba para contrarrestar gravedad
        fisica.applyForce(0, -fuerzaFlotacion * 100 * delta);
        fisica.velocidadX *= 0.95; // Resistencia del agua
        fisica.velocidadY *= 0.95;
    }
}
```

---

## 🔫 CAPÍTULO 32: SISTEMA DE ARMAS DE FUEGO (SHOOTER)

### 32.1 Retroceso y Dispersión
```ces
ve motor;
publico numero retroceso = 20;
publico numero dispersion = 5;

publico funcion disparar() {
    variable angulo = rotacion + azar(-dispersion, dispersion);
    variable bala = instanciar(balaPrefab, x, y);
    bala.rotacion = angulo;

    // Empujar al jugador hacia atrás (retroceso)
    variable rad = rotacion * (3.14 / 180);
    fisica.applyImpulse(-coseno(rad) * retroceso, -seno(rad) * retroceso);

    reproducir.Disparo();
}
```

---

## 🏁 CAPÍTULO 33: SISTEMA DE CARRERAS Y CHECKPOINTS

### 33.1 Cronómetro y Mejor Tiempo
```ces
ve motor;
variable tiempoActual = 0;
variable mejorTiempo = 9999;
variable carreraActiva = falso;

publico funcion empezarCarrera() {
    tiempoActual = 0;
    carreraActiva = verdadero;
}

publico funcion metaAlcanzada() {
    carreraActiva = falso;
    si (tiempoActual < mejorTiempo) {
        mejorTiempo = tiempoActual;
        imprimir("¡NUEVO RÉCORD: " + mejorTiempo + "!");
    }
}

alActualizar(delta) {
    si (carreraActiva) tiempoActual += delta;
}
```

---

## 🌑 CAPÍTULO 34: LÓGICA DE DÍA Y NOCHE

### 34.1 Ciclo de Luz Global
Pon esto en un objeto controlador o en la luz global.
```ces
ve motor;
publico Materia luzGlobal;
variable tiempoDia = 0;
publico numero duracionCiclo = 60; // 1 minuto por día

alActualizar(delta) {
    tiempoDia += delta;
    variable progreso = (tiempoDia % duracionCiclo) / duracionCiclo;

    // 0.0 es mediodía, 0.5 es medianoche
    variable intensidad = coseno(progreso * 3.14 * 2) * 0.5 + 0.5;
    luzGlobal.luz.intensidad = intensidad;

    // Cambiar color a tonos naranjas al atardecer
    si (progreso > 0.4 y progreso < 0.6) {
        luzGlobal.luz.color = "#ffaa44";
    } sino {
        luzGlobal.luz.color = "#ffffff";
    }
}
```

---

## 🚗 CAPÍTULO 35: CONTROLADOR DE VEHÍCULO ARCADE (TOP-DOWN)

### 35.1 Tracción y Derrape
```ces
ve motor;
publico numero potencia = 500;
publico numero velocidadGiro = 200;
variable vActual = 0;

alActualizar(delta) {
    // Aceleración
    si (teclaPresionada("w")) vActual += potencia * delta;
    si (teclaPresionada("s")) vActual -= (potencia / 2) * delta;

    vActual *= 0.98; // Rozamiento

    // Giro
    si (teclaPresionada("a")) rotacion -= velocidadGiro * (vActual / 500) * delta;
    si (teclaPresionada("d")) rotacion += velocidadGiro * (vActual / 500) * delta;

    // Mover en la dirección que mira el coche
    variable rad = rotacion * (3.14 / 180);
    x += coseno(rad) * vActual * delta;
    y += seno(rad) * vActual * delta;
}
```

---

## 🏢 CAPÍTULO 36: SISTEMA DE CONSTRUCCIÓN (TYCOON/CITY BUILDER)

### 36.1 Colocación de Edificios en Rejilla (Grid Snapping)
```ces
ve motor;
publico Prefab casaPrefab;
publico numero tamanoRejilla = 64;

alActualizar() {
    variable raton = obtenerPosicionMouse();

    // Snapping (Ajuste a la rejilla)
    variable gridX = redondear(raton.x / tamanoRejilla) * tamanoRejilla;
    variable gridY = redondear(raton.y / tamanoRejilla) * tamanoRejilla;

    // Previsualización (Mover este objeto a la rejilla)
    x = gridX;
    y = gridY;

    si (teclaRecienPresionada("Mouse0")) {
        si (dinero >= 100) {
            instanciar(casaPrefab, gridX, gridY);
            dinero -= 100;
            imprimir("Casa construida");
        }
    }
}
```

---

## 🧪 CAPÍTULO 37: EFECTOS DE ESTADO (POISON, BURN, SPEED)

### 37.1 Sistema de Debuffs Temporales
```ces
ve motor;

publico funcion aplicarVeneno(duracion, danoPorSegundo) {
    cada(1) {
        si (duracion > 0) {
            vida.danar(danoPorSegundo);
            duracion -= 1;
            color = "#00ff00"; // Tinte verde
        } sino {
            color = "#ffffff";
            detenerBucle();
        }
    }
}
```

---

## 🎥 CAPÍTULO 38: CINEMÁTICAS POR CÓDIGO (CUTSCENES)

### 38.1 Secuencia de Eventos Controlada
```ces
ve motor;
publico Materia actorJugador;
publico Materia actorNpc;

publico funcion iniciarEscena() {
    // 1. Bloquear control del jugador
    actorJugador.obtenerScript("Control").desactivar();

    // 2. Mover NPC hacia el jugador
    actorNpc.obtenerScript("Movimiento").caminarA(actorJugador.x + 100, actorJugador.y);

    esperar(2);

    // 3. Mostrar diálogo
    actorNpc.obtenerScript("Dialogo").decir("¡Te estaba buscando!");

    esperar(3);

    // 4. Devolver el control
    actorJugador.obtenerScript("Control").activar();
}
```

---

## 🧬 CAPÍTULO 39: LÓGICA DE PUZZLES TIPO "MATCH-3"

### 39.1 Detección de Adyacencia y Color
```ces
ve motor;
publico texto tipoColor = "Rojo";

publico funcion comprobarMatch() {
    variable vecinos = [
        obtenerObjetoEn(x + 64, y), // Derecha
        obtenerObjetoEn(x - 64, y), // Izquierda
        obtenerObjetoEn(x, y + 64), // Abajo
        obtenerObjetoEn(x, y - 64)  // Arriba
    ];

    variable contador = 1;
    para cada (v en vecinos) {
        si (v y v.obtenerScript("Gema").tipoColor == tipoColor) {
            contador += 1;
        }
    }

    si (contador >= 3) {
        difundir("EXPLOTAR_COLOR", tipoColor);
    }
}
```

---

## 💾 CAPÍTULO 40: GESTOR DE ESCENAS AVANZADO

### 40.1 Pantalla de Carga y Transiciones
```ces
ve motor;
publico Materia panelNegro;

publico funcion viajarANivel(nombreEscena) {
    // 1. Fade Out (Desvanecer a negro)
    panelNegro.estaActivado = verdadero;
    panelNegro.imagen.animarOpacidad(1, 1); // De 0 a 1 en 1 seg

    esperar(1.1);

    // 2. Cargar escena
    cargarEscena(nombreEscena);
}
```

---

## 🛡️ CAPÍTULO 41: SISTEMA DE ESCUDO Y PARRI (COMBATE)

### 41.1 Mecánica de Bloqueo con Tiempo Justo
```ces
ve motor;
variable bloqueando = falso;
variable ventanaParry = 0;

alActualizar(delta) {
    si (teclaRecienPresionada("q")) {
        bloqueando = verdadero;
        ventanaParry = 0.2; // 200ms para hacer parry
        reproducir.Bloquear();
    }

    si (teclaLiberada("q")) bloqueando = falso;

    si (ventanaParry > 0) ventanaParry -= delta;
}

publico funcion recibirGolpe(dano) {
    si (ventanaParry > 0) {
        imprimir("¡PARRY! No recibes daño y el enemigo se aturde.");
        difundir("ATURDIR_ENEMIGO_CERCANO");
        reproducir.ParryEfecto();
    } sino si (bloqueando) {
        vida.danar(dano * 0.2); // Daño reducido al 20%
        imprimir("Ataque bloqueado.");
    } sino {
        vida.danar(dano);
    }
}
```

---

## 🔭 CAPÍTULO 42: MINIJUEGOS DENTRO DEL JUEGO

### 42.1 Ganzúa / Lockpicking
```ces
ve motor;
publico numero anguloCorrecto = 45;
variable anguloGanzua = 0;

alActualizar() {
    // Mover la ganzúa con el mouse
    variable raton = obtenerPosicionMouse();
    anguloGanzua = calcularAngulo(x, y, raton.x, raton.y);
    rotacion = anguloGanzua;

    si (teclaRecienPresionada("Mouse0")) {
        si (absoluto(anguloGanzua - anguloCorrecto) < 5) {
            imprimir("¡Cerradura abierta!");
            difundir("PUERTA_DESBLOQUEADA");
        } sino {
            imprimir("La ganzúa se ha roto.");
            destruir(materia);
        }
    }
}
```

---

## 🎒 CAPÍTULO 43: SISTEMA DE CRAFTEO (COMBINACIÓN)

### 43.1 Recetas de Alquimia
```ces
ve motor;
variable ingredientes = [];

publico funcion añadirIngrediente(nombre) {
    ingredientes.push(nombre);
    si (ingredientes.length == 2) {
        combinar();
    }
}

funcion combinar() {
    si (ingredientes.includes("Hierba") y ingredientes.includes("Frasco")) {
        imprimir("Has creado: Poción de Vida");
        instanciar(pocionPrefab, x, y);
    } sino {
        imprimir("Combinación fallida, solo salió basura.");
    }
    ingredientes = []; // Vaciar caldero
}
```

---

## 🧗 CAPÍTULO 44: ESCALADA Y PARKOUR

### 44.1 Detección de Salientes (Ledge Grab)
```ces
ve motor;
variable colgando = falso;

alActualizar() {
    si (!colgando) {
        // Lanzar rayo hacia adelante para buscar bordes
        variable hit = lanzarRayo(posicion, {x: voltearH ? -1 : 1, y: 0}, 30);
        si (hit y hit.materia.tieneTag("Borde")) {
            colgando = verdadero;
            fisica.escalaGravedad = 0;
            fisica.setVelocity(0, 0);
            reproducir.Colgar();
        }
    } sino {
        si (teclaRecienPresionada("w")) {
            // Subir al saliente
            fisica.applyImpulse(0, -600);
            colgando = falso;
            fisica.escalaGravedad = 1;
        }
    }
}
```

---

## 👻 CAPÍTULO 45: IA COOPERATIVA (COMPAÑERO NPC)

### 45.1 Seguir al Jugador manteniendo distancia
```ces
ve motor;
publico Materia lider;
publico numero distanciaDeseada = 100;

alActualizar(delta) {
    variable d = distancia(x, y, lider.x, lider.y);

    si (d > distanciaDeseada) {
        moverHacia(lider.x, lider.y, 250 * delta);
        reproducir.Caminar();
    } sino {
        reproducir.Idle();
    }

    voltearH = (lider.x < x);
}
```

---

## ⛈️ CAPÍTULO 46: SISTEMA DE CLIMA DINÁMICO

### 46.1 Generador de Lluvia y Rayos
```ces
ve motor;
publico Prefab gotaPrefab;
variable lloviendo = verdadero;

alEmpezar() {
    cada(0.05) {
        si (lloviendo) {
            instanciar(gotaPrefab, azar(x - 1000, x + 1000), y - 600);
        }
    }

    cada(10) {
        si (lloviendo) {
            lanzarRayoVisual();
        }
    }
}

funcion lanzarRayoVisual() {
    imprimir("¡TRUENO!");
    difundir("FLASH_BLANCO");
    reproducirSonido("trueno.mp3");
}
```

---

## 🧩 CAPÍTULO 47: LÓGICA DE JUEGOS DE CARTAS

### 47.1 Robar y Jugar Carta
```ces
ve motor;
variable mazo = ["Espada", "Escudo", "Fuego", "Curar"];
variable mano = [];

publico funcion robarCarta() {
    si (mazo.length > 0) {
        variable c = mazo.pop();
        mano.push(c);
        actualizarManoUI();
    }
}

publico funcion jugarCarta(indice) {
    variable carta = mano[indice];
    si (carta == "Fuego") dispararBolasFuego();
    mano.splice(indice, 1);
    actualizarManoUI();
}
```

---

## 📈 CAPÍTULO 48: OPTIMIZACIÓN MASIVA (OBJECT POOLING)

### 48.1 Pool de Proyectiles para Bullet Hell
Evita lag al crear y destruir miles de balas.
```ces
ve motor;
publico Prefab balaPrefab;
variable pool = [];

alEmpezar() {
    // Pre-crear 100 balas y desactivarlas
    para (variable i = 0; i < 100; i++) {
        variable b = instanciar(balaPrefab, -1000, -1000);
        b.estaActivado = falso;
        pool.push(b);
    }
}

publico funcion disparar() {
    // Buscar una bala inactiva en el pool
    variable b = pool.find(item => !item.estaActivado);
    si (b) {
        b.x = x; b.y = y;
        b.estaActivado = verdadero;
        b.obtenerScript("Bala").reiniciar();
    }
}
```

---

## 🏁 CAPÍTULO 49: TABLERO DE PUNTUACIONES (LEADERBOARD)

### 49.1 Ranking Local
```ces
ve motor;
variable records = [];

alEmpezar() {
    records = recuperar("HIGH_SCORES") o [];
}

publico funcion registrarPuntaje(nombre, puntos) {
    records.push({ nombre: nombre, score: puntos });
    // Ordenar de mayor a menor
    records.sort((a, b) => b.score - a.score);
    // Mantener solo los 5 mejores
    records = records.slice(0, 5);
    almacenar("HIGH_SCORES", records);
}
```

---

## 🌌 CAPÍTULO 50: VIAJES ESPACIALES (FÍSICA NEWTONIANA)

### 50.1 Inercia Espacial y Propulsores
```ces
ve motor;
publico numero fuerzaMotor = 10;
publico numero agilidadRotacion = 5;

alActualizar(delta) {
    // En el espacio no hay arrastre (drag), la velocidad se mantiene
    si (teclaPresionada("w")) {
        variable rad = rotacion * (3.14 / 180);
        fisica.applyForce(coseno(rad) * fuerzaMotor, seno(rad) * fuerzaMotor);
        reproducir.Propulsores();
    }

    si (teclaPresionada("a")) rotacion -= agilidadRotacion;
    si (teclaPresionada("d")) rotacion += agilidadRotacion;
}
```

---

## 📜 CONCLUSIÓN DEL LIBRO MAESTRO

Has llegado al final de esta enciclopedia de 1000 líneas. Con este conocimiento, no hay género que se te resista. Recuerda que la programación no es solo escribir comandos, es **resolver problemas de forma creativa**.

Usa estos ejemplos como base, mézclalos, rómpelos y crea algo que el mundo nunca haya visto.

*Creative Engine: El código es el pincel con el que pintas las leyes de tu universo.*

---

© 2024 Carley Interactive Studio. Documentación enciclopédica definitiva.
"La verdadera maestría comienza cuando dejas de copiar y empiezas a imaginar".
