# 🧩 Component Dictionary (Leyes) - Creative Engine

Components are the building blocks of any object (Materia) in your game. Each component adds specific behavior or properties.

---

## 🏗️ Essential Components

### 📐 Transform (posicion)
Defines the object's presence in the world.
- **Position (x, y):** Where the object is.
- **Rotation:** Angle in degrees.
- **Scale (x, y):** Size multiplier.

### 🎥 Camera (camara)
Determines what the player sees.
- **Depth:** Rendering order (lower is back).
- **Culling Mask:** Which layers are visible.
- **Background Color:** Color for empty areas.

---

## 🎨 Rendering Components

### 🖼️ SpriteRenderer (renderizadorDeSprite)
Displays a 2D image.
- **Source:** Path to the image file.
- **Color:** Tint/multiplier for the image.
- **Flip X/Y:** Horizontal or vertical mirroring.

### 🌊 Water (agua)
Adds a dynamic water surface with physics and visual effects.
- **Level:** Surface height.
- **Density:** Buoyancy strength.

---

## ⚙️ Physics 2D

### 🧱 Rigidbody2D (fisica)
Makes the object react to gravity and forces.
- **Mass:** Weight of the object.
- **Gravity Scale:** Multiplier for the world's gravity.
- **Fixed Rotation:** Prevents the object from spinning.

### 📦 BoxCollider2D / CircleCollider2D
Defines the physical shape for collisions.
- **Is Trigger:** If true, objects pass through but trigger events.
- **Friction:** Surface grip.

---

## 📱 8. UI 组件

### 🔘 Button (按钮)
检测用户点击和手柄导航。
- **导航**：按钮自动支持手柄导航（D-pad/摇杆），并可以通过“A”或“Cross”按钮按下。
- **脚本编写**：
  ```ces
  alHacerClick() {
      imprimir("按钮被按下！");
  }
  ```
