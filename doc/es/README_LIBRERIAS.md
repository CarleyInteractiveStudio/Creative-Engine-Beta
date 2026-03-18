# 📚 Guía de Librerías y Extensibilidad - Creative Engine

Las librerías en Creative Engine (archivos `.celib`) permiten extender tanto la interfaz del editor como las capacidades de programación de tus juegos.

---

## 🛠️ 1. Librerías de Interfaz (Herramientas del Editor)

Puedes crear tus propias ventanas y herramientas personalizadas para el editor usando `CreativeEngine.API`.

### Registro de una Ventana
Para que tu herramienta aparezca en el menú **Ventana**, usa:

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Mi Super Herramienta",
        estilo: "moderno", // "carl", "moderno" o vacio
        ancho: 400,
        alto: 300,
        alAbrir: function(panel) {
            panel.texto("¡Bienvenido a mi herramienta!", { negrita: true, color: "#3498db" });

            panel.fila((f) => {
                f.boton("Saludar", () => alert("¡Hola!"));
                f.boton("Cerrar", () => panel.elemento.remove());
            });

            panel.separador();

            panel.input("Tu Nombre", (valor) => {
                console.log("Nombre ingresado: " + valor);
            });
        }
    });
})();
```

### Componentes de UI Disponibles
El objeto `panel` pasado a `alAbrir` tiene los siguientes métodos:
- `texto(contenido, opciones)`
- `boton(etiqueta, clickCallback, opciones)`
- `input(etiqueta, opcionesOrCallback)`
- `numero(etiqueta, opcionesOrCallback)`
- `checkbox(etiqueta, inicial, alCambiar)`
- `slider(etiqueta, opciones)`
- `desplegable(etiqueta, items, opciones)`
- `imagen(src, opciones)`
- `fila(callback)` / `columna(callback)`: Para organizar elementos.

---

## 🎮 2. Librerías de Runtime (Nuevas Funciones para Scripts)

Si quieres añadir nuevas funciones que puedan ser usadas dentro de tus scripts `.ces`, debes registrar una API de runtime.

### Ejemplo: Librería de Matemáticas Avanzadas
Crea un archivo JS y regístralo así:

```javascript
(function() {
    const MiCalculadora = {
        sumar: (a, b) => a + b,
        alCuadrado: (n) => n * n,
        generarID: () => "ID_" + Math.random().toString(36).substr(2, 9)
    };

    // Esto hará que "MiCalculadora" esté disponible en los scripts .ces
    CreativeEngine.API.registrarRuntimeAPI("MiCalculadora", MiCalculadora);
})();
```

### Cómo usarla en un Script (.ces)
Usa la palabra clave `go` o `ve` seguida del nombre de la librería:

```ces
ve motor;
go "MiCalculadora"; // Importamos la librería

alEmpezar() {
    variable resultado = sumar(10, 5); // Las funciones de la lib son globales ahora
    imprimir("Resultado: " + resultado);
    imprimir("Mi ID es: " + generarID());
}
```

---

## 💡 Ejemplos Completos

### 🛠️ Herramienta: Generador de Nombres Aleatorios
```javascript
(function() {
    const nombres = ["Rex", "Luna", "Titan", "Zelda", "Mario"];

    CreativeEngine.API.registrarVentana({
        nombre: "Generador de NPC",
        alAbrir: function(ui) {
            ui.texto("Genera un nombre para tu nuevo objeto:");

            const display = ui.texto("---", { bold: true, tamano: "20px" });

            ui.boton("¡Generar!", () => {
                const nombre = nombres[Math.floor(Math.random() * nombres.length)];
                display.textContent = nombre;

                // Si hay un objeto seleccionado, le cambiamos el nombre
                if (window.selectedMateria) {
                    window.selectedMateria.name = nombre;
                    window.updateHierarchy();
                }
            });
        }
    });
})();
```

### 🧬 Librería: Sistema de Logros (Runtime)
```javascript
(function() {
    const Logros = {
        conseguidos: [],
        desbloquear: function(nombre) {
            if (!this.conseguidos.includes(nombre)) {
                this.conseguidos.push(nombre);
                window.Dialogs.showNotification("✨ Logro Desbloqueado", nombre);
            }
        }
    };

    CreativeEngine.API.registrarRuntimeAPI("Logros", Logros);
})();
```

**Uso en script:**
```ces
ve motor;
go "Logros";

alEntrarEnColision(otro) {
    si (otro.tieneTag("MonedaEspecial")) {
        desbloquear("¡Coleccionista de Oro!");
        destruir(otro);
    }
}
```

---

## 📦 Cómo Crear e Instalar una Librería
1. Crea un archivo con extensión `.js`.
2. Escribe tu código de extensión (UI o Runtime).
3. En el editor, arrastra el archivo `.js` al **Navegador de Assets**.
4. El motor detectará la librería y la moverá automáticamente a la carpeta `/lib`.
5. Abre el panel de **Librerías** (Menú superior) para activarla.
6. **Reinicia el editor** para que los cambios surtan efecto.
