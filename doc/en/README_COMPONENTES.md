# 🧩 Component Guide (Laws) - Creative Engine

In Creative Engine, **Matter** (objects) come to life through **Laws** (components). Each Law adds specific functionality, such as gravity, image rendering, or AI logic.

This guide details the use of components in both the **Inspector** and **Scripts (.ces)** using modern syntax (without prefixes like `this.` or `motor.`).

---

## 🏗️ 1. Core Components

### 📍 Transform / UITransform
Defines an object's position, rotation, and scale in 2D space.
- **Inspector Usage:** Edit X and Y values to move the object. Use Flip buttons to invert the image.
- **Scripting:**
  ```ces
  position.x += 5; // Move right
  rotation += 45;  // Rotate 45 degrees
  scale.x = 2;    // Double horizontal size
  flipX = true; // Invert horizontally
  ```

### 🎥 Camera
Defines the visible area of the game.
- **Inspector Usage:** Configure background color, zoom, and Culling Mask to decide which layers this camera sees.
- **Scripting:**
  ```ces
  camera.orthographicSize = 10; // Change zoom
  camera.backgroundColor = "#ff0000"; // Red background
  ```

---

## 🖼️ 2. Rendering and Visuals

### 🖼️ SpriteRenderer
Displays an image (.png, .jpg) or a frame from a spritesheet (.ceSprite).
- **Inspector Usage:** Drag an image to the "Source" field. You can change the color to tint the image or adjust opacity.
- **Scripting:**
  ```ces
  spriteRenderer.color = "#00ff00"; // Green tint
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

### 🎞️ VideoPlayer
Plays video files in the world or in the UI.
- **Inspector Usage:** Supports .mp4 and .webm formats. You can enable looping and adjust volume.
- **Scripting:**
  ```ces
  videoPlayer.play();
  videoPlayer.pause();
  videoPlayer.volume = 0.8;
  ```

---

## ⚙️ 3. 2D Physics

### ⚖️ Rigidbody2D (Physics)
Allows the object to react to gravity and collisions.
- **Inspector Usage:** Change body type to "Dynamic" to fall, or "Kinematic" to move manually while still detecting collisions.
- **Scripting:**
  ```ces
  physics.applyImpulse(new Vector2(0, -10)); // Jump
  physics.velocity.x = 5; // Constant speed
  physics.gravityScale = 0; // Disable gravity
  ```

### 📦 Colliders (Box, Circle, Capsule, Polygon, Line)
Define the physical shape for collisions.
- **BoxCollider2D:** Rectangular shape.
- **CircleCollider2D:** Circular shape (radius).
- **CapsuleCollider2D:** Capsule shape (ideal for characters).
- **LineCollider2D:** Chain of points for irregular shapes or edges.
- **PolygonCollider2D:** Free-form polygon (used automatically in terrains).
- **Inspector Usage:** Adjust size or radius. If you check "Is Trigger", the object won't collide physically but will detect when something enters its area.
- **Scripting:**
  ```ces
  if (isTouchingTag("Ground")) {
      print("On the ground");
  }
  ```

---

## 🗺️ 4. Maps and Environment

### 🗺️ Tilemap
Allows building levels using image grids. Requires a **Grid** component on the parent.
- **Inspector Usage:** Managed primarily through the **Tile Palette** window.

### 🏔️ Parallax
Creates depth effect by moving layers at different speeds relative to the camera.
- **Scripting:**
  ```ces
  parallax.scrollFactor = new Vector2(0.5, 0.5); // Moves at half speed
  ```

---

## 🚗 5. Vehicles and Advanced Controllers

### 🚁 HelicopterController
Side-scrolling flight simulation for helicopters.
- **Parameters:** Engine power, takeoff power (vDespegue), turn agility, and auto-stability.
- **Scripting:**
  ```ces
  helicopterController.power = 2500;
  helicopterController.takeoffPower = 1200;
  ```

### ✈️ PlaneController
Aerodynamic lift physics and side-scrolling flight.
- **Parameters:** Takeoff speed, lift force, turn agility, and air drag.
- **Scripting:**
  ```ces
  planeController.liftForce = 1.5;
  planeController.takeoffSpeed = 500;
  ```

### 🏎️ VehicleTopDown
Arcade control for cars in a top-down view.
- **Parameters:** Power, max speed, turn agility, and drift intensity.
- **Scripting:**
  ```ces
  vehicleTopDown.driftIntensity = 0.5;
  vehicleTopDown.turnSpeed = 200;
  ```

---

## 🤖 6. Intelligence and Movement

### 🧠 BasicAI
Automatic behaviors for NPCs and enemies.
- **Modes:** Follow, Escape, Wander.
- **Scripting:**
  ```ces
  basicAI.speed = 250;
  basicAI.behavior = "Follow";
  basicAI.target = find("Player");
  ```

### 🏃 BasicMovement
Adds simple walk and jump controls without coding.
- **Inspector Usage:** Configure speed and jump force.

### 👮 Patrol
Moves the object between two points.
- **Scripting:**
  ```ces
  patrol.distance = 500;
  patrol.speed = 100;
  ```

### 🚀 ProjectileLauncher
Facilitates firing objects (bullets, arrows).
- **Scripting:**
  ```ces
  launcher.fire(); // Spawns an instance of the configured prefab
  ```

---

## 📱 7. User Interface (UI)

### 🖼️ Canvas
The main container for all UI elements. Supports Screen or World Space modes.

### 🔘 Button
Detects user clicks.
- **Inspector Usage:** Define colors for states. You can add "On Click" events that call functions from other scripts without coding.
- **Scripting:**
  ```ces
  onClick() {
      print("Button pressed!");
  }
  ```

### 📊 ProgressBar
Ideal for health or loading bars.
- **Inspector Usage:** Associate a "Fill" image and adjust the current value.

### 🍱 Layout Groups (Vertical, Horizontal, Grid)
Automatically organize child elements into rows, columns, or grids.

---

## ⚔️ 8. Combat and Mechanics

### ❤️ Health
Manages object health and its destruction or death animation.
- **Scripting:**
  ```ces
  health.currentHealth -= 10; // Receive damage
  ```

### ⚔️ Attack
Configure multiple attacks with different keys, animations, and damage.
- **Scripting:**
  ```ces
  attack.doAttack(0); // Executes the first configured attack
  ```

---

## 🛠️ 9. Utilities and Effects

### ✨ ParticleSystem
Generates visual effects like fire, smoke, or explosions.
- **Inspector Usage:** Adjust quantity, speed, life, and color of particles.

### ⏲️ AutoDestroy
Automatically deletes the object after a set time or when leaving the screen.

### 📡 RaycastSource
Perform line detections (raycasting) visually from the editor.

### 🎯 Gyzmo (Areas)
Draw colored rectangles in the scene to mark zones (triggers, boundaries) that can be visible or hidden in the game.

---

## 🎬 10. Animation, Skeleton, and Lighting

### 🎮 AnimatorController
Manages animation states (Walk, Jump, Idle).
- **Smart Mode:** Automatically animates based on object movement.

### 🦴 SkeletonRenderer and IK (Inverse Kinematics)
- **SkeletonRenderer:** Renders meshes deformed by bones (Skinning).
- **Bone:** Defines each part of the skeleton.
- **IKManager2D:** Controls bone chains so a hand or foot follows a target.

### 💡 2D Lighting
- **PointLight2D:** Light in all directions.
- **SpotLight2D:** Cone-shaped light.
- **SpriteLight2D:** Uses a sprite as a light shape.

---

## 💡 Scripting Pro-Tip

Remember that in **Creative Engine**, you can access any component directly by its name in English or Spanish. No prefixes needed.

**Example of a complete script:**
```ces
ve motor;

public number jumpForce = 12;

update(delta) {
    if (isJustKeyPressed("Space") && isTouchingTag("Ground")) {
        physics.applyImpulse(new Vector2(0, -jumpForce));
        play.Jump(); // Calls the sound or animation
    }
}
```
