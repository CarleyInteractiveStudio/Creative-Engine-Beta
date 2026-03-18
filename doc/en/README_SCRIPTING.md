# 📜 Master Scripting Guide (CES) - Creative Engine

Creative Engine uses **CES (Creative Engine Script)**, a powerful language based on JavaScript but simplified for game creators. This guide will teach you everything from basics to complex systems.

---

## 🚀 Core Concepts

### 1. Mandatory Import
Every script must start with the instruction to connect to the engine:
```ces
engine motor;
```
*(Note: you can also use `ve motor;`, as they are aliases)*

### 2. Direct Access (No Prefixes)
Unlike other engines, you DO NOT need to write `this.` or `mtr.` to access the object's components. If the object has a `SpriteRenderer`, just write `spriteRenderer`.

---

## 💎 Public Variables (Inspector)
To make a variable appear in the editor's Inspector, use the `public` keyword.

```ces
public number speed = 5;
public string playerName = "Hero";
public boolean isInvincible = false;
public Materia target; // A box for dragging and dropping objects will appear
public Sprite icon;
public Audio jumpSound;
```

---

## ⏱️ Lifecycle Events
These are functions that the engine calls automatically at specific moments.

```ces
// Executed once when the object appears in the game
start() {
    log("Hello World!");
}

// Executed every frame (approx. 60 times per second)
update(delta) {
    // delta is the time elapsed since the last frame
}

// Executed at fixed intervals (ideal for physics logic)
actualizarFijo(delta) {
}

// Executed when the object is clicked
onPointerClick() {
}
```

---

## ⌨️ Input & Movement
Control your characters easily.

```ces
update(delta) {
    // Key pressed (held)
    if (teclaPresionada("d")) {
        position.x += speed;
        flipX = false;
    }

    // Key just pressed (single pulse)
    if (teclaRecienPresionada("Space") && estaTocandoTag("Ground")) {
        physics.applyImpulse(new Vector2(0, -10));
    }

    // Mouse
    if (botonMouseRecienPresionado(0)) { // 0: Left, 1: Middle, 2: Right
        any mousePos = obtenerPosicionMouse();
        log("Clicked at: " + mousePos.x + ", " + mousePos.y);
    }
}
```

---

## 🪄 Creative Engine Special Functions

### ⏳ Coroutines (Wait)
Pause script logic without freezing the game.
```ces
start() {
    log("Starting countdown...");
    wait(3);
    log("GO!");
}
```

### 🔁 Timed Loops (Each)
Repeat something every X seconds.
```ces
start() {
    cada(1.5) {
        log("A second and a half passed");
        // Great for spawning enemies or regenerating health
    }
}
```
