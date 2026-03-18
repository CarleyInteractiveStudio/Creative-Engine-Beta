# 📚 Library Extension Guide (.celib) - Creative Engine

Libraries allow you to extend the engine with your own panels, components, and runtime functions.

---

## 📂 1. Directory Structure

All libraries must be placed in the `/lib` folder of your project:
- `/lib/MyLib.celib`: The library package itself.
- `/lib/MyLib.celib.meta`: Current status and user-granted permissions.

---

## 🛠️ 2. Creating a Library

A library is a JSON package containing a JavaScript script.
1. Use **Library Window > Create**.
2. Write your script inside an IIFE (Immediately Invoked Function Expression).

### Example: Custom Panel
```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "My Tool",
        alAbrir: function(panel) {
            panel.texto("Custom Content");
            panel.boton("Action", () => console.log("Done!"));
        }
    });
})();
```

---

## 🔒 3. Permissions

For security, the engine requires you to grant permissions explicitly in the **Library Details** view:
- **Create Windows:** Allows the library to add entries to the Window menu.
- **Runtime Access:** Allows `.ces` scripts to call the library's internal functions.
- **Custom Components:** Allows the library to register new logic for Materias.

---

## 🧪 4. Using in Scripts (.ces)

Import the library using the `go` command:
```ces
go "MyLib"

start() {
    variable result = myCustomFunction(10);
    log(result);
}
```
*(Note: `myCustomFunction` must be exported by the library script)*
