# Creative Engine 🎨🚀

Creative Engine es un motor de videojuegos 2D profesional y ligero, diseñado para creadores que buscan una experiencia fluida y potente directamente en el navegador. Con una interfaz moderna y herramientas avanzadas, Creative Engine permite transformar ideas en juegos completos con facilidad.

## ✨ Características Principales

### 🖥️ Editor Moderno y Profesional
- **Interfaz Limpia:** Se han sustituido todos los emojis por iconos vectoriales (SVG) de alta calidad para una apariencia profesional.
- **Flujo de Trabajo Optimizado:** Ventanas acoplables para Jerarquía, Inspector, Biblioteca de Activos y Consola.
- **Multilenguaje:** Soporte completo para **Español** e **Inglés**, adaptándose a creadores de todo el mundo.

### 💧 Simulación de Fluidos y Física Avanzada
- **Agua (Water):** Simulación de fluidos basada en partículas (PBD) que permite deformaciones realistas.
  - **Empuje (Buoyancy):** Los objetos con física dinámica flotarán o se hundirán según la densidad del agua y la masa del objeto.
  - **Propiedades Físicas:** Configura la densidad, viscosidad y mareas (amplitud y velocidad) para crear diferentes tipos de líquidos.
  - **Efecto Visual:** Renderizado de metabolas para una apariencia líquida suave y cohesiva.
- **Colisionador de Líneas (LineCollider2D):** Permite crear límites de colisión complejos definiendo una lista de puntos, ideal para terrenos irregulares o plataformas personalizadas.

### 🧠 Inteligencia Artificial y Detección
- **IA Básica (IA Básica):** Componente listo para usar con comportamientos de:
  - **Seguir:** Persigue a un objetivo específico.
  - **Escapar:** Se aleja de un objetivo cuando está cerca.
  - **Merodear (Wander):** Movimiento aleatorio natural dentro de un área.
  - **Evitación de Obstáculos:** Integración inteligente con Raycast para esquivar paredes.
  - **Rotación Automática:** Opción para que el objeto mire hacia su dirección de movimiento o hacia sus objetivos.
- **RaycastSource (Rallo):** Sistema de detección por rayos multi-direccional. Permite configurar múltiples rayos con diferentes longitudes y ángulos para detectar colisiones, etiquetas o capas específicas. Ahora con soporte para **Rotación Automática** hacia los impactos detectados.

### 🏗️ Sistema de Prefabs Avanzado
- **Reutilización de Objetos:** Crea "Prefabs" (objetos preconfigurados) y arrástralos a cualquier escena.
- **Identificación Visual:** Las instancias de prefabs se resaltan en color azul en la jerarquía para una fácil identificación.
- **Persistencia Inteligente:** El motor rastrea el origen de cada objeto, permitiendo actualizaciones consistentes.

### 📜 Scripting Potente (CES)
- **Transpilador Integrado:** Escribe código en `.ces` con una sintaxis simplificada y bilingüe (ej: `posicion.x` o `transform.x`).
- **Variables Públicas Inteligentes:** Soporte para tipos de datos avanzados con asignación automática:
  - `audio`, `sprite`, `ui`, `prefab`, `script`, `tag`, `layer`, `animacion`, `escena`, `accion`.
- **Asignación Inteligente Pro:** Al arrastrar un objeto de la escena a una variable pública, el motor analiza sus componentes para encontrar la coincidencia correcta (ej: un `SpriteRenderer` para el tipo `sprite`, o un `AudioSource` para `audio`). También admite asignación de `Tags` y `Layers` mediante arrastre.

### 🎨 Gráficos, Video y Sonido
- **SpriteRenderer:** Soporte para hojas de sprites (SpriteSheets) y animaciones.
- **Tilemaps:** Editor de niveles basado en rejilla con soporte para múltiples capas y colisiones automáticas.
- **VideoPlayer:** Reproducción de video integrada con soporte para:
  - **Modos de Escalado:** Ajustar (Fit), Estirar (Stretch) y Rellenar (Fill).
  - **Espacios:** Renderizado tanto en el mundo 2D como en la interfaz de usuario (UI).
- **Parallax:** Crea fondos con profundidad infinita de forma sencilla.
- **Sistema de Audio Pro:** Gestión avanzada de sonido con:
  - **Audio Espacial:** Atenuación de volumen basada en la distancia a la cámara.
  - **Recorte de Rango:** Define exactamente qué parte del archivo de audio reproducir.

## 📚 Documentación

- **[Guía de Componentes (Leyes)](README_COMPONENTES.md):** Aprende sobre todos los componentes disponibles, sus propiedades y cómo usarlos en scripts.
- **[Guía Maestra de Scripting (CES)](README_SCRIPTING.md):** Todo lo que necesitas saber para programar tus juegos: sintaxis, eventos, input y ejemplos completos.
- **[Guía de Librerías y Extensibilidad](README_LIBRERIAS.md):** Aprende a crear tus propias herramientas para el editor y ampliar las funciones de scripting.
- **[Guía de la Terminal](README_TERMINAL.md):** Domina el uso de comandos para gestionar archivos y objetos de forma experta.

## 🚀 Cómo Empezar

1. **Lanzar el Editor:** Abre `index.html` en un servidor web local (ej: `python -m http.server`).
2. **Crear un Proyecto:** Usa el lanzador para crear o cargar un proyecto existente.
3. **Añadir Objetos:** Haz clic derecho en la Jerarquía para añadir `Materia` (objetos), luces o cámaras.
4. **Programar:** Crea un archivo `.ces` en la Biblioteca, asígnalo a un objeto y define su comportamiento.

## 🛠️ Tecnologías
- **Core:** JavaScript puro (ES6+).
- **Renderizado:** Canvas 2D API optimizada.
- **Física:** Motor de física 2D integrado con soporte para colisiones de caja, círculo y cápsula.

---
*Desarrollado con ❤️ para la comunidad de desarrolladores de videojuegos.*
