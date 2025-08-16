# Creative Engine

Creative Engine es un motor de videojuegos 2D ligero y potente, diseñado para funcionar directamente en el navegador. Creado con HTML, CSS y JavaScript puro, su objetivo es proporcionar una herramienta accesible e intuitiva para desarrolladores de todos los niveles.

Este proyecto ha sido desarrollado con la asistencia de **Google Jules** para **Carley Interactive Studio**.

## Estado Actual del Proyecto

El motor se encuentra en una fase de desarrollo activa. La versión actual incluye una base sólida con las siguientes características implementadas:

### 1. **Lanzador de Proyectos (`index.html`)**
- **Página de Bienvenida:** Una landing page que presenta el motor, sus características y créditos.
- **Gestión de Proyectos Locales:** Utiliza la **File System Access API** para permitir a los usuarios crear y gestionar sus proyectos en una carpeta local, garantizando la privacidad y el control total sobre sus datos.
- **Persistencia:** Guarda la referencia a la carpeta de proyectos en **IndexedDB**, por lo que el usuario solo necesita seleccionarla una vez.
- **Acciones Directas:** Incluye modales para "Apóyanos" (con un botón de donación de PayPal), "Licencia" (mostrando la licencia MIT y los términos de uso) y "Reportar Errores".

### 2. **Editor Principal (`editor.html`)**
- **Interfaz Inspirada en Unity:** Un layout profesional y familiar con paneles redimensionables para:
    - **Jerarquía:** Lista los `Materias` (GameObjects) de la escena.
    - **Escena:** Una vista de trabajo basada en canvas con una rejilla y gizmos para manipular objetos.
    - **Juego:** Una vista limpia que muestra cómo se verá el juego final, renderizada desde el componente de Cámara.
    - **Inspector:** Muestra y permite editar las propiedades de los `Leyes` (Componentes) del objeto seleccionado.
    - **Assets, Consola y Debug:** Un panel inferior con pestañas para navegar por los archivos del proyecto, ver logs y monitorear el estado del motor.
- **Temas:** Incluye tres temas intercambiables: Oscuro Moderno (por defecto), Claro y Azul Marino.

### 3. **Arquitectura del Motor**
- **Sistema de Entidad-Componente:**
    - **Materia:** La clase base para todos los objetos en una escena (similar a `GameObject` en Unity).
    - **Leyes:** La clase base para los componentes que añaden funcionalidad a los `Materias` (similar a `Component` en Unity).
- **Componentes Implementados:**
    - `Transform`: Gestiona la posición, rotación y escala.
    - `SpriteRenderer`: Renderiza imágenes en el canvas.
    - `Rigidbody` y `BoxCollider`: Bases para un sistema de físicas 2D.
    - `Camera`: Define el punto de vista y el tamaño ortográfico de la vista del juego.
    - `Animator`: Gestiona estados y clips de animación.
    - `UICanvas`, `UIText`, `UIButton`: Componentes básicos para la creación de interfaces de usuario.
- **Renderizador de Canvas:** Un sistema de renderizado 2D que dibuja todos los objetos de la escena en un elemento `<canvas>`, optimizado para diferenciar entre la vista de editor y la de juego.
- **Sistema de Físicas (Básico):** Implementa gravedad y detección de colisiones AABB.

### 4. **Flujo de Trabajo de Assets y Escenas**
- **Navegador de Assets:** Un explorador de archivos de dos paneles (árbol de carpetas y vista de rejilla) que permite crear, renombrar, eliminar y mover assets.
- **Manipulación por Drag-and-Drop:** Permite arrastrar assets (como imágenes o materiales) directamente a los objetos en la jerarquía o a sus componentes en el inspector.
- **Inspector de Assets Avanzado:**
    - **Imágenes (.png, .jpg):** Muestra una vista previa y permite configurar el tipo de textura, guardando los metadatos en un archivo `.meta`.
    - **Materiales (.ceMat):** Un selector de color con una previsualización en vivo para definir el color de los objetos.
    - **Animaciones (.cea):** Muestra una vista previa de la animación con controles de reproducción.
- **Gestión de Escenas:** Soporte para múltiples escenas (`.ceScene`), que se guardan en formato JSON. Se pueden cargar y guardar desde el menú "Archivo".
- **Editor de Código Integrado:** Utiliza **CodeMirror** para permitir la edición de archivos de script `.ces` directamente dentro del motor.
- **Editor de Animación:** Un panel flotante y redimensionable que incluye herramientas de dibujo (lápiz, borrador, selector de color) y una línea de tiempo para crear animaciones frame a frame.

## Hoja de Ruta (Roadmap)

- [ ] **Mejorar el Sistema de Scripting `CreativeScript`:**
    - [ ] Implementar un parser básico para la sintaxis personalizada.
    - [ ] Añadir soporte para variables públicas visibles en el Inspector.
- [ ] **Expandir el Sistema de Físicas:**
    - [ ] Implementar respuestas a colisiones.
    - [ ] Añadir diferentes tipos de colliders (círculo, polígono).
- [ ] **Sistema de Audio:**
    - [ ] Crear componentes `AudioSource` y `AudioListener`.
    - [ ] Permitir la reproducción de sonidos y música.
- [ ] **Mejorar el Sistema de UI:**
    - [ ] Añadir más componentes (sliders, toggles, etc.).
    - [ ] Implementar un sistema de anclaje y layout.
- [ ] **Sistema de Prefabs:**
    - [ ] Permitir guardar `Materias` como plantillas reutilizables.
- [ ] **Funcionalidad de Build:**
    - [ ] Añadir una opción para exportar el proyecto como un juego HTML5 jugable e independiente.

---

¡Gracias por usar y apoyar Creative Engine!
