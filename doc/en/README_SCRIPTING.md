# 📜 Master Scripting Guide (CES) - Creative Engine

Creative Engine uses **CES (Creative Engine Script)**, a powerful language based on JavaScript but simplified for game creators. This guide will teach you everything from basics to advanced systems.

---

## 🚀 Core Concepts

### 1. Mandatory Import
Every script must start with the connect instruction:
```ces
engine motor;
```
*(Note: You can also use `ve motor;` as they are aliases)*

### 2. Direct Access (No Prefixes)
Unlike other engines, you DO NOT need to write `this.` or `mtr.` to access an object's components. If the object has a `SpriteRenderer`, just write `spriteRenderer`.

---

## 💎 Public Variables (Inspector)
To make a variable appear in the editor's Inspector, use the `public` keyword.

```ces
public number speed = 5;
public text playerName = "Hero";
public boolean isInvincible = false;
public Materia target; // A slot for dragging objects will appear
public Sprite icon;
public Audio jumpSound;
public Prefab enemy;
public Scene nextLevel;
```

---

## ⏱️ Lifecycle Events
These are functions called automatically at specific moments.

```ces
// Executed once when the object appears in the game
start() {
    log("Hello World!");
}

// Executed every frame (approx. 60 times per second)
update(delta) {
    // delta is the time elapsed since the last frame
}

// Executed at fixed intervals (ideal for physics)
actualizarFijo(delta) {
}

// Executed when clicking the object
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

## 📢 Global Messaging
Communicate between scripts without coupling.

```ces
// In Player Script:
broadcast("Victory", { score: 100 });

// In UI Script:
start() {
    onReceive("Victory", (data) => {
        log("You won with " + data.score + " points!");
    });
}
```

---

## 🪄 Special Functions & Proxies

### ⏳ Coroutines (Wait)
Pause logic without freezing the game.
```ces
start() {
    wait(3);
    log("3 seconds passed!");
}
```

### 🔁 Timed Loops (Each)
```ces
start() {
    cada(1.5) {
        log("Spawning enemy...");
        create enemyPrefab;
    }
}
```

### 🎭 Animation & Audio Proxies
Call states or clips directly by name:
```ces
play.Walk();       // In AnimatorController
reproducir.Jump(); // Spanish alias
play.Explosion();  // In AudioSource
```

---

## 🛠️ Engine Utilities
- `find(name)`: Locate an object in the scene.
- `destroy(materia)`: Remove an object.
- `raycast(origin, direction, distance, tag)`: 2D Raycasting.
- `isTouchingTag(tag)`: Quick collision detection.
- `instantiate(original, x, y)`: Clone an existing object.
- `create myPrefab`: Instance a prefab by name.
