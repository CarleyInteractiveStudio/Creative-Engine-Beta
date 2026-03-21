# 📚 The Book of Extensibility: Libraries and Tools (.celib) — Creative Engine

Welcome to the advanced level, Architect! If you are here, it is because you not only want to create games but also want to **create the tools others will use** or empower the engine with unique functions.

In **Creative Engine**, the library system (.celib) allows you to inject pure JavaScript directly into the editor or the heart of the game. This guide will teach you how to expand the limits of what is possible.

---

## 📖 Table of Contents

1. [Chapter 1: The Power of Extensibility](#chapter-1-the-power-of-extensibility)
2. [Chapter 2: Anatomy of a Library (.celib)](#chapter-2-anatomy-of-a-library-celib)
3. [Chapter 3: Creating Editor Tools](#chapter-3-creating-editor-tools)
4. [Chapter 4: UI Builder API Reference](#chapter-4-ui-builder-api-reference)
5. [Chapter 5: Runtime Extensions (New APIs for CES)](#chapter-5-runtime-extensions-new-apis-for-ces)
6. [Chapter 6: Pro Example - Mass Renamer](#chapter-6-pro-example---mass-renamer)
7. [Chapter 7: Pro Example - Global Achievement System](#chapter-7-pro-example---global-achievement-system)
8. [Chapter 8: Installation and Distribution](#chapter-8-installation-and-distribution)

---

## 🏛️ Chapter 1: The Power of Extensibility

Why use libraries?
- **Automation:** Create buttons that generate entire levels or set up lights automatically.
- **Custom APIs:** Add functions like `myDatabase.save()` that feel native in CES.
- **Personalization:** Change the editor's workflow to suit you.

Creative Engine is an **"Engine-as-a-Platform"**: you have the keys to the kingdom.

---

## 🦴 Chapter 2: Anatomy of a Library (.celib)

A library is technically a standard JavaScript file wrapped in an Immediately Invoked Function Expression (IIFE) to avoid conflicts.

```javascript
(function() {
    // Your logic here
    console.log("My library has loaded correctly.");
})();
```

---

## 🛠️ Chapter 3: Creating Editor Tools

You can add custom windows to the editor's **Window** menu using `CreativeEngine.API.registrarVentana`.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "My Tool",
        ancho: 350,
        alto: 250,
        alAbrir: function(panel) {
            panel.texto("Hello from the code!");
            panel.boton("Click Me", () => alert("It works!"));
        }
    });
})();
```

---

## 🍱 Chapter 4: UI Builder API Reference

The `panel` object you receive in `alAbrir` is a dynamic interface factory. Here is everything you can create:

### Basic Elements:
- **`texto(content, options)`**: Displays text. Options: `{ negrita: true, color: "#hex", tamano: "14px" }`.
- **`boton(label, clickCallback)`**: An interactive button.
- **`input(label, callback)`**: Text field. The callback returns the value on change.
- **`numero(label, callback)`**: Numeric field for precise values.
- **`checkbox(label, initialValue, callback)`**: Boolean switch.
- **`slider(label, options, callback)`**: Options: `{ min, max, paso }`.

### Organization:
- **`fila(callback)`**: Creates a horizontal container. Inside the callback, you use the new row object.
- **`columna(callback)`**: Same as row, but vertical.
- **`separador()`**: A subtle line for visual organization.
- **`imagen(src)`**: Displays an icon or preview.

---

## 🎮 Chapter 5: Runtime Extensions (New APIs for CES)

This is the most powerful part: adding functions that your `.ces` scripts can use. This is done via `CreativeEngine.API.registrarRuntimeAPI`.

**In your .js file:**
```javascript
(function() {
    const MyAPI = {
        greet: (name) => "Hello " + name,
        getPoints: () => 100
    };
    CreativeEngine.API.registrarRuntimeAPI("Utilities", MyAPI);
})();
```

**Usage in a Script (.ces):**
```ces
ve motor;
go "Utilities"; // Import the extension

alEmpezar() {
    variable msg = greet("Player"); // Direct use!
}
```

---

## 🚀 Chapter 6: Pro Example - Mass Renamer

This tool finds all objects in the scene and adds a prefix to them.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Batch Renamer",
        alAbrir: (ui) => {
            ui.texto("Add a prefix to all objects:");
            let prefix = "OBJ_";

            ui.input("Prefix", (v) => prefix = v);

            ui.boton("Rename All!", () => {
                const materias = window.SceneManager.currentScene.getAllMaterias();
                materias.forEach(m => m.name = prefix + m.name);
                window.updateHierarchy(); // Refresh visual list
                alert("Renamed " + materias.length + " objects.");
            });
        }
    });
})();
```

---

## 🏆 Chapter 7: Pro Example - Global Achievement System

Create a system that saves progress persistently.

```javascript
(function() {
    const Achievements = {
        list: [],
        unlock: function(id) {
            if (!this.list.includes(id)) {
                this.list.push(id);
                console.log("🏆 Achievement unlocked: " + id);
                // Here you could save to localStorage
            }
        }
    };
    CreativeEngine.API.registrarRuntimeAPI("Achievements", Achievements);
})();
```

---

## 📦 Chapter 8: Installation and Distribution

1. Write your code in a `.js` file.
2. Rename the extension to `.celib` (optional, the engine also accepts `.js`).
3. **Drag** the file to the editor's **Assets** panel.
4. The engine will automatically move it to your project's `/lib` folder.
5. Activate it from the **Libraries** menu.
6. **Restart the editor** (or reload the page) for the code injection to be complete.

---
*Need deeper APIs? Contact the development team to access the low-level SDK.*
