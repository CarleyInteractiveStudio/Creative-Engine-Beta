# 🌟 Carley World 3D Engine - Regla de Oro (Golden Rule)

Este directorio contiene el motor 3D completamente reconstruido desde cero, denominado **Carley World**.

---

## 📜 Regla de Oro / Golden Rule

**EL MOTOR 3D "CARLEY WORLD" DEBE SER COMPLETAMENTE INDEPENDIENTE DEL MOTOR 2D.**
**NO SE PERMITE REUTILIZAR NI CARGAR NADA ABSOLUTAMENTE DEL MOTOR 2D NI DE CÓDIGO ANTERIOR AL NUEVO MOTOR.**

### Principios Fundamentales:

1.  **Aislamiento Total:** El nuevo motor no carga ni comparte dependencias directas con el código 2D (`js/engine/Materia.js`, `js/engine/Components.js`, etc.).
2.  **Entidades Propias:** En Carley World, las entidades se representan como `CarleyMateria3D` y las leyes se representan como `CarleyLeyes3D` (contenidas exclusivamente en `CarleyComponents.js`).
3.  **Modularidad Absoluta:** Cada módulo dentro de `js/carley-world/` tiene responsabilidades claras e independientes, garantizando que los cambios en un lado no puedan afectar o desestabilizar el otro motor:
    - `CarleyMath.js` (Librería matemática 3D libre de dependencias 2D).
    - `CarleyRenderer.js` (Renderizador de WebGL puro y optimizado).
    - `CarleyComponents.js` (Definición de las leyes 3D).
    - `CarleyMateria3D.js` (Entidades 3D independientes).
    - `CarleyLeyes3D.js` (Clase base de Leyes 3D).
    - `CarleyWorld.js` (Inicializador central y gestor del ciclo de juego 3D).

---

## 🛠️ Modos de Renderizado y Optimización

Carley World está diseñado para ser realista, potente y a la vez sumamente optimizado, utilizando operaciones directas de WebGL y cálculo de matrices en CPU/GPU sin sobrecargas de librerías de terceros.
