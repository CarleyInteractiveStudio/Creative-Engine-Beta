# Roadmap de Componentes para Creative Engine

Este documento describe la hoja de ruta para la implementación de nuevos componentes en el motor, con el objetivo de aumentar su versatilidad y facilitar el desarrollo de una gama más amplia de juegos 2D.

## 1. Fortalezas Actuales: Una Base Sólida y Versátil

El conjunto de componentes que el motor ofrece actualmente es excelente. La base es robusta, bien diseñada y cubre las necesidades fundamentales para la creación de muchos de los géneros 2D más populares.

*   **Juegos de Plataformas y Top-Down:** Gracias a los sistemas de `Tilemap`, `Fisicas` (`Rigidbody2D`, `Colliders`) y `Animación`, un desarrollador tiene todas las herramientas necesarias para crear niveles complejos y personajes controlables de forma rápida y eficiente.
*   **Juegos Basados en UI:** El sistema de `UI` (`Canvas`, `Button`, `UIText`, etc.) es muy completo, lo que hace que crear juegos como novelas visuales o puzzles de menús sea una tarea sencilla.

Las siguientes recomendaciones buscan construir sobre esta potente base para llevar el motor al siguiente nivel.

---

## 2. Hoja de Ruta de Nuevos Componentes

Nos centraremos en añadir componentes de "alto impacto" que resuelvan problemas comunes y complejos, ahorrándole al desarrollador una cantidad significativa de trabajo.

### Prioridad Alta (Componentes Transformadores)

1.  **`Sistema de Partículas` (`ParticleSystem`)**
    *   **¿Qué es?** Un componente para crear efectos visuales complejos como explosiones, humo, fuego, magia, lluvia, etc., controlando el movimiento y la apariencia de miles de pequeñas imágenes.
    *   **¿Por qué es clave?** Es la herramienta fundamental para el "pulido" visual de un juego. Sin ella, los efectos especiales son muy limitados. **Añadir este componente elevaría instantáneamente la calidad visual de los juegos creados con el motor.**
    *   **Ideal para:** Juegos de acción, RPGs, puzzles... ¡casi cualquier género!

2.  **`Agente de Navegación` (`PathfindingAgent`)**
    *   **¿Qué es?** Un componente que permite a un enemigo o PNJ encontrar la mejor ruta para moverse de un punto A a un punto B, esquivando obstáculos de forma inteligente.
    *   **¿Por qué es clave?** La inteligencia artificial de movimiento (Pathfinding) es extremadamente difícil de programar desde cero. Ofrecer una solución integrada elimina una barrera de entrada enorme.
    *   **Ideal para:** Juegos de estrategia, *Tower Defense*, RPGs con enemigos que persiguen.

### Prioridad Media (Grandes Mejoras de Calidad de Vida)

1.  **`Seguimiento de Cámara 2D` (`CameraFollow2D`)**
    *   **¿Qué es?** Un componente que se añade a la cámara para que siga a un objeto (normalmente el jugador) de forma suave y configurable.
    *   **¿Por qué es clave?** Casi todos los juegos con niveles grandes necesitan esta funcionalidad. Convertirla en un componente de "arrastrar y soltar" es un ahorro de tiempo inmenso para los desarrolladores.

2.  **`Piscina de Objetos` (`ObjectPool`)**
    *   **¿Qué es?** Un sistema de gestión que recicla objetos (como balas o monedas) en lugar de crearlos y destruirlos constantemente.
    *   **¿Por qué es clave?** Es una optimización de rendimiento crítica para juegos con muchos proyectiles o efectos, asegurando que el juego se mantenga fluido.

---

## 3. Estado Actual y Próximos Pasos

Hemos avanzado significativamente en la implementación de los componentes clave de esta hoja de ruta.

-   [x] **`Sistema de Partículas` (`ParticleSystem`)** - ¡Completado!
-   [x] **`Agente de Navegación` (`PathfindingAgent`)** - ¡Completado!
-   [x] **`Seguimiento de Cámara 2D` (`CameraFollow2D`)** - ¡Completado!
-   [x] **Sistema de Prefabs** - ¡Completado! (Implementado como un prerrequisito fundamental).
-   [x] **`Piscina de Objetos` (`ObjectPoolComponent`)** - ¡Completado!

**Paso actual:** **Comenzar a utilizar el componente `ObjectPoolComponent` en los proyectos.**
