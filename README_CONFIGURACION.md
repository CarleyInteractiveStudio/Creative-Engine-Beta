# ⚙️ Guía de Configuración, Preferencias y Ambiente - Creative Engine

Esta guía explica cómo personalizar tu flujo de trabajo en el editor y cómo configurar los parámetros técnicos de tu proyecto.

---

## 🛠️ 1. Configuración del Proyecto

Accede mediante **Editar > Configuración del Proyecto**. Estos cambios se guardan en el archivo `project.ceconfig`.

- **Metadatos:** Cambia el nombre de tu juego, la versión y el autor.
- **Icono:** Selecciona la imagen que representará a tu juego al exportarlo.
- **Capas (Layers):**
  - **Sorting Layers:** Define el orden en que se dibujan los objetos (lo que esté más abajo en la lista se dibuja al frente).
  - **Collision Layers:** Define qué capas pueden chocar entre sí.
- **Etiquetas (Tags):** Crea etiquetas personalizadas (ej: "Enemigo", "Pinchos") para usarlas en tus scripts con `estaTocandoTag()`.

---

## 🎨 2. Preferencias del Editor

Accede mediante **Editar > Preferencias**. Estos ajustes son personales y no afectan al juego final.

- **Idioma:** Cambia la interfaz entre Español e Inglés.
- **Temas:** Elige entre varios temas visuales (Dark, Light, Carl, etc.) o crea el tuyo propio.
- **Autoguardado:** Activa el guardado automático de tus scripts cada pocos segundos.
- **Snapping:** Si lo activas, los objetos se "imantarán" a la rejilla al moverlos. Puedes definir el tamaño de la cuadrícula.
- **Terminal:** Activa o desactiva la visibilidad de la terminal de comandos.

---

## 🌗 3. Control de Ambiente (Atmósfera)

Accede mediante **Ventana > Control de Ambiente**. Permite crear climas y ciclos de tiempo en tu escena.

- **Filtro de Color:** Cambia el color general de la escena. Úsalo para crear efectos de atardecer, noche o filtros de color (sepia, frío, etc.).
- **Ciclo Día/Noche:**
  - **Ciclo Automático:** Si lo activas, el tiempo avanzará solo durante el juego.
  - **Duración del Día:** Define cuántos segundos tarda en completarse un ciclo de 24h.
- **Capas Excluidas:** Indica qué capas NO deben oscurecerse cuando sea de noche (muy útil para que la Interfaz de Usuario o las Luces siempre se vean brillantes).
