# 🎨 Visual Editors Guide - Creative Engine

Creative Engine includes specialized tools for asset creation and world-building without code.

---

## 🎭 1. Animator Controller (.ceanim)
Manage your characters' state logic.
- **States:** Nodes containing an animation clip (.cea).
- **Transitions:** Arrows connecting states under certain conditions.
- **Smart Mode:** Automatically chooses states based on movement.

---

## 🦴 2. Skeletal Animation and Skinning
Move parts of an object fluidly.
- **Bone:** Defines the hierarchical structure.
- **SkeletonRenderer:** Deforms an image according to bone movement.
- **IK (Inverse Kinematics):** Automatically adjusts limbs (like a leg) when moving the end effector (a foot).

---

## ⛰️ 5. 2D Terrain Editor
Paint organic floor and wall shapes with custom textures.
- **Collisions:** The **TerrenoCollider2D** component automatically generates the physical shape.

---

## 🎞️ 6. VidSpri: Video to Sprite Converter
Integrated tool to convert video files into optimized sprite sheets or image sequences. Access from **Window > Vid Spri**.

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
