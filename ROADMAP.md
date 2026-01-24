# Hoja de Ruta del Motor de Videojuego

Este documento describe las próximas características y mejoras planificadas para el motor, con un enfoque especial en la evolución del sistema de scripting.

## Próxima Gran Mejora: Soporte de Arrays

La siguiente prioridad es implementar el soporte para variables de tipo array (listas) en el sistema de scripting. Esta es una característica fundamental que desbloqueará una gran cantidad of de nuevas posibilidades de diseño de juego.

-   **Declaración en Scripts:** Permitir la declaración de arrays para cualquier tipo de dato, incluyendo los nuevos `Vector2` y `Color`.
    -   `public numero[] misNumeros;`
    -   `public Vector2[] puntosDePatrulla;`
    -   `public Materia[] enemigos;`
-   **Interfaz en el Inspector:** Crear una interfaz de usuario en el Inspector que permita a los desarrolladores:
    -   Ver el tamaño del array.
    -   Añadir o eliminar elementos de la lista.
    -   Editar los valores de cada elemento directamente (arrastrar y soltar para `Materia`, campos numéricos para `Vector2`, etc.).

---

## Futuras Mejoras del Sistema de Scripting

### 1. Variables y Tipos de Datos Más Potentes

-   **Enums (Enumeraciones):**
    -   **Objetivo:** Permitir la creación de tipos de datos con un conjunto predefinido de valores.
    -   **Ejemplo en Script:** `public enum EstadoEnemigo { Patrullando, Persiguiendo, Atacando };`
    -   **En el Inspector:** Se mostrará como un menú desplegable, haciendo la gestión de estados mucho más segura y visual.

### 2. Interacción Avanzada y Creación de Objetos en Runtime

-   **Instanciación Funcional de Prefabs:**
    -   **Estado Actual:** El motor tiene un concepto de Prefabs, pero actualmente no es funcional desde los scripts.
    -   **Objetivo:** Crear una API para que los scripts puedan instanciar prefabs en tiempo de ejecución. Esto es **esencial** para mecánicas como disparar proyectiles, generar enemigos, crear efectos visuales, etc.
    -   **Ejemplo de API:** `motor.instanciar('miPrefabBala', this.transformacion.posicion);`

-   **Sistema de Eventos / Mensajería:**
    -   **Objetivo:** Implementar un sistema de eventos para permitir una comunicación desacoplada entre scripts.
    -   **Funcionamiento:** Un script podría emitir un evento global (ej: `'jugadorHerido'`) y otros scripts podrían suscribirse y reaccionar a él sin necesidad de tener referencias directas.
    -   **Mejora de Colisiones:** Evolucionar el sistema de físicas para que llame automáticamente a funciones en los scripts cuando ocurra una colisión (ej: `public alEntrarEnColision(otraMateria)`), en lugar de requerir una comprobación manual en cada fotograma.

### 3. Físicas y Detección en el Mundo del Juego

-   **Raycasting:**
    -   **Objetivo:** Proporcionar una API de físicas para "lanzar rayos" y detectar colisiones a lo largo de una línea.
    -   **Casos de Uso:** Detección de línea de visión, comprobar si hay suelo debajo de un personaje, medir distancias a obstáculos, etc.
    -   **Ejemplo de API:** `motor.fisica.raycast(origen, direccion, distanciaMaxima);`
