# 📜 Master Scripting Guide (CES) - Creative Engine

Creative Engine uses **CES (Creative Engine Script)**, a powerful language based on JavaScript but simplified for game creators. This guide will teach you everything from basics to advanced systems.

---

## 🚀 Core Concepts

### 1. Mandatory Import
Every script must start with the connect instruction:
```ces
ve motor;
```

### 2. Direct Access (No Prefixes)
Unlike other engines, you DO NOT need to write `this.` or `mtr.` to access an object's components. If the object has a `SpriteRenderer`, just write `spriteRenderer`.

### 3. Multilingual by Design
You can code using either English or Spanish terms interchangeably. The engine understands both. For example, `physics` is the same as `fisica`.

---

## 💎 Public Variables (Inspector)
To make a variable appear in the editor's Inspector, use the `public` keyword.

```ces
public number speed = 5;
public text playerName = "Hero";
public boolean isInvincible = false;
public Matter target; // A slot for dragging objects will appear
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
    print("Hello World!");
}

// Executed every frame (approx. 60 times per second)
update(delta) {
    // delta is the time elapsed since the last frame
}

// Executed at fixed intervals (ideal for physics)
fixedUpdate(delta) {
}

// Executed when clicking the object
onClick() {
}
```

---

## ⌨️ Input & Movement
Control your characters easily.

```ces
update(delta) {
    // Key pressed (held)
    if (isKeyPressed("d")) {
        position.x += speed;
        flipX = false;
    }

    // Key just pressed (single pulse)
    if (isJustKeyPressed("Space") && isTouchingTag("Ground")) {
        physics.applyImpulse(new Vector2(0, -10));
    }

    // Mouse
    if (isMouseJustPressed(0)) { // 0: Left, 1: Middle, 2: Right
        variable mousePos = getMousePosition();
        print("Clicked at: " + mousePos.x + ", " + mousePos.y);
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
        print("You won with " + data.score + " points!");
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
    print("3 seconds passed!");
}
```

### 🔁 Timed Loops (Each)
```ces
start() {
    every(1.5) {
        print("Spawning enemy...");
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

### 🧠 UI Detection
```ces
// Check if two UI elements overlap (ideal for inventories)
if (checkUIOverlap(item, slot)) {
    print("Object placed!");
}
```

---

## 🛠️ Engine Utilities
- `find(name)`: Locate an object in the scene.
- `destroy(matter)`: Remove an object.
- `raycast(origin, direction, distance, tag)`: 2D Raycasting.
- `isTouchingTag(tag)`: Quick collision detection.
- `instantiate(original, x, y)`: Clone an existing object.
- `create myPrefab`: Instance a prefab by name.
- `checkUIOverlap(mtrA, mtrB)`: Detect collision between UI elements.
