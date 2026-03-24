# 🤖 Carl IA: Your Intelligent Co-pilot - Creative Engine

Carl is more than just a chat; he is an autonomous agent integrated into the engine, capable of helping you build your game by performing real actions.

---

## 💬 How to interact with Carl
Click the **Carl** button in the top menu or use `Ctrl + Shift + L`.
You can ask for:
- "Create a player with physics and a script to move it with arrow keys."
- "Explain how the Water component works."
- "Make a plan to create an inventory system."

---

## 🧠 Deep Planning Mode
When you request a complex task, Carl enters analysis mode:
1. **Questions:** He will ask clarifying questions to be 100% sure of your goals.
2. **The Plan:** He will generate a structured `[PLAN]` block with executable steps.
3. **Activity:** You can view and approve these steps in the **Activity** tab of his panel.

---

## ⚡ Autonomous Commands
Carl can execute:
- `create_materia`: Create objects (Sprites, Cameras, etc.).
- `add_component`: Add Laws to existing objects.
- `create_file`: Create scripts (.ces) or data files.
- `download_file`: Import assets from the internet directly.

---

## 🛠️ Code Assistance (CHC)
In the Code Editor, use **CHC (Code Helper)**. Write in human language, and Carl will instantly translate it into valid `.ces` code.

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
