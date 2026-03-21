# 📜 Master Scripting Guide (CES) - Creative Engine

Welcome to the frontier of creation! In **Creative Engine**, scripting isn't an obstacle—it's your superpower. The **CES (Creative Engine Script)** language has been designed to be intuitive, powerful, and above all, **simpler than you think**.

This guide will take you by the hand from your first "Hello World!" to professional-level complex systems. Get ready to bring your ideas to life!

---

## 🚀 1. Your First Step: Connecting with the Engine

Every great project starts with a single line. In CES, we tell the script to connect to the engine's vital functions:

```ces
ve motor;
```
*Tip: You can also use `go motor;` if you prefer a more dynamic tone. You choose!*

### Why is CES different?
Unlike other engines where you have to write `this.transform.position.x`, in Creative Engine we've removed the bureaucracy:
- **No `this.`**: Access object properties directly.
- **No complex prefixes**: If your object has a `Health` component, just write `health.value = 100`.
- **Bilingual**: Do you prefer `posicion` or `position`? The engine understands both!

---

## 💎 2. Public Variables: The Inspector is Your Friend

Public variables allow you (or your designers) to adjust values directly from the editor without touching the code.

```ces
publico number speed = 5;
publico text message = "Watch out!";
publico boolean isHero = true;
publico Materia target;         // Drag any object here
publico Sprite icon;           // Choose an image
publico Audio explosionSound;  // Choose a sound
publico Prefab bulletPrefab;   // A reusable object
publico Scene nextLevel;       // An entire scene
```

---

## ⏱️ 3. The Lifecycle: Your Game's Heartbeat

Your script responds to automatic events that occur at key moments:

- **`alEmpezar()` / `start()`**: Runs once when the object is born. Ideal for setting initial values.
- **`alActualizar(delta)` / `update(delta)`**: The heart of the script. Runs every frame. `delta` is the exact time between frames—use it for smooth movement.
- **`actualizarFijo(delta)` / `fixedUpdate(delta)`**: Ideal for heavy physics. Runs at constant intervals.
- **`alHacerClick()` / `onPointerClick()`**: Triggers when the user touches or clicks the object.

---

## ⌨️ 4. Input and Movement

Moving a character is as natural as speaking:

```ces
alActualizar(delta) {
    // Simple Horizontal Movement
    si (isKeyPressed("d")) {
        posicion.x += speed * delta;
        voltearH = false; // Look right
    }
    si (isKeyPressed("a")) {
        posicion.x -= speed * delta;
        voltearH = true; // Look left
    }

    // Jump with a single tap
    si (isKeyJustPressed("Space") and isTouchingTag("Ground")) {
        fisica.applyImpulse(new Vector2(0, -12));
        play.Jump(); // Call the "Jump" animation instantly!
    }
}
```

---

## 📦 5. Component Reference (Expert Mode)

The engine automatically creates quick access to all components of the object. Here is the master list:

| Component | Access (Alias) | Key Functions |
| :--- | :--- | :--- |
| **Transform** | `posicion`, `position` | `x`, `y`, `rotation`, `scale`, `lookAt(x,y)` |
| **Rigidbody2D** | `fisica`, `rigidbody2D`| `applyForce(x,y)`, `applyImpulse(x,y)`, `velocity` |
| **SpriteRenderer**| `renderizadorDeSprite` | `color`, `opacity`, `spriteName` |
| **Animator** | `animador`, `animacion` | `play(name)`, `stop()`, `crossfade(name, time)` |
| **Health** | `vida`, `health` | `damage(amount)`, `heal(amount)`, `isDead` |
| **AudioSource** | `sonido`, `audio` | `play()`, `stop()`, `volume`, `loop` |
| **Attack** | `ataque`, `attack` | `executeAttack(atk)`, `cooldown` |
| **ProgressBar** | `barra`, `progressBar` | `value`, `maxValue`, `targetMateria` |

---

## 📡 6. Communication: Global Messaging

Do you want all enemies to die when the boss is defeated? Don't look for complex references—use **Messages**.

**In the Boss:**
```ces
alMorir() {
    broadcast("BossDefeated", { bonus: 500 });
}
```

**In any other script:**
```ces
alEmpezar() {
    onReceive("BossDefeated", (data) => {
        imprimir("Victory! Bonus: " + data.bonus);
        destroy(mtr); // The object self-destructs
    });
}
```

---

## 🪄 7. Magic Functions and Coroutines

### ⏳ Coroutines (`esperar`)
Pause execution without stopping the game. Perfect for sequences:
```ces
async alEmpezar() {
    imprimir("Starting sequence...");
    esperar(2);
    imprimir("2 seconds have passed!");
    play.Explosion();
}
```

### 🔁 Timed Loops (`cada`)
Create periodic events cleanly:
```ces
alEmpezar() {
    cada(3) { // Every 3 seconds
        create enemyPrefab;
        imprimir("A new enemy has appeared.");
    }
}
```

---

## 🍳 8. The Cookbook

### 🏃 Professional Double Jump
```ces
ve motor;
publico number maxJumps = 2;
number jumpsRemaining = 2;

alActualizar(delta) {
    si (isTouchingTag("Ground")) {
        jumpsRemaining = maxJumps;
    }

    si (isKeyJustPressed("Space") and jumpsRemaining > 0) {
        fisica.velocity.y = -10; // Vertical impulse
        jumpsRemaining -= 1;
        play.Jump();
    }
}
```

### 🎥 Smooth Follow Camera
```ces
ve motor;
publico Materia target;
publico number smoothing = 0.125;

alActualizar(delta) {
    si (target) {
        variable desiredPos = { x: target.posicion.x, y: target.posicion.y };
        posicion.x += (desiredPos.x - posicion.x) * smoothing;
        posicion.y += (desiredPos.y - posicion.y) * smoothing;
    }
}
```

### 🎒 Simple Inventory System
```ces
ve motor;
variable inventory = [];

alEntrarEnColision(other) {
    si (other.hasTag("Item")) {
        inventory.push(other.nombre);
        imprimir("Picked up: " + other.nombre + ". Total: " + inventory.length);
        destroy(other);
    }
}
```

---

## ⚙️ 9. Under the Hood: The Transpiler

The engine uses a **Smart Transpilation** system. This means that when you write in CES, the engine translates your code into high-performance optimized JavaScript in real-time.

- **Safety**: The engine detects errors before running the game.
- **Speed**: It runs natively in the browser without heavy layers.
- **Flexibility**: If you're an expert, you can use any JavaScript function within your CES scripts.

---

## 🎨 10. Conclusion: Your Limit is Your Imagination!

Scripting in **Creative Engine** has been designed so you can focus on the fun part: **creating**. Don't worry about perfect syntax at first; the engine will help you along the way.

Remember: **Every great game started with a single line of code.** What will yours be?

> "Programming isn't about what you know; it's about what you can imagine."

---
*Need more help? Visit our community on Discord or check out the [Component Guide](README_COMPONENTES.md).*
