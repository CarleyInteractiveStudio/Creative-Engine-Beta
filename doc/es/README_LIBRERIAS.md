# 📚 El Libro de la Extensibilidad: Librerías y Herramientas (.celib) — Creative Engine

¡Bienvenido al nivel avanzado, Arquitecto! Si estás aquí, es porque no solo quieres crear juegos, sino que quieres **crear las herramientas que otros usarán** o potenciar el motor con funciones únicas.

En **Creative Engine**, el sistema de librerías (.celib) te permite inyectar JavaScript puro directamente en el editor o en el corazón del juego. Esta guía te enseñará a expandir los límites de lo posible.

---

## 📖 Tabla de Contenidos

1. [Capítulo 1: El Poder de la Extensibilidad](#capítulo-1-el-poder-de-la-extensibilidad)
2. [Capítulo 2: Anatomía de una Librería (.celib)](#capítulo-2-anatomía-de-una-librería-celib)
3. [Capítulo 3: Creación de Herramientas para el Editor](#capítulo-3-creación-de-herramientas-para-el-editor)
4. [Capítulo 4: Referencia API del Generador de UI](#capítulo-4-referencia-api-del-generador-de-ui)
5. [Capítulo 5: Extensiones de Runtime (Nuevas APIs para CES)](#capítulo-5-extensiones-de-runtime-nuevas-apis-para-ces)
6. [Capítulo 6: Ejemplo Pro - El Renombrador en Masa](#capítulo-6-ejemplo-pro-el-renombrador-en-masa)
7. [Capítulo 7: Ejemplo Pro - Sistema de Logros Global](#capítulo-7-ejemplo-pro-sistema-de-logros-global)
8. [Capítulo 8: Instalación y Distribución](#capítulo-8-instalación-y-distribución)

---

## 🏛️ Capítulo 1: El Poder de la Extensibilidad

¿Por qué usar librerías?
- **Automatización:** Crea botones que generen niveles enteros o configuren luces automáticamente.
- **APIs Propias:** Añade funciones como `miBaseDeDatos.guardar()` que se sientan nativas en CES.
- **Personalización:** Cambia el flujo de trabajo del editor para que se adapte a ti.

Creative Engine es **"Engine-as-a-Platform"**: tú tienes las llaves del reino.

---

## 🦴 Capítulo 2: Anatomía de una Librería (.celib)

Una librería es técnicamente un archivo JavaScript estándar envuelto en una función autoejecutable (IIFE) para evitar conflictos.

```javascript
(function() {
    // Tu lógica aquí
    console.log("Mi librería se ha cargado correctamente.");
})();
```

---

## 🛠️ Capítulo 3: Creación de Herramientas para el Editor

Puedes añadir ventanas personalizadas al menú **Ventana** del editor usando `CreativeEngine.API.registrarVentana`.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Mi Herramienta",
        ancho: 350,
        alto: 250,
        alAbrir: function(panel) {
            panel.texto("¡Hola desde el código!");
            panel.boton("Pulsar", () => alert("¡Funciona!"));
        }
    });
})();
```

---

## 🍱 Capítulo 4: Referencia API del Generador de UI

El objeto `panel` que recibes en `alAbrir` es una fábrica de interfaces dinámica. Aquí tienes todo lo que puedes crear:

### Elementos Básicos:
- **`texto(contenido, opciones)`**: Muestra texto. Opciones: `{ negrita: true, color: "#hex", tamano: "14px" }`.
- **`boton(etiqueta, clickCallback)`**: Un botón interactivo.
- **`input(etiqueta, callback)`**: Campo de texto. El callback devuelve el valor al cambiar.
- **`numero(etiqueta, callback)`**: Campo numérico para valores precisos.
- **`checkbox(etiqueta, valorInicial, callback)`**: Interruptor booleano.
- **`slider(etiqueta, opciones, callback)`**: Opciones: `{ min, max, paso }`.

### Organización:
- **`fila(callback)`**: Crea un contenedor horizontal. Dentro del callback, usas el nuevo objeto de fila.
- **`columna(callback)`**: Igual que la fila, pero vertical.
- **`separador()`**: Una línea sutil para organizar visualmente.
- **`imagen(src)`**: Muestra un icono o preview.

---

## 🎮 Capítulo 5: Extensiones de Runtime (Nuevas APIs para CES)

Esta es la parte más potente: añadir funciones que tus scripts `.ces` pueden usar. Se hace mediante `CreativeEngine.API.registrarRuntimeAPI`.

**En tu archivo .js:**
```javascript
(function() {
    const MiAPI = {
        saludar: (nombre) => "Hola " + nombre,
        obtenerPuntos: () => 100
    };
    CreativeEngine.API.registrarRuntimeAPI("Utilidades", MiAPI);
})();
```

**Uso en un Script (.ces):**
```ces
ve motor;
go "Utilidades"; // Importar la extensión

alEmpezar() {
    variable msj = saludar("Jugador"); // ¡Uso directo!
}
```

---

## 🚀 Capítulo 6: Ejemplo Pro - El Renombrador en Masa

Esta herramienta busca todos los objetos en la escena y les añade un prefijo.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Batch Renamer",
        alAbrir: (ui) => {
            ui.texto("Añade un prefijo a todos los objetos:");
            let prefijo = "OBJ_";

            ui.input("Prefijo", (v) => prefijo = v);

            ui.boton("¡Renombrar Todo!", () => {
                const materias = window.SceneManager.currentScene.getAllMaterias();
                materias.forEach(m => m.name = prefijo + m.name);
                window.updateHierarchy(); // Refrescar la lista visual
                alert("Renombrados " + materias.length + " objetos.");
            });
        }
    });
})();
```

---

## 🏆 Capítulo 7: Ejemplo Pro - Sistema de Logros Global

Crea un sistema que guarde el progreso de forma persistente.

```javascript
(function() {
    const Logros = {
        lista: [],
        desbloquear: function(id) {
            if (!this.lista.includes(id)) {
                this.lista.push(id);
                console.log("🏆 Logro desbloqueado: " + id);
                // Aquí podrías guardar en localStorage
            }
        }
    };
    CreativeEngine.API.registrarRuntimeAPI("Logros", Logros);
})();
```

---

## 📦 Capítulo 8: Instalación y Distribución

1. Escribe tu código en un archivo `.js`.
2. Renombra la extensión a `.celib` (opcional, el motor acepta `.js` también).
3. **Arrastra** el archivo al panel de **Assets** del editor.
4. El motor lo moverá automáticamente a la carpeta `/lib` de tu proyecto.
5. Actívala desde el menú **Librerías**.
6. **Reinicia el editor** (o recarga la página) para que la inyección de código sea completa.

---
*¿Necesitas APIs más profundas? Contacta con el equipo de desarrollo para acceder al SDK de bajo nivel.*
