
# Guía para la Creación y Gestión de Librerías

Esta carpeta `/lib` contiene todas las librerías (.celib) de tu proyecto.

## ¿Qué es una Librería?

Una librería es un paquete autocontenido que puede extender la funcionalidad del editor de Creative Engine o proporcionar nuevas funciones para tus scripts de juego (.ces).

---

## Gestión de Librerías

### Activación y Desactivación
- **Para activar o desactivar una librería**, abre el panel "Librerías" desde el menú superior del editor.
- Cada librería en la lista tiene un botón de estado (Activar/Desactivar).
- Cuando desactivas una librería, el motor crea un archivo `.celib.meta` para guardar su estado. La librería no se cargará la próxima vez que inicies el editor.
- **Importante:** Debes reiniciar el editor para que los cambios de activación/desactivación surtan efecto.

### Importación
- Puedes importar librerías arrastrando un archivo `.celib` directamente a cualquier parte del "Navegador de Assets" del editor. El archivo se moverá automáticamente a esta carpeta `/lib`.
- También puedes usar el botón "Importar" en el panel de "Librerías".

### Exportación
- Para compartir tus librerías, puedes seleccionarlas en el panel "Librerías" y usar el botón "Exportar". Esto creará un archivo `.cep` que otros pueden importar.

---

## Creación de Librerías (API)

Las librerías se crean a partir de un único archivo JavaScript. Para una guía detallada y ejemplos de código, haz clic en el botón **"Documentación API"** en el panel de "Librerías" dentro del editor.

A continuación, un resumen rápido:

### 1. Registrar una Ventana en el Editor

Para que tu librería tenga una interfaz en el editor, usa `CreativeEngine.API.registrarVentana`.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Mi Herramienta",
        alAbrir: function(panel) {
            panel.agregarTexto("¡Hola, mundo!");
            panel.agregarBoton("Saludar", () => showNotificationDialog('Saludo', '¡Hola!'));
        }
    });
})();
```

### 2. Exponer Funciones a los Scripts (.ces)

Si quieres que tus scripts de juego puedan usar funciones de tu librería, el script de la librería debe devolver un objeto.

```javascript
// mi-libreria.js
return {
    sumar: function(a, b) {
        return a + b;
    },
    generarNumeroAleatorio: function(max) {
        return Math.floor(Math.random() * max);
    }
};
```

Luego, en tu script `.ces`, puedes usar estas funciones. A continuación, un ejemplo de cómo usar una librería junto con la nueva API orientada a componentes del motor:

```ces
// mi-script.ces
go "MiLibreria" // Importa la librería externa

public star() {
    // Usando la función de nuestra librería
    variable resultado = sumar(10, 5);
    console.log("El resultado es: " + resultado); // Imprime 15

    // Moviendo el personaje a la derecha usando la nueva API del motor
    if (this.rigidbody) {
        this.rigidbody.setVelocity({ x: 5, y: 0 });
    }

    // Reproduciendo una animación con la nueva API
    if (this.animator) {
        this.animator.play("run");
    }

    // Cambiando la luz ambiental de la escena con la nueva API de escena
    scene.setAmbientLight("#cccccc");
}
```
