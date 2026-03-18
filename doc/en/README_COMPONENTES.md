# 🧩 Component Guide (Laws) - Creative Engine

In Creative Engine, **Matter** (objects) come to life through **Laws** (components). Each Law adds specific functionality, such as gravity, image rendering, or AI logic.

---

## 🏗️ 1. Core Components

### 📍 Transform
Defines an object's position, rotation, and scale.
```ces
position.x += 5;
rotation += 45;
scale.x = 2;
flipX = true;
```

### 🎥 Camera
Defines the visible area of the game.
```ces
camera.orthographicSize = 10;
camera.backgroundColor = "#ff0000";
```

---

## 🚗 4. Vehicles and Advanced Controllers

### 🚁 HelicopterController
Side-scrolling flight simulation for helicopters.
- **Parameters:** Engine power, takeoff power (vDespegue), turn agility, and auto-stability.
- **Scripting:**
  ```ces
  helicopterController.power = 2500;
  helicopterController.vDespegue = 1200;
  ```

### ✈️ PlaneController
Aerodynamic lift physics and side-scrolling flight.
- **Parameters:** Takeoff speed, lift force, turn agility, and air drag.

### 🏎️ VehicleTopDown
Arcade control for cars in a top-down view.
- **Parameters:** Power, max speed, turn agility, and drift intensity.

---

## 🦴 7. Animation, Skeleton, and Lighting

### 🦴 SkeletonRenderer and IK (Inverse Kinematics)
- **SkeletonRenderer:** Renders meshes deformed by bones (Skinning).
- **Bone:** Defines each part of the skeleton.
- **IKManager2D:** Controls bone chains so a hand or foot follows a target.

### 💡 2D Lighting
- **PointLight2D:** Light in all directions.
- **SpotLight2D:** Cone-shaped light.
- **SpriteLight2D:** Uses a sprite as a light shape.
