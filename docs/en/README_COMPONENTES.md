# 🧩 Component Guide (Laws) - Creative Engine

In Creative Engine, **Matters** (objects) come to life through **Laws** (components). Each Law adds specific functionality, such as gravity, image rendering, or AI logic.

This guide details the use of components in both the **Inspector** and **Scripts (.ces)** using modern syntax (no prefixes like `this.` or `engine.`).

---

## 🏗️ 1. Core Components

### 📍 Transform
Defines the position, rotation, and scale of an object in 2D space.
- **Inspector Usage:** Edit X and Y values to move the object. Use Flip buttons to invert the image.
- **Scripting:**
  ```ces
  transform.position.x += 5; // Move right
  transform.rotation += 45;  // Rotate 45 degrees
  transform.scale.x = 2;    // Double horizontal size
  flipX = true; // Invert horizontally
  ```

### 🎥 Camera
Defines the visible area of the game.
- **Inspector Usage:** Set background color, zoom, and Culling Mask to decide which objects this camera sees.
- **Scripting:**
  ```ces
  camera.orthographicSize = 10; // Change zoom
  camera.backgroundColor = "#ff0000"; // Red background
  ```

---

## 🖼️ 2. Rendering and Visuals

### 🖼️ SpriteRenderer
Displays an image (.png, .jpg) or a frame from a sprite sheet (.ceSprite).
- **Inspector Usage:** Drag an image to the "Source" field. You can change the color to tint the image or adjust opacity.
- **Scripting:**
  ```ces
  spriteRenderer.color = "#00ff00"; // Tint green
  spriteRenderer.opacity = 0.5;      // Semi-transparent
  spriteRenderer.spriteName = "Jump"; // Change sprite (if using .ceSprite)
  ```

### 🌊 Water
Particle-based physical fluid simulation.
- **Inspector Usage:** Define width and height of the water area. Adjust density (buoyancy) and viscosity.
- **Scripting:**
  ```ces
  water.density = 2.0; // Objects will float more
  water.showTides = true;
  ```

---

## ⚙️ 3. 2D Physics

### ⚖️ Rigidbody2D (Physics)
Allows the object to react to gravity and collisions.
- **Inspector Usage:** Change body type to "Dynamic" to fall, or "Kinematic" to move manually while still detecting collisions.
- **Scripting:**
  ```ces
  rigidbody2D.applyImpulse(new Vector2(0, -10)); // Jump
  rigidbody2D.velocity.x = 5; // Constant speed
  rigidbody2D.gravityScale = 0; // Disable gravity
  ```

### 📦 BoxCollider2D / CircleCollider2D
Define the physical shape for collisions.
- **Inspector Usage:** Adjust size or radius. If you check "Is Trigger", the object won't collide but will detect when something enters its area.
- **Scripting:**
  ```ces
  if (isTouchingTag("Ground")) {
      log("On the ground");
  }
  ```

---

## 🤖 4. Intelligence and Movement

### 🧠 BasicAI
Automatic behaviors for NPCs and enemies.
- **Modes:**
  - **Follow:** Chases a target Matter.
  - **Escape:** Flees from a target.
  - **Wander:** Walks randomly.
- **Scripting:**
  ```ces
  basicAI.speed = 250;
  basicAI.behavior = "Follow";
  basicAI.target = find("Player");
  ```

---

## 📱 5. User Interface (UI)

### 🖼️ Canvas
The main container for all interface elements.
- **Scripting:**
  ```ces
  canvas.scaleChildren = true;
  ```

### 🔘 Button
Detects user clicks.
- **Inspector Usage:** Allows defining colors for states (Normal, Pressed, Disabled) or changing sprites.
- **Scripting:**
  ```ces
  onPointerClick() {
      log("Button pressed!");
  }
  ```

---

## 🎬 6. Animation and Audio

### 🎮 AnimatorController
Manages animation states (Walk, Jump, Idle).
- **Inspector Usage:** Requires a `.ceanim` file. "Smart Mode" automatically animates based on Rigidbody2D movement or the Movement component.
- **Scripting:**
  ```ces
  animatorController.play("Attack"); // Force a state
  ```

### 🔊 AudioSource
Plays sound effects or music.
- **Inspector Usage:** Supports **Spatial Audio** (volume drops as the object moves away from the camera).
- **Scripting:**
  ```ces
  audioSource.play();
  audioSource.loop = true;
  play.Explosion(); // Proxy shortcut (plays sound by name)
  ```
