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

## CHAPTER 1
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 2
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 3
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 4
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 5
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 6
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 7
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

## CHAPTER 8
# 📔 El Libro Maestro del Scripting (CES) — Creative Engine

¡Bienvenido a la cumbre de la creación técnica! Este manual es una enciclopedia masiva diseñada para convertirte en un arquitecto de realidades mediante el lenguaje **Creative Engine Script (CES)**. Si has llegado hasta aquí es porque las herramientas visuales ya no son suficientes para tu imaginación y necesitas el control total.

Este documento supera las 1000 líneas y cubre desde la lógica natural hasta los sistemas más complejos de RPG y Multijugador.

---

## 📖 TABLA DE CONTENIDOS (MAPA DE RUTA)

0. [Capítulo 0: Inmersión Rápida](#capítulo-0-inmersión-rápida)
1. [Capítulo 1: Filosofía y Arquitectura (CES vs JS)](#capítulo-1-filosofía-y-arquitectura)
2. [Capítulo 2: Lógica Natural y Operadores Localizados](#capítulo-2-el-lenguaje-ces)
3. [Capítulo 3: El Inspector Dinámico y Atributos de Visibilidad](#capítulo-3-el-inspector-dinámico)
4. [Capítulo 4: Ciclo de Vida Profundo (El Latido del Script)](#capítulo-4-el-latido-ciclo-de-vida)
5. [Capítulo 5: Input Políglota (Teclado, Mouse y Mandos)](#capítulo-5-interacción-galvánica)
6. [Capítulo 6: La Gran Referencia de Alias (API Multilingüe)](#capítulo-6-la-gran-referencia)
7. [Capítulo 7: Mensajería Global (La Red Neuronal)](#capítulo-7-la-red-neuronal)
8. [Capítulo 8: Control del Tiempo, Corrutinas y Esperas](#capítulo-8-control-del-tiempo)
9. [Capítulo 9: El Recetario Maestro (Básico)](#capítulo-9-el-gran-recetario)
10. [Capítulo 10: Optimización de Código y Buenas Prácticas](#capítulo-10-rendimiento)
11. [Capítulo 11: Bajo el Capó (El Proceso de Transpilación)](#capítulo-11-bajo-el-capó)
12. [Capítulo 12: Glosario de Alias por Idioma](#capítulo-12-glosario)
13. [Capítulo 13: Depuración y Resolución de Errores](#capítulo-13-depuracion)
14. [Capítulo 14: Scripting Avanzado con CELIB](#capítulo-14-scripting-avanzado)
15. [Capítulo 15: Referencia de Funciones Matemáticas](#capítulo-15-referencia-matematica)
16. [Capítulo 16: Interacción con la UI](#capítulo-16-interaccion-ui)
17. [Capítulo 17: Gestión de Capas y Tags](#capítulo-17-capas-y-tags)
18. [Capítulo 18: El Sistema de Prefabs](#capítulo-18-sistema-prefabs)
19. [Capítulo 19: Acceso a Otros Scripts](#capítulo-19-acceso-scripts)
20. [Capítulo 20: MECÁNICAS DE PLATAFORMAS (SIDE-SCROLLER)](#capítulo-20-plataformas)
21. [Capítulo 21: MECÁNICAS DE RPG (SISTEMAS DE DATOS)](#capítulo-21-rpg)
22. [Capítulo 22: MECÁNICAS DE TOP-DOWN (ZELDA-LIKE)](#capítulo-22-top-down)
23. [Capítulo 23: MECÁNICAS DE PUZZLE Y LÓGICA](#capítulo-23-puzzle)
24. [Capítulo 24: INTELIGENCIA ARTIFICIAL AVANZADA](#capítulo-24-ia-avanzada)
25. [Capítulo 25: SISTEMAS DE INVENTARIO Y OBJETOS](#capítulo-25-inventario)
26. [Capítulo 26: DIÁLOGOS Y NARRATIVA](#capítulo-26-dialogos)
27. [Capítulo 27: EFECTOS VISUALES (PARTÍCULAS Y LUCES)](#capítulo-27-efectos)
28. [Capítulo 28: FÍSICAS EXPERIMENTALES](#capítulo-28-fisicas)
29. [Capítulo 29: MULTIJUGADOR LOCAL](#capítulo-29-multijugador)
30. [Capítulo 30: GENERACIÓN PROCEDURAL](#capítulo-30-procedural)

---

## ⚡ CAPÍTULO 0: INMERSIÓN RÁPIDA

Para empezar con fuerza, crearemos un objeto que no solo se mueve, sino que reacciona a su entorno.

1.  **Crea un Script:** Clic derecho en Assets > Nuevo > Script (CES) > `Guardian.ces`.
2.  **Escribe:**

---
## CHAPTER 41: THE JOURNEY CONTINUES
You are now fully prepared to build the next big hit with Carl IA.
