# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 400 líneas y cubre desde la lógica natural hasta los alias multilingües más avanzados.

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
9. [Capítulo 9: El Recetario Maestro (Code Recipes)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)

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

**Tip Técnico:** El motor realiza una "Inyección de Dependencias" automática. Si arrastras un objeto que tiene un `SpriteRenderer` a una variable de tipo `Sprite`, el motor extraerá automáticamente el componente correcto.

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
Escribe secuencias temporales como una lista de pasos:
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
Crea "relojes" internos fácilmente:
```ces
alEmpezar() {
    cada(2) {
        imprimir("Han pasado 2 segundos más");
    }
}
```

---

## 🍳 CAPÍTULO 9: EL RECETARIO MAESTRO (CODE RECIPES)

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

### 9.4 Disparo de Proyectiles (Pool Manual)
```ces
ve motor;
publico Prefab balaPrefab;
publico numero fuerza = 20;

alActualizar() {
    si (teclaRecienPresionada("f")) {
        variable bala = instanciar(balaPrefab, x, y);
        bala.fisica.applyImpulse(fuerza, 0);
    }
}
```

### 9.5 Cambio de Escena al Morir
```ces
ve motor;
alActualizar() {
    si (vida.vidaActual <= 0) {
        cargarEscena("Assets/GameOver.ceScene");
    }
}
```

### 9.6 Puerta que pide Llave
```ces
ve motor;
publico texto nombreLlave = "LlaveDorada";
variable tieneLlave = falso;

alRecibir("OBTENER_LLAVE", (nombre) => {
    si (nombre == nombreLlave) tiene Llave = verdadero;
});

alEntrarEnColision(otro) {
    si (otro.tieneTag("Player") y tieneLlave) {
        destruir(materia); // Abre la puerta
    }
}
```

---

## 🧪 CAPÍTULO 10: OPTIMIZACIÓN Y BUENAS PRÁCTICAS

1.  **Cachear Búsquedas:** No uses `buscar("Jugador")` dentro de `alActualizar`. Búscalo una vez en `alEmpezar` y guárdalo en una variable.
2.  **Uso de Delta:** Siempre multiplica tus movimientos por `delta` para que el juego no vaya más rápido en ordenadores potentes.
3.  **Desactivar vs Destruir:** Si vas a crear muchos enemigos iguales, es mejor desactivarlos (`materia.estaActivado = falso`) y volverlos a activar luego que destruirlos y crearlos.
4.  **Capas de Colisión:** Configura la matriz de colisiones para que los objetos que no necesitan tocarse (como nubes y balas) sean ignorados por el motor de física.

---

## 🛠️ CAPÍTULO 11: BAJO EL CAPÓ (TRANSPILACIÓN)

Cuando guardas un script `.ces`, ocurre este proceso en milisegundos:
1.  **Analizador Léxico:** Identifica las palabras clave (`si`, `ve`, `publico`).
2.  **Mapeador de Alias:** Traduce los términos (ej: `fisica` -> `this.getComponent('Rigidbody2D')`).
3.  **Envoltorio de Clase:** Tu código se mete dentro de una clase que hereda de `CreativeScriptBehavior`.
4.  **Generación de JS:** Se crea un archivo de JavaScript puro que el motor carga en la escena.

---

## 📖 CAPÍTULO 12: GLOSARIO DE ALIAS POR IDIOMA

El motor es políglota. Aquí tienes los alias más comunes en los idiomas soportados:

### 🇪🇸 Español (ES)
`vida`, `fisica`, `posicion`, `reproducir`, `imprimir`, `esperar`, `si`, `sino`, `verdadero`, `falso`, `numero`, `texto`, `booleano`, `funcion`, `variable`, `retornar`, `bucle`, `cada`.

### 🇺🇸 Inglés (EN)
`health`, `physics`, `transform`, `play`, `log`, `wait`, `if`, `else`, `true`, `false`, `number`, `string`, `boolean`, `function`, `let`, `return`, `loop`, `every`.

---

## 🔍 CAPÍTULO 13: DEPURACIÓN (DEBUGGING)

Errar es humano, pero corregir es de programadores expertos.

### La Consola del Editor
Todos tus `imprimir("mensaje")` aparecerán aquí. Úsala para saber si una parte de tu código se está ejecutando o para ver el valor de una variable en tiempo real.

### Errores Comunes en CES:
*   **"Variable no definida":** Revisa que hayas declarado tu variable con `variable` o `publico`.
*   **"Error de sintaxis":** Revisa si olvidaste cerrar un paréntesis `)` o una llave `{`.
*   **"No se encuentra el componente":** Estás intentando usar `vida` o `fisica` en un objeto que no tiene esa ley añadida en el Inspector.

### El Auto-Reparador
Si el motor detecta un error común, aparecerá un botón mágico de "Auto Reparar" en la consola. ¡Púlsalo y deja que Carl IA lo arregle por ti!

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

Luego, en tu script CES, puedes importarla y usarla para cálculos complejos que requieran toda la potencia de JavaScript.

---

## 📜 CAPÍTULO 15: REFERENCIA DE FUNCIONES MATEMÁTICAS

Creative Engine incluye una biblioteca matemática simplificada:
*   `azar(min, max)`: Devuelve un número aleatorio.
*   `absoluto(n)`: Convierte un número negativo en positivo.
*   `redondear(n)`: Quita los decimales al número más cercano.
*   `seno(angulo)` / `coseno(angulo)`: Para movimientos circulares o de vaivén.
*   `raizCuadrada(n)`: Cálculo de raíces.
*   `limitar(valor, min, max)`: Asegura que un número no se pase de ciertos límites.

---

## 🎨 CAPÍTULO 16: INTERACCIÓN CON LA UI MEDIANTE CÓDIGO

La Interfaz de Usuario (UI) no es estática; debe responder a la acción del jugador.

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
    // Sincroniza el porcentaje de la barra con la salud real
    barraVida.porcentaje = vida.vidaActual / vida.vidaMaxima;
}
```

### 16.3 Cambiar Imagen en Tiempo Real
```ces
ve motor;
publico Sprite imagenNormal;
publico Sprite imagenDañado;

alRecibir("RECIBIR_DAÑO", () => {
    imagenComponente.sprite = imagenDañado;
    esperar(0.2);
    imagenComponente.sprite = imagenNormal;
});
```

---

## 🏷️ CAPÍTULO 17: GESTIÓN DE CAPAS Y TAGS

Los Tags (Etiquetas) y Layers (Capas) son esenciales para filtrar la lógica y las colisiones.

### 17.1 Uso de Tags para Identificación
```ces
alEntrarEnColision(otro) {
    si (otro.tieneTag("Enemigo")) {
        danar(10);
    } sino si (otro.tieneTag("Poder")) {
        curar(20);
        destruir(otro);
    }
}
```

### 17.2 Cambiar de Capa Dinámicamente
```ces
alPresionarTecla("g") {
    // Cambia a la capa "Fantasma" para atravesar paredes
    materia.capa = "Ghost";
    opacidad = 0.5;
    esperar(3);
    materia.capa = "Default";
    opacidad = 1.0;
}
```

---

## 📂 CAPÍTULO 18: EL SISTEMA DE PREFABS DESDE CÓDIGO

Los Prefabs son "moldes" que puedes guardar en tus Assets para crear copias idénticas en cualquier momento.

*   **`instanciar(miPrefab)`**: Crea el objeto en la posición (0,0).
*   **`instanciar(miPrefab, x, y)`**: Lo crea en un punto específico.
*   **`instanciar(miPrefab, posicionObjeto)`**: Lo crea justo donde está otro objeto.

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

A veces necesitas llamar a una función que tú mismo escribiste en otro archivo.

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

*Creative Engine: El código es el pincel con el que pintas las leyes de tu universo.*

© 2024 Carley Interactive Studio. Documentación enciclopédica para arquitectos de sueños. No dejes de crear lo imposible.
