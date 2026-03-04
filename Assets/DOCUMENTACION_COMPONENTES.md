# 🧩 Guía Maestra de Componentes (Leyes): Creative Engine

Los componentes (llamados **Leyes** en este motor) son los bloques de construcción de tus objetos (Materias). Cada componente añade una funcionalidad específica, como movimiento, renderizado o físicas.

---

## 🏗️ Básicos y Transformación

### 📍 Transform (Posición)
Es el componente más importante. Define dónde está el objeto, hacia dónde mira y qué tan grande es.
- **Propiedades:** Posición (X, Y), Rotación, Escala (X, Y).
- **En Scripting:**
  - `posicion.x = 100;`
  - `posicion.rotation += 45;`

### 📷 Camera (Cámara)
Define el área del mundo que el jugador ve.
- **Propiedades:** Zoom, Fondo (Color), Capas de renderizado (Culling Mask).
- **En Scripting:** `camara.zoom = 1.5;`

---

## 🎨 Renderizado y Visuales

### 🖼️ SpriteRenderer
Dibuja una imagen o un cuadro de una hoja de sprites.
- **Propiedades:** Imagen (Sprite), Color (Tinte), Opacidad, Orden en capa.
- **En Scripting:**
  - `renderizadorDeSprite.color = "#FF0000";`
  - `renderizadorDeSprite.flipX = verdadero;`

### 🌊 Water (Agua)
Crea una superficie de agua interactiva con físicas de flotación.
- **Propiedades:** Fuerza de flotación, Nivel de agua, Color.

---

## ⚙️ Físicas 2D

### ⚖️ Rigidbody2D
Permite que el objeto se vea afectado por la gravedad y las fuerzas.
- **Propiedades:** Masa, Gravedad (Escala), Arrastre (Drag), Tipo (Dinámico/Estático).
- **En Scripting:**
  - `fisica.addForce(nuevo Vector2(100, 0));`
  - `fisica.velocity = nuevo Vector2(0, -5);`

### 📦 BoxCollider2D / CircleCollider2D / CapsuleCollider2D
Definen la "forma" física del objeto para que choque con otros.
- **Propiedades:** Tamaño, Offset, ¿Es disparador? (Trigger).

---

## 🚗 Vehículos y Movimiento

### 🚜 SuspensionHC
Simula una suspensión de vehículo estilo "Hill Climb". Ideal para coches 2D con ruedas.
- **Propiedades:** Dureza del resorte, Amortiguación, Longitud de reposo.
- **Uso:** Debe asignarse un "Chasis" (otro objeto con Rigidbody2D).

### 🏎️ VehicleTopDown
Controlador para juegos de vista aérea con derrapes realistas.
- **Propiedades:** Potencia del motor, Agilidad de giro, Intensidad de derrape.

---

## 🤖 Inteligencia Artificial y Mapas

### 🧠 BasicAI
Un sistema de navegación simple para que los enemigos sigan objetivos o eviten obstáculos.
- **Propiedades:** Objetivo (Materia), Velocidad, Distancia de detección.

### 🗺️ Tilemap
Permite pintar niveles usando azulejos (tiles).
- **Uso:** Requiere una **Paleta de Tiles**. Se recomienda usarlo junto con **TilemapCollider2D** para colisiones automáticas.

---

## 💡 Iluminación Dinámica

### 🌟 PointLight2D / SpotLight2D
Crea fuentes de luz en el mundo.
- **Propiedades:** Radio, Intensidad, Color.
- **Nota:** Requiere que el modo de gráficos en "Configuración del Proyecto" sea **Avanzado (Realista)**.

---

## 📱 Interfaz de Usuario (UI)

### 🖼️ UIImage / UIText
Componentes para mostrar iconos o texto en pantalla.
- **Atajo en Scripting:** `ui.texto = "Puntuación: 100";`

### 🖱️ Button
Detecta clics y ejecuta acciones.
- **Atajo en Scripting:** `ui.boton.alPresionar(() => { ... });`

---

## 🔄 Animación

### 🎬 Animator
Controla la reproducción de clips de animación (.cea).
- **Atajo en Scripting:** `animador.play("Caminar");`

### 🎮 AnimatorController
Una máquina de estados visual que permite cambiar animaciones según variables (Ej: pasar de "Quieto" a "Correr" si la velocidad > 0).

---

## Atajos de Scripting (Resumen)

Para facilitar el trabajo, puedes acceder a estos componentes usando nombres cortos en tus scripts:

| Componente | Atajo en Script |
| :--- | :--- |
| **Transform** | `posicion` |
| **Rigidbody2D** | `fisica` |
| **Camera** | `camara` |
| **AudioSource** | `fuenteDeAudio` |
| **SpriteRenderer** | `renderizadorDeSprite` |
| **Animator** | `animador` |
| **Canvas** | `lienzo` |
| **ParticleSystem** | `sistemaDeParticulas` |
