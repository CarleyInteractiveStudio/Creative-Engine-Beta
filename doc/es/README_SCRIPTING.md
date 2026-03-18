# 📜 Guía Maestra de Scripting (CES) - Creative Engine

Creative Engine utiliza **CES (Creative Engine Script)**, un lenguaje potente basado en JavaScript pero simplificado para creadores de videojuegos. Esta guía te enseñará desde lo básico hasta sistemas complejos.

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

## 🤖 Ejemplos Prácticos

### 🎮 Ejemplo 1: Controlador de Personaje Completo
Este script maneja movimiento, salto, animaciones y sonido.

```ces
ve motor;

publico numero velocidad = 300;
publico numero fuerzaSalto = 15;

alActualizar(delta) {
    variable movX = 0;

    si (teclaPresionada("ArrowRight")) {
        movX = 1;
        voltearH = falso;
    } sino si (teclaPresionada("ArrowLeft")) {
        movX = -1;
        voltearH = verdadero;
    }

    // Mover usando el Rigidbody
    fisica.velocity.x = movX * (velocidad * delta);

    // Control de Animaciones vía Proxy
    si (movX != 0) {
        reproducir.Caminar();
    } sino {
        reproducir.Quieto();
    }

    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
        reproducir.Salto(); // Reproduce sonido o animación
    }
}
```

### 👾 Ejemplo 2: NPC con IA y Detección
Un enemigo que sigue al jugador si lo ve.

```ces
ve motor;

publico Materia jugador;
publico numero distanciaDeteccion = 400;

alActualizar(delta) {
    si (jugador == nulo) {
        jugador = buscar("Jugador");
        retornar;
    }

    variable dist = distancia(posicion, jugador.posicion);

    si (dist < distanciaDeteccion) {
        // Mirar hacia el jugador
        si (jugador.posicion.x > posicion.x) {
            posicion.x += 2;
            voltearH = falso;
        } sino {
            posicion.x -= 2;
            voltearH = verdadero;
        }
        reproducir.Correr();
    } sino {
        reproducir.Quieto();
    }
}
```

### 🏹 Ejemplo 3: Sistema de Combate (Disparo)
Lanzar un proyectil y detectar colisiones.

```ces
ve motor;

publico Prefab balaPrefab;

alActualizar(delta) {
    si (teclaRecienPresionada("f")) {
        // Crear la bala en nuestra posición
        variable bala = crear balaPrefab;

        // Darle velocidad inicial
        variable dir = voltearH ? -1 : 1;
        bala.fisica.velocity.x = 20 * dir;
    }
}

// Este evento se dispara si algo choca con nosotros
alEntrarEnColision(otro) {
    si (otro.tieneTag("Enemigo")) {
        imprimir("¡Impacto!");
        destruir(otro); // Destruye al enemigo
        destruir(materia); // Se destruye la bala (este objeto)
    }
}
```

### 💰 Ejemplo 4: Interfaz de Usuario (Puntos)
Actualizar texto y reaccionar a botones.

```ces
ve motor;

variable puntos = 0;

// Se puede llamar desde otros scripts usando enviarMensaje o directamente
sumarPunto() {
    puntos += 1;
    textoUI.text = "Score: " + puntos;
}

alRecibir("MonedaRecogida", (datos) => {
    sumarPunto();
});
```

---

## 🪄 Funciones Especiales de Creative Engine

### ⏳ Corrutinas (Esperar)
Permite pausar la lógica de un script sin congelar el juego.
```ces
alEmpezar() {
    imprimir("Iniciando cuenta atrás...");
    esperar(3);
    imprimir("¡YA!");
}
```

### 🔁 Bucles Temporizados (Cada)
Ejecuta algo repetidamente cada X segundos.
```ces
alEmpezar() {
    cada(1.5) {
        imprimir("Ha pasado un segundo y medio");
        // Ideal para spawnear enemigos o regenerar vida
    }
}
```

### 📢 Mensajería Global
Comunica scripts entre sí de forma limpia.
```ces
// En Script A:
difundir("Victoria", { nivel: 1 });

// En Script B:
alRecibir("Victoria", (datos) => {
    imprimir("Ganaste el nivel " + datos.nivel);
});
```
