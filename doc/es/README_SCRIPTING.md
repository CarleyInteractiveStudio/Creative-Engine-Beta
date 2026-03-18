# 📜 Guía Maestra de Scripting (CES) - Creative Engine

Creative Engine utiliza **CES (Creative Engine Script)**, un lenguaje potente basado en JavaScript pero simplificado para creadores de videojuegos. Esta guía te enseñará desde lo básico hasta los sistemas más potentes.

---

## 🚀 Conceptos Fundamentales

### 1. La Importación Obligatoria
Todo script debe empezar con la instrucción para conectar con el motor:
```ces
ve motor;
```

### 2. Acceso Directo (Sin Prefijos)
A diferencia de otros motores, NO necesitas escribir `this.` o `mtr.` para acceder a los componentes de un objeto. Si el objeto tiene un `SpriteRenderer`, simplemente escribe `renderizadorDeSprite`.

---

## 💎 Variables Públicas (Inspector)
Para que una variable aparezca en el Inspector del editor, usa la palabra clave `publico`.

```ces
publico numero velocidad = 5;
publico texto nombreJugador = "Héroe";
publico booleano esInvencible = falso;
publico Materia objetivo; // Aparecerá un cuadro para arrastrar objetos
publico Sprite icono;
publico Audio sonidoSalto;
publico Prefab enemigo;
publico Scene siguienteNivel;
```

---

## ⏱️ Eventos de Ciclo de Vida
Son funciones que el motor llama automáticamente en momentos específicos.

```ces
// Se ejecuta una sola vez cuando el objeto aparece en el juego
alEmpezar() {
    imprimir("¡Hola Mundo!");
}

// Se ejecuta cada frame (aprox. 60 veces por segundo)
alActualizar(delta) {
    // delta es el tiempo transcurrido desde el último frame
}

// Se ejecuta a intervalos fijos (ideal para físicas)
actualizarFijo(delta) {
}

// Se ejecuta al hacer clic sobre el objeto
alHacerClick() {
}
```

---

## ⌨️ Entrada (Input) y Movimiento
Controla tus personajes de forma sencilla.

```ces
alActualizar(delta) {
    // Tecla presionada (mantenida)
    si (teclaPresionada("d")) {
        posicion.x += velocidad;
        voltearH = falso;
    }

    // Tecla recién presionada (un solo pulso)
    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -10));
    }

    // Mouse
    si (botonMouseRecienPresionado(0)) { // 0: Izquierdo, 1: Central, 2: Derecho
        variable posMouse = obtenerPosicionMouse();
        imprimir("Clic en: " + posMouse.x + ", " + posMouse.y);
    }
}
```

---

## 📢 Mensajería Global y Comunicación
Comunica scripts entre sí sin acoplamiento.

```ces
// En el Script del Jugador:
difundir("Victoria", { puntos: 100 });

// En el Script de la Interfaz:
alEmpezar() {
    alRecibir("Victoria", (datos) => {
        imprimir("¡Ganaste con " + datos.puntos + " puntos!");
    });
}
```

---

## 🪄 Funciones Especiales y Proxy

### ⏳ Corrutinas (Esperar)
Pausa la lógica sin detener el juego.
```ces
alEmpezar() {
    esperar(3);
    imprimir("¡Han pasado 3 segundos!");
}
```

### 🔁 Bucles Temporizados (Cada)
```ces
alEmpezar() {
    cada(1.5) {
        imprimir("Generando enemigo...");
        crear enemigoPrefab;
    }
}
```

### 🎭 Proxy de Animación y Sonido
Llama a estados o clips por su nombre directamente:
```ces
reproducir.Caminar(); // En el AnimatorController
play.Jump();          // Alias en inglés
reproducir.Explosion(); // En el AudioSource
```

---

## 🛠️ Utilidades de Motor
- `buscar(nombre)`: Encuentra un objeto en la escena.
- `destruir(materia)`: Elimina un objeto.
- `lanzarRayo(origen, direccion, distancia, tag)`: Raycasting 2D.
- `estaTocandoTag(tag)`: Detección rápida de colisiones.
- `instanciar(original, x, y)`: Clona un objeto existente.
- `crear miPrefab`: Instancia un prefab por su nombre.
