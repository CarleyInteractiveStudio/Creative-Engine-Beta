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

## CAPÍTULO 1
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 2
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 3
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 4
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 5
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 6
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 7
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 8
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 9
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}

## CAPÍTULO 10
# 📔 The Master Scripting Book (CES) — Creative Engine

Welcome to the pinnacle of game creation! This is not a simple user manual; it is a technical encyclopedia designed to turn you into an architect of realities. In the following pages, we will break down every gear of the **Creative Engine Script (CES)**.

---

## 📖 Table of Contents

0. [Chapter 0: Quick Immersion (Your first success)](#chapter-0-quick-immersion)
1. [Chapter 1: Engine Philosophy and Architecture](#chapter-1-engine-philosophy-and-architecture)
2. [Chapter 2: The CES Language and the Transpiler](#chapter-2-the-ces-language-and-the-transpiler)
3. [Chapter 3: The Dynamic Inspector and Typing](#chapter-3-the-dynamic-inspector-and-typing)
4. [Chapter 4: The Heartbeat: Deep Lifecycle](#chapter-4-the-heartbeat-deep-lifecycle)
5. [Chapter 5: Galvanic Interaction (Advanced Input)](#chapter-5-galvanic-interaction-advanced-input)
6. [Chapter 6: The Great Component Reference (API)](#chapter-6-the-great-component-reference-api)
7. [Chapter 7: The Neural Network (Global Messaging)](#chapter-7-the-neural-network-global-messaging)
8. [Chapter 8: Time Control and Asynchrony](#chapter-8-time-control-and-asynchrony)
9. [Chapter 9: The Great Cookbook (Complex Systems)](#chapter-9-the-great-cookbook-complex-systems)
10. [Chapter 10: Industrial Grade Performance](#chapter-10-industrial-grade-performance)
11. [Chapter 11: Under the Hood (Engine Internals)](#chapter-11-under-the-hood)
12. [Chapter 12: Troubleshooting](#chapter-12-troubleshooting)

---

## ⚡ Chapter 0: Quick Immersion

To start strong, we will create an object that not only moves but reacts.

1. **Create a Script:** Right-click in Assets > New > Script (CES) > `Guardian.ces`.
2. **Write:**
```ces
ve motor;
publico number turnSpeed = 100;

alActualizar(delta) {
    rotation += turnSpeed * delta;
    si (isKeyPressed("Space")) {
        posicion.x += 5;
    }
}
