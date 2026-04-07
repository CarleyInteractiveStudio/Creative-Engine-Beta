# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}
```
3. **Assign:** Drag it to a Materia. Hit Play and press Space!

---

## 🏛️ Chapter 1: Philosophy and Architecture

### Why Creative Engine?
Most modern engines suffer from **"Over-engineering"**. Creative Engine was designed to eliminate the friction between thought and execution.

**The concept of "Laws" and "Materias":**
- **Materia:** It is the empty container (the object). It has no weight or shape of its own.
- **Laws:** These are the components. By adding a "Physics" Law, the Materia begins to fall. By adding a "Script" Law, the Materia acquires will.

This decoupled architecture allows your games to be extremely modular and easy to debug.

---

## 🦴 Chapter 2: The CES Language

CES is not a new language from scratch; it is a **High-Level Abstraction** over JavaScript (ES6+), designed to be natural and powerful.

### Natural Logic (New)
You can now write conditions as if you were speaking:
- **`si (health is 10 and energy equals 100)`** -> Support for `y`, `o`, `es` (is), `igual a` (equals).
- **`si (score different to 0 or time less than 10)`** -> Support for `diferente a`, `menor a`, `mayor a`.

### The Magic of Omission
In CES, the context is implicit. The engine knows that if you are writing a script for the "Player", any mention of `health` refers to the health *of that player*.
- **Before:** `this.materia.getComponent("Health").currentHealth -= 10;`
- **Now (CES):** `health.damage(10);`

The transpiler handles converting that simplicity into optimized JavaScript code that the browser can execute at lightning speeds.

---

## 💎 Chapter 3: The Dynamic Inspector

The Inspector is not just a list of variables; it is a real-time window into the state of your game.

### Visibility Attributes
Using `publico` (public) before a variable tells the engine to create an editing widget in the interface:

- **`publico number`**: Creates a slider and numeric field.
- **`publico Materia`**: Creates a "Drag & Drop" slot that only accepts objects from the scene.
- **`publico Prefab`**: Allows selecting `.ceprefab` files from your library.

**Technical Tip:** The engine performs an automatic "Dependency Injection". If you drag an object that has a `SpriteRenderer` into a variable of type `Sprite`, the engine will automatically extract the correct component.

---

## ⏱️ Chapter 4: The Heartbeat: Deep Lifecycle

Your script has biological stages:

1. **`alEmpezar()` / `start()` (Late Constructor):** Runs once when the object enters the active scene. Use it to initialize random states or search for references.
2. **`alActualizar(delta)` / `update(delta)` (Main Loop):** The place for visual logic. It synchronizes with your screen's refresh rate (RequestAnimationFrame).
3. **`actualizarFijo(delta)` / `fixedUpdate(delta)` (Physics Tick):** Crucial for stability. While `update` may vary depending on graphical load, `fixedUpdate` runs at constant intervals (e.g., 50Hz), ensuring that collisions do not fail.
4. **`alDestruir()` / `onDestroy()` (Cleanup):** Triggers just before the object disappears. Use it to free memory or broadcast death messages.

---

## ⌨️ Chapter 5: Galvanic Interaction (Input)

The engine abstracts the complexity of hardware events into a direct query API (Polling):

### Keyboard
- `isKeyPressed("a")`: Returns `true` as long as the key is held down.
- `isKeyJustPressed("Space")`: Only returns `true` on the first frame of the pulse. Ideal for jumps.

### Mouse and Touch
- `isMouseButtonJustPressed(0)`: 0 is left, 1 central, 2 right.
- `getMousePosition()`: Returns an `{x, y}` object in world coordinates.

---

## 📦 Chapter 6: The Great Component Reference (API)

Here we break down the capabilities of the most important components:

### 📍 Transformation (`posicion`, `position`)
- **`.x`, `.y`**: Spatial coordinates.
- **`.rotation`**: Angle in degrees.
- **`.scale`**: Relative size (e.g., 2 is double).
- **`lookAt(target)`**: Instantly rotates the object towards another object or position.

### ⚖️ Physics (`fisica`, `rigidbody2D`)
- **`.velocityX`, `.velocityY`**: Direct shortcuts for axis movement.
- **`.velocity`**: Current movement vector `{x, y}`.
- **`.gravityScale`**: How much gravity affects the object (0 = floats).
- **`applyForce(x, y)`**: Constant push (like a motor).
- **`applyImpulse(x, y)`**: Instant force (like an explosion).

### 🩸 Health (`vida`, `health`)
- **`.currentHealth`**: Current life.
- **`.maxHealth`**: Maximum limit.
- **`damage(n)`**: Subtracts life and triggers death events if it reaches 0.
- **`heal(n)`**: Adds life without exceeding the maximum.

### 🎬 Animation (`animador`, `animator`)
- **`play("Name")`**: Changes to the desired animation state.
- **`stop()`**: Freezes the current frame.
- **`play.Run()`**: Dynamic proxy for quick calls.

---

## 📡 Chapter 7: The Neural Network (Messaging)

Why avoid direct references (`find()`)?
If Script A depends on Script B, and you delete Script B, Script A will fail. The **Message** system eliminates this coupling.

- **`broadcast("HeatWave", { intensity: 10 })`**: Sends a signal into the air. It doesn't care who listens to it.
- **`onReceive("HeatWave", (data) => { ... })`**: The script stays "listening". If the message arrives, it reacts.

This pattern (Observer) is the basis of scalable professional games.

---

## 🪄 Chapter 8: Time Control and Asynchrony

### Coroutines (`esperar`)
In CES, all methods are asynchronous by default. This allows you to write temporal sequences as if they were a list of instructions:

```ces
async alHacerClick() {
    flipX = true;
    esperar(0.5);
    flipX = false;
}
```

### The Periodic Loop (`cada`)
It is an elegant way to create "life intervals":
```ces
alEmpezar() {
    cada(2) {
        imprimir("2 more seconds have passed");
    }
}
```

---

## 🍳 Chapter 9: The Great Cookbook

### 🎒 Inventory System with Slots
```ces
ve motor;
publico number maxSlots = 5;
variable items = [];

function addItem(name) {
    si (items.length < maxSlots) {
        items.push(name);
        broadcast("UpdateUI", { inventory: items });
        retornar true;
    }
    retornar false;
}
```

### 🧠 Boss AI with Phases
```ces
ve motor;
publico number phase2Health = 50;

alActualizar(delta) {
    si (health.currentHealth > phase2Health) {
        phase1Behavior();
    } sino {
        phase2Behavior();
    }
}

function phase2Behavior() {
    scale.x = 2; // The boss grows
    fisica.gravityScale = 0; // Starts floating
}
```

---

## ⚙️ Chapter 10: Industrial Grade Performance

### The cost of `find()`
Calling `find("Player")` forces the engine to go through the entire list of objects. If you have 1000 objects and you do it every frame, the game will be slow.
**Solution:** Search once in `start` and save the reference.

### Object Pooling
Creating and destroying objects (`create`, `destroy`) consumes CPU and generates "garbage" that the browser must clean.
**Best practice:** For projectiles, create a "pool" of 20 bullets at the beginning, deactivate them and activate them as needed.

---

## 🛠️ Chapter 11: Under the Hood

### The Transpilation Process
When you save a `.ces` file, this happens:
1. **Scanner:** Keywords like `si`, `publico`, `ve` are searched.
2. **Mapper:** Aliases are translated (e.g., `fisica` -> `this.obtenerComponente('Rigidbody2D')`).
3. **Wrapper:** Your code is wrapped in an ES6 class that inherits from `CreativeScriptBehavior`.
4. **Injection:** Input and engine APIs are injected.

This process ensures you write easy code but run professional code.

---

## 🛠️ Chapter 12: Smart Console and Auto Repair

Creative Engine includes advanced tools to ensure you never get stuck:

### 🧠 Smart Console
The console doesn't just tell you what failed, but **where** and **how** to fix it:
- **Error Translation**: Technical errors are converted into clear explanations.
- **"Go to Line" Button**: Opens the editor and highlights the exact line of the failure.
- **"Auto Repair" Button**: Analyzes your code and proposes a solution based on thousands of correct patterns.

### 📜 History and Backups
Did you delete something important? In the Code Editor, click on **"History"** to view and restore the last 10 saved versions of your script.

### ❓ Troubleshooting

If you have an error, check our **Quick Solution Guide** (available in the Spanish documentation) with over 50 solutions to common problems.

**Q: My object passes through walls.**
A: Make sure to use `fixedUpdate` for physical movement and that the `Rigidbody2D` is in "Continuous" mode if the object is very fast.

**Q: "TypeError: Cannot read properties of undefined (reading 'damage')"**
A: You are trying to call `health.damage()` on an object that does not have the **Health** component. The Auto Repair tool can add it for you.

---

## 🎉 Conclusion

You have completed the Master Book. Now, code is not a strange language, but a tool in your hands. Go and build something incredible.

---
*Want to go deeper? Explore the [Book of Extensibility](README_LIBRERIAS.md).*
