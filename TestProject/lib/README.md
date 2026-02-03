# Guía para la Creación y Gestión de Librerías

Esta carpeta `/lib` contiene todas las librerías (.celib) de tu proyecto.

## ¿Qué es una Librería?

Una librería es un paquete autocontenido que puede extender la funcionalidad del editor de Creative Engine o proporcionar nuevas funciones para tus scripts de juego (.ces). Las librerías ahora pueden estar compuestas por múltiples archivos `.js` y `.ces`, permitiendo una organización de código más compleja y la reutilización de scripts.

---

## Gestión de Librerías

### Activación y Desactivación
- **Para activar o desactivar una librería**, abre el panel "Librerías" desde el menú superior del editor.
- Haz clic derecho en una librería para activar o desactivar.
- Cuando desactivas una librería, el motor guarda su estado en un archivo `.celib.meta`. La librería no se cargará la próxima vez que inicies el editor.
- **Importante:** Debes reiniciar el editor para que los cambios de activación/desactivación surtan efecto.

### Importación y Permisos
- Puedes importar librerías usando el botón "Importar" en el panel de "Librerías".
- **Sistema de Permisos**: Al importar una librería, el motor te pedirá que concedas permisos específicos que la librería solicita. Una librería solo podrá acceder a las partes de la API para las que le hayas dado permiso. Esto garantiza que las librerías de terceros no puedan realizar acciones no deseadas.

### Exportación
- Para compartir tus librerías, puedes seleccionarlas en el panel "Librerías" y usar el botón "Exportar".

---

## Creación de Librerías

### 1. Creación Multi-Archivo
Al crear una nueva librería, ahora puedes arrastrar y soltar múltiples archivos `.js` y `.ces`.

- **Script Principal**: Debes designar un archivo `.js` como el "script principal". Este es el punto de entrada que el motor ejecutará para inicializar la librería. El resto de archivos `.js` y `.ces` se cargarán en el entorno de la librería, pero no se ejecutarán directamente.
- **Simulación de `import`**: El motor efectivamente concatena los archivos no principales primero y el archivo principal al final. Esto significa que puedes definir clases o funciones en archivos secundarios y usarlos en tu script principal, simulando un sistema de módulos simple.

### 2. La API del Editor (`CreativeEngine.API`)
Para que tu librería tenga una interfaz en el editor (por ejemplo, para añadir una nueva ventana en el menú "Ventana"), tu script principal `.js` debe interactuar con `CreativeEngine.API`.

**Permiso Requerido**: `Permitir crear ventanas y paneles en el editor.`

```javascript
// main.js (marcado como script principal)
(function() {
    // Esta función solo estará disponible si se concedió el permiso
    if (CreativeEngine.API.registrarVentana) {
        CreativeEngine.API.registrarVentana({
            nombre: "Mi Herramienta",
            alAbrir: function(panel) {
                panel.agregarTexto("¡Hola, mundo!");
            }
        });
    }
})();
```

### 3. La API del Motor (`engine`)
Todas las librerías reciben un objeto `engine` inyectado en sus funciones. Este objeto proporciona acceso a funcionalidades de bajo nivel del motor.

#### `engine.registrarComponente(nombre, propiedades)`
Esta es la nueva y potente forma de crear componentes personalizados directamente desde una librería.

**Permiso Requerido**: `Permitir registrar componentes personalizados.`

- `nombre`: El nombre de la clase de tu componente (ej: "RotadorSimple").
- `propiedades`: Un objeto que define las propiedades públicas de tu componente. Estas propiedades serán visibles y editables en el Inspector.

**Ejemplo de cómo registrar un componente:**

```javascript
// main.js (marcado como script principal)
(function() {
    // La función 'engine.registrarComponente' solo existirá si se concedió el permiso
    if (engine && engine.registrarComponente) {
        engine.registrarComponente({
            nombre: "RotadorSimple",
            propiedades: {
                velocidad: {
                    tipo: 'numero',
                    valorPorDefecto: 10
                }
            },
            script: `
                // Este es código CES (.ces) que se ejecuta para el componente
                publico iniciar() {
                    consola.imprimir("Componente RotadorSimple iniciado!");
                    // this.velocidad se establece desde el Inspector
                }

                publico actualizar(deltaTime) {
                    // 'this.materia' es una referencia al objeto del juego al que está adjunto este componente
                    this.materia.transform.rotacion += this.velocidad * deltaTime;
                }
            `
        });
    }

    // Ahora, puedes añadir el componente "RotadorSimple" a cualquier Materia desde el Inspector.
})();
```

### 4. API de Runtime (Acceso desde Scripts `.ces`)
Si quieres que tus scripts de juego puedan usar funciones de tu librería, el script principal de la librería debe devolver un objeto.

**Permiso Requerido**: `Permitir acceso a sus funciones desde scripts (.ces).`

```javascript
// main.js (marcado como script principal)
return {
    sumar: function(a, b) {
        return a + b;
    },
    generarNumeroAleatorio: function(max) {
        return Math.floor(Math.random() * max);
    }
};
```

Uso en un script `.ces`:
```ces
// mi-script.ces
go "MiLibreriaDePrueba"

publico iniciar() {
    variable resultado = sumar(10, 5);
    consola.imprimir("El resultado es: " + resultado); // Imprime 15
}
```
