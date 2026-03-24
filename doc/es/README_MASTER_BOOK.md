# 📔 Creative Engine: El Libro Maestro Ultra-Detallado

¡Bienvenido al manual definitivo de **Creative Engine**! Este libro ha sido diseñado para que cualquier persona, incluso si nunca ha programado en absoluto, pueda crear su propio videojuego desde cero.

Aquí aprenderás no solo a usar las herramientas, sino a entender la "filosofía" del motor: cómo las cosas se ven, se mueven y reaccionan entre sí.

---

## 🏛️ 1. La Filosofía: Materias y Leyes

Para crear un videojuego en Creative Engine, solo necesitas entender dos conceptos fundamentales que rigen todo el universo de tu juego. Imagina que estás construyendo con piezas de juguete:

### 1. Las Materias (El Cuerpo)
Las **Materias** son todo lo que existe en tu escena y ocupa una posición. Imagina que son "contenedores" o "cajas" vacías. Por sí solas no hacen nada, pero tienen un lugar en el mundo (X e Y).

**Ejemplos de Materias:**
* **Un Personaje:** El héroe que controlas.
* **Un NPC:** Los personajes que te dan misiones.
* **Un Árbol:** Parte del decorado.
* **Nuestro Mapa:** El suelo que pisamos.

### 2. Las Leyes (El Alma y las Reglas)
Las **Leyes** son lo que definen el comportamiento de cada Materia. Son las reglas que le dicen a esa "caja vacía" cómo debe actuar. Una Materia puede tener una sola ley o muchas al mismo tiempo para crear comportamientos complejos.

**Ejemplos de Leyes:**
* **Rigidbody (Física):** Le dice a la materia que debe caer por la gravedad.
* **Cápsula de Colisión:** Le dice que es un objeto sólido y no puede atravesar paredes.
* **Renderizador de Sprite:** Le da una apariencia visual (una imagen).
* **Animador:** Le dice cómo moverse frame a frame.
* **Script:** Una ley personalizada escrita por ti (o generada por Carl IA) para reglas únicas.

---

## 📦 2. Tipos de Materias (Objetos base)

Al hacer clic derecho en la **Jerarquía** (la lista de objetos a la izquierda), puedes crear diferentes tipos de Materias pre-configuradas:

1. **Materia Vacía:** Viene solo con el componente de posición. Es útil para organizar tu jerarquía (como una carpeta) o para agregar lógica invisible al mundo.
   * *Ejemplo:* Una zona invisible que detecta si el jugador ha derrotado a todos los enemigos para darle la victoria.
2. **Sprite:** Se crea con un **Renderizador de Sprite**. Es la materia más común para hacer árboles, personajes o cualquier cosa con imagen.
3. **Cámara:** Es el "ojo" del juego. Todo lo que ocurre mientra juegas se ve a través de ella. Si no hay cámara, no hay juego.
4. **Luz:** Ayuda con el realismo. Permite tener escenas oscuras e iluminar solo puntos específicos.
   * *Tip:* Hay luces de diferentes formas, como triangulares (ideales para focos) o redondas (para bombillas).
5. **Audio:** Permite agregar música de fondo, sonidos de naturaleza o efectos ambientales. Viene con la ley de **Audio Source**.
6. **Tilemap:** Te permite construir mapas pintando con trozos de imagen (tiles). Siempre se crea dentro de una materia padre llamada **Grid** (Rejilla), que nos da las casillas donde pintar.
7. **Terreno 2D:** Permite construir mapas de forma libre dibujando con un pincel, ideal para montañas o suelos orgánicos que luego se "pintan" con texturas.
8. **Parallax:** Permite hacer fondos que se mueven a distinta velocidad que la cámara, creando un efecto de profundidad 2D muy profesional.
9. **Formas (Triángulos, Rectángulos, Círculos):** Materias que ya vienen con una forma geométrica y color, excelentes para prototipar niveles antes de tener el arte final.

---

## 🖥️ 3. Materias de Interfaz de Usuario (UI)

La **UI** es la "capa" superior de botones, menús y textos que el jugador ve directamente en su pantalla.

### El Canva (Lienzo) y sus 9 Partes
Todo lo que sea UI necesita vivir dentro de un **Canva**. El Canva divide la pantalla en 9 secciones (arriba-izquierda, centro, abajo-derecha, etc.). Esto ayuda a que los botones se queden en su sitio sin importar el tamaño de la pantalla.

**Modos de Visualización:**
1. **Screen Space (Espacio de Pantalla):** El UI se dibuja directamente en el cristal de tu monitor. No importa si tu personaje se mueve, el botón de "Pausa" siempre estará ahí.
2. **World Space (Espacio de Mundo):** El UI existe dentro del nivel. Ejemplo: una barra de vida que flota encima de la cabeza de un enemigo y se mueve con él.

### Componentes de UI comunes:
* **Texto:** Para mostrar diálogos o puntajes.
* **Imagen:** Para iconos o fondos de menú.
* **Video:** Para poner cinemáticas directamente en la UI.
* **Scroll:** Para listas largas que necesitan deslizarse (como un inventario).
* **Barra:** Ideal para barras de progreso, vida del personaje o niveles de energía.
* **Panel:** Sirve para agrupar varios elementos de UI (como todos los botones de un menú).
* **Botón:** Detecta clics para llamar a funciones, como "Atacar" o "Cerrar Juego".

---

## 📜 4. El Gran Diccionario de Leyes (Componentes)

Aquí tienes todas las leyes que puedes añadir a tus Materias desde el **Inspector** (panel derecho):

### 🖼️ Renderizadores (Visuales)
* **Renderizador de Sprite:** Muestra una imagen. Si la agrandas, la imagen se estira.
* **Renderizador de Textura:** Si lo agrandas, la imagen **se repite** en lugar de estirarse (como un mosaico o papel de pared).
* **Orden de Dibujo:** Controla quién se dibuja encima de quién. (Ej: que el personaje se vea delante de las nubes).

### 🗺️ Mapa y Construcción
* **Grid:** Dibuja la rejilla invisible para colocar objetos con precisión.
* **Tilemap Render:** Es el encargado de hacer que los mapas pintados por bloques sean visibles.
* **Terreno 2D:** Usa texturas para permitirte "esculpir" el suelo de forma libre.

### 💡 Iluminación Realista
* **Puntos de luz:** Bombillas y linternas básicas.
* **Focos:** Luz direccional en forma de cono.
* **Luz Libre:** Crea un rectángulo de luz, ideal para iluminar áreas amplias.
* **Luz de Sprite:** ¡Esta es mágica! Hace que una imagen específica brille sola.

### 🛠️ Utilidad
* **Gizmos:** Permite dibujar marcas o áreas visibles solo para el desarrollador, muy útil para señalar objetivos o zonas de interés en el mapa.

### 🎬 Animación
* **Animador:** Toma una lista de imágenes y las reproduce a la velocidad que elijas para crear movimiento.
* **Controlador de Animación:** Es el "cerebro" que cambia de animación automáticamente (Ej: de "Quieto" a "Correr" cuando te mueves).

### ⚖️ Físicas 2D
* **Rigidbody 2D:** Aplica gravedad y fuerzas (empujones, saltos).
* **Colisionadores:** Definen si el objeto es una caja, un círculo o una cápsula sólida.
* **Trigger (Gatillo):** Si marcas "Is Trigger" en un colisionador, el objeto dejará pasar a otros, pero "avisará" al motor cuando alguien lo atraviese (útil para zonas de daño o metas).

### 🧠 Básicos y Controladores
* **Movement (Movimiento):** Una ley lista para usar que permite mover al personaje con las flechas o teclas WASD.
* **Health (Vida):** Gestiona los puntos de salud, daño y qué pasa cuando el objeto muere.
* **Basic AI:** Permite que un NPC te siga, te huya o camine de un lado a otro solo.
* **Scene Loader:** Una ley que permite cambiar de nivel al tocar algo o presionar un botón.

---

## 🎨 5. Editores Visuales: Potencia sin Código

Creative Engine incluye herramientas para que crees tus activos visuales sin salir del motor:

### Editor de Sprites (Slicer)
Si descargas una imagen con muchos dibujos juntos (Spritesheet), ábrela en el motor y usa el **Slicer**. Detectará automáticamente cada dibujo y los separará para que puedas usarlos por separado.

### Editor de Animaciones
Aquí creas las secuencias. Arrastras los frames, ajustas la velocidad y ves el resultado en tiempo real. ¡Puedes animar desde el parpadeo de un ojo hasta una explosión!

### Tilemap Editor
Selecciona tu "Paleta de Tiles" y empieza a pintar tu mundo como si estuvieras en Paint. Es la forma más rápida y divertida de crear niveles 2D.

---

## ⚙️ 6. Configuración del Proyecto
En la ventana de **Avanzado** o **Configuración**, puedes ajustar el motor a tu medida:
* **Capas (Layers):** Crea capas como "Suelo", "Agua" o "Bala" para decidir quién choca con quién.
* **Tags (Etiquetas):** Ponle nombres a tus grupos de objetos (ej: marca a todos los enemigos como "Enemigo") para que tus leyes los identifiquen fácilmente.

---

## 🚀 7. Guía Práctica: Tu Primer Personaje en 5 Minutos

1. **Crea la Materia:** Clic derecho en la Jerarquía > **Sprite**.
2. **Ponle imagen:** Arrastra tu dibujo al campo "Source" en el Inspector.
3. **Dale Peso:** Haz clic en "Añadir Ley" y busca **Rigidbody 2D**.
4. **Hazlo Sólido:** Añade la ley **Box Collider 2D**.
5. **Dale Control:** Añade la ley **Movement**.
6. **¡Dale al Play!** Ahora puedes mover a tu personaje y ver cómo cae por la gravedad.

---

**[ESPACIO PARA CAPTURA: Una imagen del Editor mostrando la Jerarquía, la Escena y el Inspector resaltados]**

*Creative Engine ha sido creado para que tu única limitación sea tu imaginación. ¡Empieza a crear hoy mismo!*
