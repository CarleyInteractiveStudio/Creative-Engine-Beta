# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome, Creator! You hold in your hands the ultimate guide to mastering **Creative Engine**. This is not just a technical manual; it is your map to creative freedom. The **CES (Creative Engine Script)** language has been forged so that the distance between your imagination and your game is as short as possible.

In this digital "book," we will explore everything from the foundations of logic to the most advanced architectures. Get ready, because **programming is simpler than you think, and here we will show you why**.

---

## 📖 Table of Contents

0. [Chapter 0: Your First Script in 60 Seconds](#chapter-0-your-first-script-in-60-seconds)
1. [Chapter 1: The Engine's Philosophy](#chapter-1-the-engines-philosophy)
2. [Chapter 2: Anatomy of a Script](#chapter-2-anatomy-of-a-script)
3. [Chapter 3: Variables and the Dynamic Inspector](#chapter-3-variables-and-the-dynamic-inspector)
4. [Chapter 4: The Game's Rhythm (Lifecycle)](#chapter-4-the-games-rhythm-lifecycle)
5. [Chapter 5: Total Interaction (Input and Physics)](#chapter-5-total-interaction-input-and-physics)
6. [Chapter 6: The Component Dictionary (API Reference)](#chapter-6-the-component-dictionary-api-reference)
7. [Chapter 7: Object Communication (Global Messaging)](#chapter-7-object-communication-global-messaging)
8. [Chapter 8: Temporal Magic (Coroutines and Loops)](#chapter-8-temporal-magic-coroutines-and-loops)
9. [Chapter 9: The Cookbook (Solutions Recipe Book)](#chapter-9-the-cookbook-solutions-recipe-book)
10. [Chapter 10: Optimization and Best Practices](#chapter-10-optimization-and-best-practices)
11. [Chapter 11: Troubleshooting and FAQ](#chapter-11-troubleshooting-and-faq)

---

## ⚡ Chapter 0: Your First Script in 60 Seconds

Want to see results now? Follow these steps:

1. In the **Asset Browser**, right-click and select **New > Script (CES)**. Name it `HelloWorld.ces`.
2. Double-click to open it and paste this code:
```ces
ve motor;

alEmpezar() {
    imprimir("The engine is alive!");
}

alActualizar(delta) {
    rotation += 100 * delta; // This will make the object spin!
}
```
3. Drag that file from the library onto any object (an image or a square) in your scene.
4. Hit **Play**! 🚀

---

## 🏛️ Chapter 1: The Engine's Philosophy

Creative Engine was born under one premise: **Code must be human-readable and machine-powerful.**

Unlike other engines that force you to deal with thousands of lines of "boilerplate" (junk code), in CES every line counts. We've removed the need for `this.`, `mtr.`, or redundant prefixes. If an object has health, simply write `health`. If you want to move it, write `posicion` or `position`.

**The goal is for your code to look like a description of what you want to happen.**

---

## 🦴 Chapter 2: Anatomy of a Script

Every script in Creative Engine begins with a declaration of intent:

```ces
ve motor;
```

This line is not optional; it is the bridge that connects your text file to the heart of the engine. From here, your script becomes a "Law" that governs the behavior of a "Materia" (object).

---

## 💎 Chapter 3: Variables and the Dynamic Inspector

The power of Creative Engine lies in its **Inspector**. By declaring variables as `publico` (public), they magically appear in the editor's interface, allowing you to adjust the game while it's running.

### Supported Data Types:
- **`number`**: For speeds, forces, health, etc.
- **`text`**: For names, dialogues, or IDs.
- **`boolean`**: Switches for `true` or `false`.
- **`Materia`**: For referencing other objects in the scene.
- **`Prefab`**: To instantiate (create) new objects (like bullets or enemies).
- **`Audio` / `Sprite` / `Scene`**: References to project resources.

```ces
publico number jumpForce = 12;
publico boolean canFly = false;
publico Materia targetCamera;
```

---

## ⏱️ Chapter 4: The Game's Rhythm (Lifecycle)

A game is an illusion created by images that change rapidly. Your script lives within that heartbeat:

1. **`alEmpezar()` / `start()`**: Your golden opportunity to configure the object. Runs only once.
2. **`alActualizar(delta)` / `update(delta)`**: Happens approximately 60 times per second. This is where you process movement and constant logic.
3. **`actualizarFijo(delta)` / `fixedUpdate(delta)`**: The physics engine runs here. Use it for constant forces to prevent objects from "passing through" walls.
4. **`alHacerClick()` / `onPointerClick()`**: Direct response to the player's touch.

---

## ⌨️ Chapter 5: Total Interaction (Input and Physics)

The engine understands your commands naturally. Whether it's keyboard, mouse, or gamepad, the API is consistent:

```ces
alActualizar(delta) {
    // Keyboard
    si (isKeyPressed("w")) {
        fisica.applyForce(0, -100);
    }

    // Mouse
    si (isMouseButtonJustPressed(0)) {
        variable pos = getMousePosition();
        imprimir("Click at: " + pos.x + "," + pos.y);
    }
}
```

---

## 📦 Chapter 6: The Component Dictionary (API Reference)

Here are the most common shortcuts the engine gives you for free:

- **`posicion` (Transform)**: The object's DNA. Controls `x`, `y`, `rotation`, and `scale`.
- **`fisica` (Rigidbody2D)**: Newton's engine. Use `applyImpulse` for jumps and `velocity` to run.
- **`vida` (Health)**: Manages mortality. Use `damage(10)` or `heal(5)`.
- **`animacion` (Animator)**: The film director. Use `play("Run")` to change states.
- **`audio` (AudioSource)**: The object's voice. Use `play()` or `stop()`.

---

## 📡 Chapter 7: Object Communication (Global Messaging)

Forget searching for objects all over the hierarchy. The **Global Messaging** system allows your scripts to talk to each other without knowing each other.

**Emitter:**
```ces
broadcast("LevelCompleted", { time: 45 });
```

**Receiver:**
```ces
onReceive("LevelCompleted", (data) => {
    imprimir("Congratulations! You did it in " + data.time + " seconds.");
});
```

---

## 🪄 Chapter 8: Temporal Magic (Coroutines and Loops)

### The Art of Waiting (`esperar`)
In CES, you can pause a script's logic without freezing the game. This is vital for cutscenes or effects.

```ces
async alEmpezar() {
    imprimir("3...");
    esperar(1);
    imprimir("2...");
    esperar(1);
    imprimir("1...");
    esperar(1);
    imprimir("FIRE!");
}
```

### The Power of Repetition (`cada`)
Do you need to generate a coin every 5 seconds? Don't use complicated manual counters:

```ces
alEmpezar() {
    cada(5) {
        create coinPrefab;
    }
}
```

---

## 🍳 Chapter 9: The Cookbook (Solutions Recipe Book)

### 🏃 Pro Platformer Movement System
```ces
ve motor;
publico number speed = 300;
publico number jumpForce = 15;

alActualizar(delta) {
    variable horizontal = 0;
    si (isKeyPressed("d")) horizontal = 1;
    si (isKeyPressed("a")) horizontal = -1;

    fisica.velocity.x = horizontal * (speed * delta);

    si (horizontal != 0) {
        voltearH = (horizontal < 0);
        play.Walk();
    } sino {
        play.Idle();
    }

    si (isKeyJustPressed("Space") and isTouchingTag("Ground")) {
        fisica.applyImpulse(new Vector2(0, -jumpForce));
    }
}
```

### 🎯 Shooting System with Cooldown
```ces
ve motor;
publico Prefab bullet;
publico number fireRate = 0.5;
number nextFireTime = 0;

alActualizar(delta) {
    si (isKeyPressed("f") and nextFireTime <= 0) {
        create bullet;
        nextFireTime = fireRate;
        play.Shoot();
    }

    si (nextFireTime > 0) {
        nextFireTime -= delta;
    }
}
```

### 🔘 Interactable UI Button
```ces
ve motor;
publico text messageOnClick = "Hello!";

alHacerClick() {
    textoUI.text = messageOnClick;
    play.ClickSound();
    imprimir("Button pressed");
}
```

---

## ⚙️ Chapter 10: Optimization and Best Practices

To keep your game running at 60 FPS even on mobile, follow these tips:

1. **Use `delta`**: Always multiply your movements by `delta`. This ensures your game runs at the same speed on a powerful PC and an old one.
2. **Avoid `find()` in `update`**: Searching for objects by name is slow. Do it in `start` and save the result in a variable.
3. **Pooling**: Instead of destroying and creating hundreds of bullets, try to reuse them.
4. **Collision Layers**: Configure in the project settings which objects collide with which to save processing power.

---

## 🛠️ Chapter 11: Troubleshooting and FAQ

**Q: My script does nothing.**
A: Ensure the first line is `ve motor;` and the script is assigned to an active object in the scene.

**Q: The Inspector doesn't show my variables.**
A: You must declare them with the `publico` keyword before the type (e.g., `publico number speed = 10;`).

**Q: Can I use standard JavaScript?**
A: Yes! CES is a layer over JS. You can use `Math.random()`, `Array.push()`, etc.

**Q: How do I destroy the current object?**
A: Use `destruir(mtr);` or simply `destruir(materia);`.

---

## 🎉 Epilogue: Your Journey Begins Now

You've finished the Master Book, but your story as a developer is just beginning. **Creative Engine** is the canvas, and you are the artist.

Don't be afraid to experiment. Break the rules, combine components, and above all, **have fun**. If you can imagine it, you can program it here.

> "The best way to predict the future is to create it." — Peter Drucker

---
*Questions? Consult the [Component Guide](README_COMPONENTES.md) or join our official community.*
