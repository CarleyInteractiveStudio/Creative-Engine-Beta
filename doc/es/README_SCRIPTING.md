# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido, Creador! Tienes en tus manos la guía definitiva para dominar **Creative Engine**. Este no es solo un manual técnico; es tu mapa hacia la libertad creativa. El lenguaje **CES (Creative Engine Script)** ha sido forjado para que la distancia entre tu imaginación y tu juego sea lo más corta posible.

En este "libro" digital, exploraremos desde los cimientos de la lógica hasta las arquitecturas más avanzadas. Prepárate, porque **programar es más sencillo de lo que piensas, y aquí te demostraremos por qué**.

---

## 📖 Tabla de Contenidos

0. [Capítulo 0: Tu Primer Script en 60 Segundos](#capítulo-0-tu-primer-script-en-60-segundos)
1. [Capítulo 1: La Filosofía del Motor](#capítulo-1-la-filosofía-del-motor)
2. [Capítulo 2: Anatomía de un Script](#capítulo-2-anatomía-de-un-script)
3. [Capítulo 3: Variables y el Inspector Dinámico](#capítulo-3-variables-y-el-inspector-dinámico)
4. [Capítulo 4: El Ritmo del Juego (Ciclo de Vida)](#capítulo-4-el-ritmo-del-juego-ciclo-de-vida)
5. [Capítulo 5: Interacción Total (Input y Físicas)](#capítulo-5-interacción-total-input-y-físicas)
6. [Capítulo 6: El Diccionario de Componentes (Referencia API)](#capítulo-6-el-diccionario-de-componentes-referencia-api)
7. [Capítulo 7: Comunicación entre Objetos (Mensajería Global)](#capítulo-7-comunicación-entre-objetos-mensajería-global)
8. [Capítulo 8: Magia Temporal (Corrutinas y Bucles)](#capítulo-8-magia-temporal-corrutinas-y-bucles)
9. [Capítulo 9: El Recetario de Soluciones (Cookbook)](#capítulo-9-el-recetario-de-soluciones-cookbook)
10. [Capítulo 10: Optimización y Mejores Prácticas](#capítulo-10-optimización-y-mejores-prácticas)
11. [Capítulo 11: Solución de Problemas y FAQ](#capítulo-11-solución-de-problemas-y-faq)

---

## ⚡ Capítulo 0: Tu Primer Script en 60 Segundos

¿Quieres ver resultados ya? Sigue estos pasos:

1. En el **Navegador de Assets**, haz clic derecho y selecciona **Nuevo > Script (CES)**. Ponle de nombre `HolaMundo.ces`.
2. Haz doble clic para abrirlo y pega este código:
```ces
ve motor;

alEmpezar() {
    imprimir("¡El motor está vivo!");
}

alActualizar(delta) {
    rotacion += 100 * delta; // ¡Hará que el objeto gire!
}
```
3. Arrastra ese archivo desde la biblioteca hacia cualquier objeto (una imagen o un cuadrado) en tu escena.
4. ¡Dale a **Play**! 🚀

---

## 🏛️ Capítulo 1: La Filosofía del Motor

Creative Engine nació bajo una premisa: **El código debe ser legible para humanos y potente para máquinas.**

A diferencia de otros motores que te obligan a lidiar con miles de líneas de "código basura" (boilerplate), en CES cada línea cuenta. Hemos eliminado la necesidad de usar `this.`, `mtr.` o prefijos redundantes.

**¡Importante!** Para que un script pueda controlar algo (como la física o la vida), el objeto **debe tener ese componente añadido**. Si quieres usar `fisica`, asegúrate de añadir un `Rigidbody2D` al objeto en el Inspector.

---

## 🦴 Capítulo 2: Anatomía de un Script

Todo script en Creative Engine comienza con una declaración de intención:

```ces
ve motor;
```

Esta línea no es opcional; es el puente que conecta tu archivo de texto con el corazón del motor. A partir de aquí, tu script se convierte en una "Ley" que rige el comportamiento de una "Materia" (objeto).

---

## 💎 Capítulo 3: Variables y el Inspector Dinámico

El poder de Creative Engine reside en su **Inspector**. Al declarar variables como `publico`, estas aparecen mágicamente en la interfaz del editor, permitiéndote ajustar el juego mientras corre.

### Tipos de Datos Soportados:
- **`numero`**: Para velocidades, fuerzas, salud, etc.
- **`texto`**: Para nombres, diálogos o IDs.
- **`booleano`**: Interruptores de `verdadero` o `falso`.
- **`Materia`**: Para referenciar otros objetos de la escena.
- **`Prefab`**: Para instanciar (crear) objetos nuevos (como balas o enemigos).
- **`Audio` / `Sprite` / `Scene`**: Referencias a recursos del proyecto.

```ces
publico numero fuerzaSalto = 12;
publico booleano puedeVolar = falso;
publico Materia camaraObjetivo;
```

---

## ⏱️ Capítulo 4: El Ritmo del Juego (Ciclo de Vida)

Un juego es una ilusión creada por imágenes que cambian rápidamente. Tu script vive dentro de ese latido:

1. **`alEmpezar()`**: Tu oportunidad de oro para configurar el objeto. Se ejecuta una sola vez.
2. **`alActualizar(delta)`**: Ocurre aproximadamente 60 veces por segundo. Aquí es donde procesas el movimiento y la lógica constante.
3. **`actualizarFijo(delta)`**: El motor de física corre aquí. Úsalo para fuerzas constantes para evitar que los objetos "atravessem" paredes.
4. **`alHacerClick()` / `alPresionar()`**: La respuesta directa al toque del jugador.

---

## ⌨️ Capítulo 5: Interacción Total (Input y Físicas)

El motor entiende tus comandos de forma natural. Ya sea teclado, mouse o gamepad, la API es consistente:

```ces
alActualizar(delta) {
    // Teclado
    si (teclaPresionada("w")) {
        fisica.applyForce(0, -100);
    }

    // Mouse
    si (botonMouseRecienPresionado(0)) {
        variable pos = obtenerPosicionMouse();
        imprimir("Clic en: " + pos.x + "," + pos.y);
    }
}
```

---

## 📦 Capítulo 6: El Diccionario de Componentes (Referencia API)

Aquí tienes los accesos directos más comunes que el motor te regala (siempre que el objeto tenga el componente correspondiente):

- **`posicion` (Transform)**: El ADN del objeto. Controla `x`, `y`, `rotacion` y `escala`.
- **`fisica` (Rigidbody2D)**: El motor de Newton. Usa `applyImpulse` para saltos y `velocity` para correr.
- **`vida` (Health)**: Gestiona la mortalidad. Usa `damage(10)` o `heal(5)`.
- **`animacion` (Animator)**: El director de cine. Usa `play("Correr")` para cambiar de estado.
- **`audio` (AudioSource)**: La voz del objeto. Usa `play()` o `stop()`.

---

## 📡 Capítulo 7: Comunicación entre Objetos (Mensajería Global)

Olvídate de buscar objetos por toda la jerarquía. El sistema de **Mensajería Global** permite que tus scripts hablen entre sí sin conocerse.

**Emisor:**
```ces
difundir("NivelCompletado", { tiempo: 45 });
```

**Receptor:**
```ces
alEmpezar() {
    alRecibir("NivelCompletado", (datos) => {
        imprimir("¡Felicidades! Lo lograste en " + datos.tiempo + " segundos.");
    });
}
```

---

## 🪄 Capítulo 8: Magia Temporal (Corrutinas y Bucles)

### El arte de la espera (`esperar`)
En CES, puedes pausar la lógica de un script sin congelar el juego. Esto es vital para cinemáticas o efectos.

```ces
async alEmpezar() {
    imprimir("3...");
    esperar(1);
    imprimir("2...");
    esperar(1);
    imprimir("1...");
    esperar(1);
    imprimir("¡FUEGO!");
}
```

### El poder de la repetición (`cada`)
¿Necesitas generar una moneda cada 5 segundos? No uses contadores manuales complicados:

```ces
alEmpezar() {
    cada(5) {
        crear monedaPrefab;
    }
}
```

---

## 🍳 Capítulo 9: El Recetario de Soluciones (Cookbook)

### 🏃 Sistema de Movimiento de Plataformas Pro
*(Requiere componentes: Rigidbody2D, BoxCollider2D)*
```ces
ve motor;
publico numero velocidad = 10;
publico numero fuerzaSalto = 12;

alActualizar(delta) {
    variable horizontal = 0;
    si (teclaPresionada("d")) horizontal = 1;
    si (teclaPresionada("a")) horizontal = -1;

    // Movimiento directo de física
    fisica.velocity.x = horizontal * velocidad;

    si (horizontal != 0) {
        voltearH = (horizontal < 0);
        reproducir.Caminar();
    } sino {
        reproducir.Idle();
    }

    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
    }
}
```

### 🎯 Sistema de Disparo con Cooldown
```ces
ve motor;
publico Prefab bala;
publico numero cadencia = 0.5;
numero tiempoSiguienteDisparo = 0;

alActualizar(delta) {
    si (teclaPresionada("f") y tiempoSiguienteDisparo <= 0) {
        crear bala;
        tiempoSiguienteDisparo = cadencia;
        reproducir.Disparo();
    }

    si (tiempoSiguienteDisparo > 0) {
        tiempoSiguienteDisparo -= delta;
    }
}
```

### 🔘 Botón UI Interactable
*(Requiere componentes: Button, UIText)*
```ces
ve motor;
publico texto mensajeAlClicar = "¡Hola!";

alHacerClick() {
    texto.text = mensajeAlClicar;
    reproducir.ClickSound();
    imprimir("Botón presionado");
}
```

---

## ⚙️ Capítulo 10: Optimización y Mejores Prácticas

Para que tu juego corra a 60 FPS incluso en móviles, sigue estos consejos:

1. **Usa `delta`**: Siempre multiplica tus movimientos por `delta` si cambias la `posicion` directamente. Si usas `fisica.velocity`, el motor se encarga.
2. **Evita `buscar()` en `alActualizar`**: Buscar objetos por nombre es lento. Hazlo en `alEmpezar` y guarda el resultado en una variable.
3. **Pooling**: En lugar de destruir y crear cientos de balas, intenta reutilizarlas.
4. **Capas de Colisión**: Configura en los ajustes del proyecto qué objetos chocan con cuáles para ahorrar procesador.

---

## 🛠️ Capítulo 11: Solución de Problemas y FAQ

**P: Mi script lanza un error "Cannot read properties of undefined (reading 'velocity')".**
R: Este error ocurre cuando intentas acceder a `fisica` pero el objeto no tiene un componente **Rigidbody2D**. Asegúrate de añadirlo en el Inspector.

**P: El script no responde a mis teclas.**
R: Asegúrate de que el script tenga la línea `ve motor;` al principio y de que no haya errores de sintaxis en la Consola.

**P: ¿Cómo accedo a la vida de otro objeto?**
R: Primero obtén la referencia (ej: `variable obj = buscar("Enemigo");`) y luego usa `obj.vida.damage(10);`.

---

## 🎉 Epílogo: Tu Viaje Comienza Ahora

Has terminado el Libro Maestro, pero tu historia como desarrollador apenas empieza. **Creative Engine** es el lienzo, y tú eres el artista.

No tengas miedo de experimentar. Rompe las reglas, combina componentes y, sobre todo, **diviértete**. Si puedes imaginarlo, puedes programarlo aquí.

> "La mejor forma de predecir el futuro es creándolo." — Peter Drucker

---
*¿Tienes dudas? Consulta la [Guía de Componentes](README_COMPONENTES.md) o únete a nuestra comunidad oficial.*
