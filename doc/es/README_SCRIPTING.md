# 📜 Guía Maestra de Scripting (CES) - Creative Engine

¡Bienvenido a la frontera de la creación! En **Creative Engine**, el scripting no es un obstáculo, sino tu superpoder. El lenguaje **CES (Creative Engine Script)** ha sido diseñado para ser intuitivo, potente y, sobre todo, **más sencillo de lo que imaginas**.

Esta guía te llevará de la mano desde tu primer "¡Hola Mundo!" hasta sistemas complejos de nivel profesional. ¡Prepárate para dar vida a tus ideas!

---

## 🚀 1. Tu Primer Paso: La Conexión con el Motor

Todo gran proyecto comienza con una simple línea. En CES, le decimos al script que debe conectarse a las funciones vitales del motor:

```ces
ve motor;
```
*Tip: También puedes usar `go motor;` si prefieres un tono más dinámico. ¡Tú eliges!*

### ¿Por qué CES es diferente?
A diferencia de otros motores donde tienes que escribir `this.transform.position.x`, en Creative Engine eliminamos la burocracia:
- **Sin `this.`**: Accedes a las propiedades del objeto directamente.
- **Sin prefijos complejos**: Si tu objeto tiene un componente `Vida`, simplemente escribe `vida.valor = 100`.
- **Bilingüe**: ¿Prefieres `posicion` o `position`? ¡El motor entiende ambos!

---

## 💎 2. Variables Públicas: El Inspector es tu Amigo

Las variables públicas permiten que tú (o tus diseñadores) ajusten valores directamente desde el editor sin tocar el código.

```ces
publico numero velocidad = 5;
publico texto mensaje = "¡Cuidado!";
publico booleano esHeroe = verdadero;
publico Materia objetivo;        // Arrastra cualquier objeto aquí
publico Sprite icono;           // Elige una imagen
publico Audio sonidoExplosion;  // Elige un sonido
publico Prefab balaPrefab;      // Un objeto reutilizable
publico Scene siguienteNivel;   // Una escena completa
```

---

## ⏱️ 3. El Ciclo de Vida: El Latido de tu Juego

Tu script responde a eventos automáticos que ocurren en momentos clave:

- **`alEmpezar()`**: Se ejecuta una sola vez cuando el objeto nace. Ideal para configurar valores iniciales.
- **`alActualizar(delta)`**: El corazón del script. Se ejecuta cada frame. `delta` es el tiempo exacto entre frames, úsalo para que el movimiento sea suave.
- **`actualizarFijo(delta)`**: Ideal para físicas pesadas. Se ejecuta a intervalos constantes.
- **`alHacerClick()`**: Se activa cuando el usuario toca o hace clic en el objeto.

---

## ⌨️ 4. Control de Entrada (Input) y Movimiento

Mover un personaje es tan natural como hablar:

```ces
alActualizar(delta) {
    // Movimiento Horizontal Simple
    si (teclaPresionada("d")) {
        posicion.x += velocidad * delta;
        voltearH = falso; // Mira a la derecha
    }
    si (teclaPresionada("a")) {
        posicion.x -= velocidad * delta;
        voltearH = verdadero; // Mira a la izquierda
    }

    // Salto con un solo toque
    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -12));
        reproducir.Salto(); // ¡Llama a la animación "Salto" al instante!
    }
}
```

---

## 📦 5. Referencia de Componentes (Modo Experto)

El motor crea automáticamente accesos rápidos a todos los componentes del objeto. Aquí tienes la lista maestra:

| Componente | Acceso (Alias) | Funciones Clave |
| :--- | :--- | :--- |
| **Transform** | `posicion`, `transformacion` | `x`, `y`, `rotacion`, `escala`, `mirarA(x,y)` |
| **Rigidbody2D** | `fisica` | `applyForce(x,y)`, `applyImpulse(x,y)`, `velocity` |
| **SpriteRenderer**| `renderizadorDeSprite` | `color`, `opacity`, `spriteName` |
| **Animator** | `animador`, `animacion` | `play(nombre)`, `stop()`, `crossfade(nombre, tiempo)` |
| **Health** | `vida`, `salud` | `damage(cantidad)`, `heal(cantidad)`, `isDead` |
| **AudioSource** | `sonido`, `audio` | `play()`, `stop()`, `volumen`, `bucle` |
| **Attack** | `ataque` | `executeAttack(atk)`, `cooldown` |
| **ProgressBar** | `barra`, `uiBarra` | `value`, `maxValue`, `materiaObjetivo` |

---

## 📡 6. Comunicación: Mensajería Global

¿Quieres que todos los enemigos mueran cuando el jefe es derrotado? No busques referencias complejas, usa **Mensajes**.

**En el Jefe:**
```ces
alMorir() {
    difundir("JefeDerrotado", { bonus: 500 });
}
```

**En cualquier otro script:**
```ces
alEmpezar() {
    alRecibir("JefeDerrotado", (datos) => {
        imprimir("¡Victoria! Bonus: " + datos.bonus);
        destruir(mtr); // El objeto se auto-destruye
    });
}
```

---

## 🪄 7. Funciones Mágicas y Corrutinas

### ⏳ Corrutinas (`esperar`)
Pausa la ejecución sin detener el juego. Perfecto para secuencias:
```ces
async alEmpezar() {
    imprimir("Iniciando secuencia...");
    esperar(2);
    imprimir("¡Han pasado 2 segundos!");
    reproducir.Explosion();
}
```

### 🔁 Bucles Temporizados (`cada`)
Crea eventos periódicos de forma limpia:
```ces
alEmpezar() {
    cada(3) { // Cada 3 segundos
        crear enemigoPrefab;
        imprimir("Un nuevo enemigo ha aparecido.");
    }
}
```

---

## 🍳 8. El Recetario (Cookbook)

### 🏃 Doble Salto Profesional
```ces
ve motor;
publico numero saltosMaximos = 2;
numero saltosRestantes = 2;

alActualizar(delta) {
    si (estaTocandoTag("Suelo")) {
        saltosRestantes = saltosMaximos;
    }

    si (teclaRecienPresionada("Space") y saltosRestantes > 0) {
        fisica.velocity.y = -10; // Impulso vertical
        saltosRestantes -= 1;
        reproducir.Salto();
    }
}
```

### 🎥 Cámara Suave (Smooth Follow)
```ces
ve motor;
publico Materia objetivo;
publico numero suavizado = 0.125;

alActualizar(delta) {
    si (objetivo) {
        variable posDeseada = { x: objetivo.posicion.x, y: objetivo.posicion.y };
        posicion.x += (posDeseada.x - posicion.x) * suavizado;
        posicion.y += (posDeseada.y - posicion.y) * suavizado;
    }
}
```

### 🎒 Sistema de Inventario Simple
```ces
ve motor;
variable inventario = [];

alEntrarEnColision(otro) {
    si (otro.tieneTag("Item")) {
        inventario.push(otro.nombre);
        imprimir("Recogido: " + otro.nombre + ". Total: " + inventario.length);
        destruir(otro);
    }
}
```

---

## ⚙️ 9. Bajo el Capó: El Transpilador

El motor utiliza un sistema de **Transpilación Inteligente**. Esto significa que cuando escribes en CES, el motor traduce tu código a JavaScript optimizado de alto rendimiento en tiempo real.

- **Seguridad**: El motor detecta errores antes de ejecutar el juego.
- **Velocidad**: Se ejecuta nativamente en el navegador sin capas pesadas.
- **Flexibilidad**: Si eres un experto, puedes usar cualquier función de JavaScript dentro de tus scripts CES.

---

## 🎨 10. Conclusión: ¡Tu límite es tu imaginación!

El scripting en **Creative Engine** ha sido diseñado para que te enfoques en lo divertido: **crear**. No te preocupes por la sintaxis perfecta al principio; el motor te ayudará en el camino.

Recuerda: **Cada gran juego empezó con una sola línea de código.** ¿Cuál será la tuya?

> "La programación no es sobre lo que sabes; es sobre lo que puedes imaginar."

---
*¿Necesitas más ayuda? Visita nuestra comunidad en Discord o consulta la [Guía de Componentes](README_COMPONENTES.md).*
