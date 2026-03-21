# 📚 The Book of Extensibility: Libraries and Tools (.celib) — Creative Engine

Welcome to the sanctuary of tool developers. If you have made it this far, it is because you don't just want to use the engine, you want to **be part of it**. In Creative Engine, extensibility is not an afterthought, it is a core feature.

This book details how you can inject your own JavaScript (ES6) code to create custom interfaces or global APIs that will empower your entire team.

---

## 📖 Table of Contents

1. [Chapter 1: The Extension Ecosystem](#chapter-1-the-extension-ecosystem)
2. [Chapter 2: The Global API Registry](#chapter-2-the-global-api-registry)
3. [Chapter 3: User Interface (UI) Construction](#chapter-3-user-interface-ui-construction)
4. [Chapter 4: Panel Widget Reference](#chapter-4-panel-widget-reference)
5. [Chapter 5: Engine Hooks and Events](#chapter-5-engine-hooks-and-events)
6. [Chapter 6: Case Study: Procedural Level Generator](#chapter-6-case-study-procedural-level-generator)
7. [Chapter 7: Library Debugging](#chapter-7-library-debugging)
8. [Chapter 8: Publication and Best Practices](#chapter-8-publication-and-best-practices)

---

## 🏛️ Chapter 1: The Extension Ecosystem

Libraries in Creative Engine are divided into two main categories:
1. **Editor Libraries:** Add buttons, windows, and utilities that only exist while you are designing the game.
2. **Runtime Libraries:** Inject functions that `.ces` scripts can use during game execution (e.g., a cloud save system).

Any `.js` or `.celib` file placed in the `/lib` folder is automatically loaded when the editor starts.

---

## 🧪 Chapter 2: The Global Registry

The gateway to everything is the `CreativeEngine.API` object. This object allows you to communicate with the engine's internals safely.

### Runtime API Registration
If you want a function to be available for all CES scripts:

```javascript
(function() {
    const MySystem = {
        calculateDistance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        config: { version: "1.0" }
    };
    CreativeEngine.API.registrarRuntimeAPI("Geometry", MySystem);
})();
```

**Effect:** In any CES script you can now use `go "Geometry";` and call `calculateDistance()`.

---

## 🎨 Chapter 3: User Interface (UI) Construction

Creative Engine uses a declarative API to build tools. You don't need to know HTML or CSS; the engine handles the layout to match the editor's aesthetic.

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Data Explorer",
    ancho: 400,
    alto: 300,
    alAbrir: function(panel) {
        panel.columna((col) => {
            col.texto("System Status", { negrita: true });
            col.separador();
            col.boton("Refresh", () => MyLogic.update());
        });
    }
});
```

---

## 🍱 Chapter 4: Widget Reference

### Input Elements
- **`input(label, callback)`**: Receives a string.
- **`numero(label, callback)`**: Automatically filters to only allow numbers.
- **`checkbox(label, initial, callback)`**: Returns a boolean.
- **`slider(label, options, callback)`**: Options: `{ min, max, passo }`.

### Visual Elements
- **`texto(value, style)`**: Supports `color`, `fontSize`, `bold`.
- **`imagen(url)`**: Useful for previewing sprites or textures.
- **`grafico(data)`**: (Coming soon) Allows visualizing variables over time.

---

## 🪝 Chapter 5: Hooks and Events

Your library can react to what happens in the engine.

### Selection Events
```javascript
window.addEventListener('mtrSelected', (e) => {
    const materia = e.detail; // The currently selected object
    console.log("Selected: " + materia.name);
});
```

### Scene Events
- `sceneLoaded`: When a level finishes loading.
- `gameStarted` / `gameStopped`: Useful for initializing local databases only during the game.

---

## 🚀 Chapter 6: Case Study - Procedural Generator

Imagine a tool that creates a grid of enemies automatically:

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Spawn Master",
    alAbrir: (ui) => {
        let quantity = 10;
        ui.numero("Quantity", (v) => quantity = v);
        ui.boton("Generate!", async () => {
            for(let i=0; i<quantity; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                await window.SceneManager.instantiatePrefabFromPath("Assets/Enemy.ceprefab", x, y);
            }
        });
    }
});
```

---

## 🐛 Chapter 7: Library Debugging

Since libraries are pure JavaScript, you can use the browser's developer tools (F12):
1. Open the **Sources** tab.
2. Look for your file in the `lib/` folder.
3. Set breakpoints.
4. Use `console.dir(window.CreativeEngine)` to inspect the available API.

---

## 📦 Chapter 8: Publication and Best Practices

- **Encapsulation:** Always use the `(function() { ... })();` pattern to avoid contaminating the global space.
- **Performance:** Do not perform heavy calculations on the editor's main thread; use `setTimeout` or `Worker` if necessary.
- **Iconography:** Use the internal SVG icon library if you want your buttons to look native.

---
*This document is a living guide. If you create a useful library, share it with the community!*
