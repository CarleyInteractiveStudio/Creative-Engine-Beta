# 📚 Libraries and Extensibility Guide - Creative Engine

Libraries in Creative Engine (`.celib` files) allow you to extend both the editor interface and the programming capabilities of your games.

---

## 🛠️ 1. Interface Libraries (Editor Tools)

You can create your own custom windows and tools for the editor using `CreativeEngine.API`.

### Registering a Window
To make your tool appear in the **Window** menu, use:

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "My Super Tool",
        estilo: "moderno", // "carl", "moderno", or empty
        ancho: 400,
        alto: 300,
        alAbrir: function(panel) {
            panel.texto("Welcome to my tool!", { bold: true, color: "#3498db" });

            panel.fila((f) => {
                f.boton("Greet", () => alert("Hello!"));
                f.boton("Close", () => panel.elemento.remove());
            });

            panel.separador();

            panel.input("Your Name", (value) => {
                console.log("Name entered: " + value);
            });
        }
    });
})();
```

---

## 🎮 2. Runtime Libraries (New Script Functions)

If you want to add new functions that can be used within your `.ces` scripts, you must register a runtime API.

### Example: Advanced Math Library
Create a JS file and register it like this:

```javascript
(function() {
    const MyCalculator = {
        sum: (a, b) => a + b,
        square: (n) => n * n,
        generateID: () => "ID_" + Math.random().toString(36).substr(2, 9)
    };

    // This will make "MyCalculator" available in .ces scripts
    CreativeEngine.API.registrarRuntimeAPI("MyCalculator", MyCalculator);
})();
```

### How to use it in a Script (.ces)
Use the `go` keyword followed by the library name:

```ces
ve motor;
go "MyCalculator"; // Import the library

start() {
    variable result = sum(10, 5); // Lib functions are global now
    print("Result: " + result);
    print("My ID is: " + generateID());
}
```

---

## 📦 How to Create and Install a Library
1. Create a file with the `.js` extension.
2. Write your extension code (UI or Runtime).
3. In the editor, drag the `.js` file to the **Asset Browser**.
4. The engine will detect the library and move it automatically to the `/lib` folder.
5. Open the **Libraries** panel (Top Menu) to activate it.
6. **Restart the editor** for the changes to take effect.
