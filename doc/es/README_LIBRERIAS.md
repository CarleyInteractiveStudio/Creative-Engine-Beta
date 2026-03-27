# 📚 El Libro de la Extensibilidad: Librerías y Herramientas (.celib) — Creative Engine

Bienvenido al santuario de los desarrolladores de herramientas. Si has llegado hasta aquí, no solo quieres usar el motor, quieres **ser parte de él**. En Creative Engine, la extensibilidad no es una ocurrencia tardía, es una característica central.

Este libro detalla cómo puedes inyectar tu propio código JavaScript (ES6) para crear interfaces personalizadas o APIs globales que potenciarán a todo tu equipo.

---

## 📖 Tabla de Contenidos

1. [Capítulo 1: El Ecosistema de Extensiones](#capítulo-1-el-ecosistema-de-extensiones)
2. [Capítulo 2: El Registro Global de APIs](#capítulo-2-el-registro-global)
3. [Capítulo 3: Construcción de Interfaces de Usuario (UI)](#capítulo-3-construcción-de-ui)
4. [Capítulo 4: Referencia de Widgets del Panel](#capítulo-4-referencia-de-widgets)
5. [Capítulo 5: Hooks y Eventos del Motor](#capítulo-5-hooks-y-eventos)
6. [Capítulo 6: Caso de Estudio: Generador de Niveles Procedural](#capítulo-6-caso-de-estudio)
7. [Capítulo 7: Depuración de Librerías](#capítulo-7-depuración)
8. [Capítulo 8: Publicación y Mejores Prácticas](#capítulo-8-publicación)

---

## 🏛️ Capítulo 1: El Ecosistema de Extensiones

Las librerías en Creative Engine se dividen en dos categorías principales:
1. **Librerías de Editor:** Añaden botones, ventanas y utilidades que solo existen mientras estás diseñando el juego.
2. **Librerías de Runtime:** Inyectan funciones que los scripts `.ces` pueden usar durante la ejecución del juego (ej: un sistema de guardado en la nube).

Todo archivo `.js` o `.celib` colocado en la carpeta `/lib` se carga automáticamente al iniciar el editor.

---

## 🧪 Capítulo 2: El Registro Global

La puerta de entrada a todo es el objeto `CreativeEngine.API`. Este objeto te permite comunicarte con las entrañas del motor de forma segura.

### Registro de Runtime API
Si quieres que una función esté disponible para todos los scripts CES:

```javascript
(function() {
    const MiSistema = {
        calcularDistancia: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        config: { version: "1.0" }
    };
    CreativeEngine.API.registrarRuntimeAPI("Geometria", MiSistema);
})();
```

**Efecto:** En cualquier script CES ahora puedes usar `go "Geometria";` y llamar a `calcularDistancia()`.

---

## 🎨 Capítulo 3: Construcción de Interfaces (UI)

Creative Engine utiliza una API declarativa para construir herramientas. No necesitas saber HTML o CSS; el motor se encarga del diseño para que coincida con la estética del editor.

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Explorador de Datos",
    ancho: 400,
    alto: 300,
    alAbrir: function(panel) {
        panel.columna((col) => {
            col.texto("Estado del Sistema", { negrita: true });
            col.separador();
            col.boton("Refrescar", () => MiLogica.actualizar());
        });
    }
});
```

---

## 🍱 Capítulo 4: Referencia de Widgets

### Elementos de Entrada
- **`input(etiqueta, callback)`**: Recibe un string.
- **`numero(etiqueta, callback)`**: Filtra automáticamente para solo permitir números.
- **`checkbox(etiqueta, inicial, callback)`**: Devuelve un booleano.
- **`slider(etiqueta, opciones, callback)`**: Opciones: `{ min, max, paso }`.

### Elementos Visuales
- **`texto(valor, estilo)`**: Soporta `color`, `fontSize`, `bold`.
- **`imagen(url)`**: Útil para previsualizar sprites o texturas.
- **`grafico(datos)`**: (Próximamente) Permite visualizar variables en el tiempo.

---

## 🪝 Capítulo 5: Hooks y Eventos

Tu librería puede reaccionar a lo que pasa en el motor.

### Eventos de Selección
```javascript
window.addEventListener('mtrSelected', (e) => {
    const materia = e.detail; // El objeto seleccionado actualmente
    console.log("Se ha seleccionado: " + materia.name);
});
```

### Eventos de Escena
- `sceneLoaded`: Cuando se termina de cargar un nivel.
- `gameStarted` / `gameStopped`: Útil para inicializar bases de datos locales solo durante el juego.

---

## 🚀 Capítulo 6: Caso de Estudio - Generador Procedural

Imagina una herramienta que crea una cuadrícula de enemigos automáticamente:

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Spawn Master",
    alAbrir: (ui) => {
        let cantidad = 10;
        ui.numero("Cantidad", (v) => cantidad = v);
        ui.boton("¡Generar!", async () => {
            for(let i=0; i<cantidad; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                await window.SceneManager.instantiatePrefabFromPath("Assets/Enemigo.ceprefab", x, y);
            }
        });
    }
});
```

---

## 🐛 Capítulo 7: Depuración de Librerías

Dado que las librerías son JavaScript puro, puedes usar las herramientas de desarrollador del navegador (F12):
1. Abre la pestaña **Sources**.
2. Busca tu archivo en la carpeta `lib/`.
3. Pon puntos de interrupción (breakpoints).
4. Usa `console.dir(window.CreativeEngine)` para inspeccionar la API disponible.

---

## 📦 Capítulo 8: Publicación y Mejores Prácticas

- **Encapsulamiento:** Siempre usa el patrón `(function() { ... })();` para no contaminar el espacio global.
- **Rendimiento:** No realices cálculos pesados en el hilo principal del editor; usa `setTimeout` o `Worker` si es necesario.
- **Iconografía:** Usa la librería de iconos SVG interna si deseas que tus botones se vean nativos.

---
*Este documento es una guía viva. Si creas una librería útil, ¡compártela con la comunidad!*
