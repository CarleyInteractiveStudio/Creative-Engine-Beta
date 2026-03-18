# 📜 Scripting Master Guide (CES) - Creative Engine

Creative Engine uses **CES (Creative Engine Script)**, a powerful language based on JavaScript but simplified for game creators. This guide will teach you everything from the basics to complex systems.

---

## 🚀 Fundamental Concepts

### 1. The Mandatory Import
Every script must start with the instruction to connect to the engine:
```ces
engine motor;
```
*(Note: You can also use `ve motor;` as it is an alias)*

### 2. Direct Access (No Prefixes)
Unlike other engines, you DO NOT need to write `this.` or `mtr.` to access an object's components. If the object has a `SpriteRenderer`, simply write `spriteRenderer`.

---

## 💎 Public Variables (Inspector)
To make a variable appear in the editor's Inspector, use the `public` keyword.

```ces
public number speed = 5;
public text playerName = "Hero";
public boolean isInvincible = false;
public Materia target; // A box will appear to drag objects into
public Sprite icon;
public Audio jumpSound;
```

---

## ⏱️ Lifecycle Events
These are functions that the engine calls automatically at specific moments.

```ces
// Runs once when the object appears in the game
start() {
    log("Hello World!");
}

// Runs every frame (approx. 60 times per second)
update(delta) {
    // delta is the time elapsed since the last frame
}

// Runs at fixed intervals (ideal for physics)
fixedUpdate(delta) {
}

// Runs when the object is clicked
onPointerClick() {
}
```

---

## ⌨️ Input and Movement
Control your characters easily.

```ces
update(delta) {
    // Key pressed (held)
    if (teclaPresionada("d")) {
        transform.position.x += speed;
        flipX = false;
    }

    // Key just pressed (single pulse)
    if (teclaRecienPresionada("Space") && isTouchingTag("Ground")) {
        rigidbody2D.applyImpulse(new Vector2(0, -10));
    }

    // Mouse
    if (botonMouseRecienPresionado(0)) { // 0: Left, 1: Middle, 2: Right
        let mousePos = obtenerPosicionMouse();
        log("Click at: " + mousePos.x + ", " + mousePos.y);
    }
}
```

---

## 🤖 Practical Examples

### 🎮 Example 1: Full Character Controller
This script handles movement, jumping, animations, and sound.

```ces
engine motor;

public number speed = 300;
public number jumpForce = 15;

update(delta) {
    let movX = 0;

    if (teclaPresionada("ArrowRight")) {
        movX = 1;
        flipX = false;
    } else if (teclaPresionada("ArrowLeft")) {
        movX = -1;
        flipX = true;
    }

    // Move using Rigidbody
    rigidbody2D.velocity.x = movX * (speed * delta);

    // Animation Control via Proxy
    if (movX != 0) {
        play.Walk();
    } else {
        play.Idle();
    }

    if (teclaRecienPresionada("Space") && isTouchingTag("Ground")) {
        rigidbody2D.applyImpulse(new Vector2(0, -jumpForce));
        play.Jump(); // Plays sound or animation
    }
}
```

### 👾 Example 2: NPC with AI and Detection
An enemy that follows the player if they see them.

```ces
engine motor;

public Materia player;
public number detectionDistance = 400;

update(delta) {
    if (player == null) {
        player = find("Player");
        return;
    }

    let dist = distance(transform.position, player.transform.position);

    if (dist < detectionDistance) {
        // Look towards the player
        if (player.transform.position.x > transform.position.x) {
            transform.position.x += 2;
            flipX = false;
        } else {
            transform.position.x -= 2;
            flipX = true;
        }
        play.Run();
    } else {
        play.Idle();
    }
}
```

---

## 🪄 Special Creative Engine Functions

### ⏳ Coroutines (Wait)
Pause script logic without freezing the game.
```ces
start() {
    log("Starting countdown...");
    esperar(3);
    log("GO!");
}
```

### 🔁 Timed Loops (Each)
Execute something repeatedly every X seconds.
```ces
start() {
    cada(1.5) {
        log("One and a half seconds have passed");
        // Ideal for spawning enemies or regenerating health
    }
}
```

### 📢 Global Messaging
Communicate scripts with each other cleanly.
```ces
// In Script A:
broadcast("Victory", { level: 1 });

// In Script B:
onReceive("Victory", (data) => {
    log("You won level " + data.level);
});
```
