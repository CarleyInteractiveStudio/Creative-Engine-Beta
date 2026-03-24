# 🏗️ Projects, Scenes, and Publishing - Creative Engine

This manual covers the technical management of your creations, from folder structure to final packaging.

---

## 📂 1. Project Structure

Each project is saved in its own folder with the following items:
- **/Assets:** Images, sounds, scripts, and scenes.
- **/lib:** Libraries (.celib) extending the engine.
- **/doc:** Local project documentation and engine manuals.
- **project.ceconfig:** Technical configuration (Layers, Tags, metadata).
- **thumbnail.png:** Project preview image.

---

## 🎬 2. Scene Management (.ceScene)

Scenes are independent worlds. You can have levels, menus, and loading screens.
- **Save:** `Ctrl + S`. A thumbnail is captured automatically.
- **Switch Scenes:** Double-click a `.ceScene` file in the Browser.
- **Switch Logic:** Use `scene.load("Assets/Level2.ceScene")` in your scripts.

---

## 📦 3. Prefabs (.ceprefab)

A Prefab is a pre-configured object you can reuse.
- **Create:** Drag a Materia from the Hierarchy to the Asset Browser.
- **Usage:** Drag the `.ceprefab` file into the scene to create an instance.
- **Editing:** Double-click the prefab in the Browser to enter **Prefab Edit Mode**.

---

## 🏗️ 4. Build and Export System

### Exporting Assets (.cep)
Right-click any folder in Assets and choose **Export Package**. This creates a compressed `.cep` file with all necessary files, ideal for sharing with other creators.

### Building the Game
Prepare your game for the web.
1. Go to **File > Build**.
2. Select the starting scene.
3. Configure Splash Screens.
4. The engine will generate a `.zip` file with a standalone web environment ready to upload to sites like Itch.io.

---

## 📱 5. Android Signing (Keystore)
In Project Settings, you can generate or assign a **Keystore** file. This is mandatory if you plan to convert your web build into a signed Android APK for Google Play.

## ГЛАВА 1
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

## ГЛАВА 2
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

## ГЛАВА 3
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

## ГЛАВА 4
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

## ГЛАВА 5
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

## ГЛАВА 6
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

## ГЛАВА 7
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

## ГЛАВА 8
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 1
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 2
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 3
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 4
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 5
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 6
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 7
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

## ДОПОЛНИТЕЛЬНАЯ ГЛАВА 8
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
