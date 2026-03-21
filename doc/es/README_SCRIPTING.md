# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación de videojuegos! Este no es un simple manual de usuario; es una enciclopedia técnica diseñada para convertirte en un arquitecto de realidades. En las páginas siguientes, desglosaremos cada engranaje del **Creative Engine Script (CES)**.

---

## 📖 Tabla de Contenidos

0. [Capítulo 0: Inmersión Rápida (Tu primer éxito)](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura del Motor](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: El Lenguaje CES y el Transpilador](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Tipado](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: El Latido: Ciclo de Vida Profundo](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Interacción Galvánica (Input Avanzado)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Componentes (API)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: La Red Neuronal (Mensajería Global)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo y Asincronía](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Gran Recetario (Sistemas Complejos)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Rendimiento de Grado Industrial](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (Internos del Motor)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Solución de Problemas (Troubleshooting)](#capítulo-12-solución-de-problemas)

---

## ⚡ Capítulo 0: Inmersión Rápida

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona.

1. **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2. **Escribe:**
```ces
ve motor;
publico numero velocidadGiro = 100;

alActualizar(delta) {
    rotacion += velocidadGiro * delta;
    si (teclaPresionada("Space")) {
        posicion.x += 5;
    }
}
```
3. **Asigna:** Arrástralo a una Materia. ¡Dale a Play y presiona Espacio!

---

## 🏛️ Capítulo 1: Filosofía y Arquitectura

### ¿Por qué Creative Engine?
La mayoría de los motores modernos sufren de **"Sobre-ingeniería"**. Creative Engine fue diseñado para eliminar la fricción entre el pensamiento y la ejecución.

**El concepto de "Leyes" y "Materias":**
- **Materia:** Es el contenedor vacío (el objeto). No tiene peso ni forma por sí mismo.
- **Leyes:** Son los componentes. Al añadir una Ley de "Física", la Materia comienza a caer. Al añadir una Ley de "Script", la Materia adquiere voluntad.

Esta arquitectura desacoplada permite que tus juegos sean extremadamente modulares y fáciles de depurar.

---

## 🦴 Capítulo 2: El Lenguaje CES

CES no es un lenguaje nuevo desde cero; es una **Abstracción de Alto Nivel** sobre JavaScript (ES6+), diseñada para ser natural y potente.

### Lógica Natural (Novedad)
Ahora puedes escribir condiciones como si estuvieras hablando:
- **`si (vida es 10 y energia igual a 100)`** -> Soporte para `y`, `o`, `es`, `igual a`.
- **`si (puntos diferente a 0 o tiempo menor a 10)`** -> Soporte para `diferente a`, `menor a`, `mayor a`.

### La Magia de la Omisión
En CES, el contexto es implícito. El motor sabe que si estás escribiendo un script para el "Jugador", cualquier mención a la `vida` se refiere a la vida *de ese jugador*.
- **Antes:** `this.materia.getComponent("Health").currentHealth -= 10;`
- **Ahora (CES):** `vida.damage(10);`

El transpilador se encarga de convertir esa simplicidad en código JavaScript optimizado que el navegador puede ejecutar a velocidades de vértigo.

---

## 💎 Capítulo 3: El Inspector Dinámico

El Inspector no es solo una lista de variables; es una ventana en tiempo real al estado de tu juego.

### Atributos de Visibilidad
Usar `publico` antes de una variable le indica al motor que debe crear un widget de edición en la interfaz:

- **`publico numero`**: Crea un control deslizante y campo numérico.
- **`publico Materia`**: Crea un slot de "Drag & Drop" que solo acepta objetos de la escena.
- **`publico Prefab`**: Permite seleccionar archivos `.ceprefab` de tu biblioteca.

**Tip técnico:** El motor realiza una "Inyección de Dependencias" automática. Si arrastras un objeto que tiene un `SpriteRenderer` a una variable de tipo `Sprite`, el motor extraerá automáticamente el componente correcto.

---

## ⏱️ Capítulo 4: El Latido: Ciclo de Vida Profundo

Tu script tiene etapas biológicas:

1. **`alEmpezar()` (o `start`):** Se ejecuta una vez al inicio.
2. **`alActualizar(delta)` (o `update`):** Loop principal de lógica.
3. **`actualizarFijo(delta)` (o `fixedUpdate`):** Para físicas estables.
4. **`alChocar(otro)` (o `onCollisionEnter`):** Se activa al tocar otro objeto con colisionador.
5. **`alClicar()` (o `onPointerClick`):** Para detectar clicks de ratón o toques.
6. **`alDestruir()` (Limpieza):** Antes de que el objeto desaparezca.

---

## ⌨️ Capítulo 5: Interacción Galvánica (Input)

El motor abstrae la complejidad de los eventos de hardware en una API de consulta directa (Polling):

### Teclado
- `teclaPresionada("a")`: Devuelve `verdadero` mientras la tecla esté hundida.
- `teclaRecienPresionada("Space")`: Solo devuelve `verdadero` en el primer frame del pulso. Ideal para saltos.

### Mouse y Touch
- `botonMouseRecienPresionado(0)`: 0 es izquierdo, 1 central, 2 derecho.
- `obtenerPosicionMouse()`: Devuelve un objeto `{x, y}` en coordenadas del mundo.

---

## 📦 Capítulo 6: La Gran Referencia de Componentes (API)

Aquí desglosamos las capacidades de los componentes más importantes:

### 📍 Transformación (`posicion`, `transform`)
- **`.x`, `.y`**: Coordenadas espaciales.
- **`.rotacion`**: Ángulo en grados.
- **`.escala`**: Tamaño relativo (ej: 2 es el doble).
- **`mirarA(objetivo)`**: Rota el objeto instantáneamente hacia otro objeto o posición.

### ⚖️ Físicas (`fisica`, `rigidbody2D`)
- **`.velocidadX`, `.velocidadY`**: Atajos directos para moverte en ejes.
- **`.velocity`**: Vector de movimiento actual `{x, y}`.
- **`.gravityScale`**: Cuánta gravedad afecta al objeto (0 = flota).
- **`applyForce(x, y)`**: Empuje constante (como un motor).
- **`applyImpulse(x, y)`**: Fuerza instantánea (como una explosión).

### 🩸 Salud (`vida`, `health`)
- **`.currentHealth`**: Vida actual.
- **`.maxHealth`**: Límite máximo.
- **`damage(n)`**: Resta vida y activa eventos de muerte si llega a 0.
- **`heal(n)`**: Suma vida sin exceder el máximo.

### 🎬 Animación (`animador`, `animacion`)
- **`play("Nombre")`**: Cambia al estado de animación deseado.
- **`stop()`**: Congela el fotograma actual.
- **`reproducir.Correr()`**: Proxy dinámico para llamadas rápidas.

---

## 📡 Capítulo 7: La Red Neuronal (Mensajería)

¿Por qué evitar las referencias directas (`buscar()`)?
Si el Script A depende del Script B, y borras el Script B, el Script A fallará. El sistema de **Mensajes** elimina este acoplamiento.

- **`difundir("OlaDeCalor", { intensidad: 10 })`**: Envía una señal al aire. No le importa quién la escuche.
- **`alRecibir("OlaDeCalor", (datos) => { ... })`**: El script se queda "escuchando". Si llega el mensaje, reacciona.

Este patrón (Observer) es la base de los juegos profesionales escalables.

---

## 🪄 Capítulo 8: Control del Tiempo y Asincronía

### Corrutinas (`esperar`)
En CES, todos los métodos son asíncronos por defecto. Esto te permite escribir secuencias temporales como si fueran una lista de instrucciones:

```ces
async alHacerClick() {
    voltearH = verdadero;
    esperar(0.5);
    voltearH = falso;
}
```

### El Bucle Periódico (`cada`)
Es una forma elegante de crear "intervalos de vida":
```ces
alEmpezar() {
    cada(2) {
        imprimir("Han pasado 2 segundos más");
    }
}
```

---

## 🍳 Capítulo 9: El Gran Recetario (Cookbook)

### 🎒 Sistema de Inventario con Slots
```ces
ve motor;
publico numero maxSlots = 5;
variable items = [];

funcion agregarItem(nombre) {
    si (items.length < maxSlots) {
        items.push(nombre);
        difundir("ActualizarUI", { inventario: items });
        retornar verdadero;
    }
    retornar falso;
}
```

### 🧠 IA de Jefe con Fases
```ces
ve motor;
publico numero vidaFase2 = 50;

alActualizar(delta) {
    si (vida.currentHealth > vidaFase2) {
        comportamientoFase1();
    } sino {
        comportamientoFase2();
    }
}

funcion comportamientoFase2() {
    escala.x = 2; // El jefe crece
    fisica.gravityScale = 0; // Empieza a flotar
}
```

---

## ⚙️ Capítulo 10: Rendimiento Industrial

### El costo de `buscar()`
Llamar a `buscar("Jugador")` obliga al motor a recorrer toda la lista de objetos. Si tienes 1000 objetos y lo haces cada frame, el juego irá lento.
**Solución:** Busca una vez en `alEmpezar` y guarda la referencia.

### Object Pooling
Crear y destruir objetos (`crear`, `destruir`) consume CPU y genera "basura" que el navegador debe limpiar.
**Mejor práctica:** Para proyectiles, crea un "pool" de 20 balas al inicio, desactívalas y actívalas según las necesites.

---

## 🛠️ Capítulo 11: Bajo el Capó

### El Proceso de Transpilación
Cuando guardas un archivo `.ces`, ocurre esto:
1. **Scanner:** Se buscan palabras clave como `si`, `publico`, `ve`.
2. **Mapper:** Se traducen los alias (ej: `fisica` -> `this.obtenerComponente('Rigidbody2D')`).
3. **Wrapper:** Tu código se envuelve en una clase ES6 que hereda de `CreativeScriptBehavior`.
4. **Injection:** Se inyectan las APIs de entrada y motor.

Este proceso asegura que escribas código fácil pero ejecutes código profesional.

---

## 🛠️ Capítulo 12: Consola Inteligente y Auto Reparación

Creative Engine incluye herramientas avanzadas para que nunca te quedes atascado:

### 🧠 Consola Inteligente
La consola no solo te dice qué falló, sino **dónde** y **cómo** arreglarlo:
- **Traducción de Errores**: Convierte errores técnicos en explicaciones claras en español.
- **Botón "Ir a la línea"**: Abre el editor y resalta la línea exacta del fallo.
- **Botón "Auto Reparar"**: Analiza tu código y propone una solución basada en miles de patrones correctos.

### 📜 Historial y Backups
¿Borraste algo importante? En el Editor de Código, haz clic en **"Historial"** para ver y restaurar las últimas 10 versiones de tu script guardadas en el archivo `.meta`.

### ❓ Solución de Problemas (FAQ)

Si tienes un error, consulta nuestra **[Guía de Solución Rápida](README_SOLUCIONES.md)** con más de 50 soluciones a problemas comunes.

**P: Mi objeto atraviesa las paredes.**
R: Asegúrate de usar `actualizarFijo` para el movimiento físico y de que el `Rigidbody2D` esté en modo "Continuous" si el objeto es muy rápido.

**P: "TypeError: Cannot read properties of undefined (reading 'damage')"**
R: Estás intentando llamar a `vida.damage()` en un objeto que no tiene el componente **Health**. El Auto Reparador puede añadirlo por ti.

---

## 🎉 Conclusión

Has completado el Libro Maestro. Ahora, el código no es un lenguaje extraño, sino una herramienta en tus manos. Ve y construye algo increíble.

> "El código es poesía en movimiento."

---
*¿Deseas profundizar más? Explora el [Libro de la Extensibilidad](README_LIBRERIAS.md).*
