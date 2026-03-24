# 🧩 Guía Maestra de Componentes (Leyes) - Creative Engine

En Creative Engine, las **Materias** (objetos) cobran vida a través de las **Leyes** (componentes). Cada Ley añade una funcionalidad específica, como gravedad, renderizado de imagen o lógica de IA compleja. Esta guía es una referencia profunda de cada parámetro disponible en el Inspector, diseñada para que entiendas no solo *qué* hace cada botón, sino *por qué* deberías usarlo.

Este documento es una enciclopedia técnica detallada de más de 400 líneas. Úsalo como tu libro de consulta principal cuando no sepas qué valor poner en una propiedad.

---

## 🏗️ 1. COMPONENTES BASE (EL ADN DEL OBJETO)

### 📍 Transform (Transformación)
Define la existencia física de un objeto en el espacio 2D. Es la única ley que casi todas las materias tienen por defecto.

*   **Local Position (X, Y):**
    *   **X:** Posición horizontal. Números positivos mueven a la derecha.
    *   **Y:** Posición vertical. Números positivos mueven hacia ARRIBA.
    *   *Nota:* Se llama "Local" porque si el objeto es hijo de otro, esta posición es relativa a su padre.
*   **Local Rotation:** Ángulo de giro en grados. 0 es el norte/arriba original. 90 gira a la derecha, 180 abajo, 270 izquierda.
*   **Local Scale (X, Y):**
    *   **X:** Tamaño horizontal. 1 es el tamaño original (100%). 2 es el doble.
    *   **Y:** Tamaño vertical.
    *   *Truco:* Si pones la escala X en -1, la imagen se verá espejada (mirando al otro lado).
*   **Flip (X / Y):** Atajos rápidos para invertir la imagen sin cambiar la escala numérica. Es lo que debes usar para que un personaje se dé la vuelta al caminar.

---

## 🖼️ 2. RENDERIZADO Y VISUALES (LA APARIENCIA)

### 🖼️ SpriteRenderer (Renderizador de Sprite)
Es el encargado de "dibujar" una imagen en la pantalla. Es el componente más usado del motor.

*   **Source (Fuente):** La ruta del archivo de imagen (.png, .jpg). Puedes arrastrar archivos directamente aquí desde el Assets Browser.
*   **Color (Tinte):**
    *   Permite aplicar un filtro de color. El color blanco (#FFFFFF) es el neutro.
    *   Si eliges un color con transparencia (Alpha bajo), el objeto se volverá translúcido.
*   **Opacity (Opacidad):** Un control deslizante de 0 a 1. Úsalo para efectos de desvanecimiento suave o para que los fantasmas se vean transparentes.
*   **Order in Layer (Prioridad de Dibujo):**
    *   Define quién tapa a quién. Los números altos se dibujan "encima".
    *   *Valores Recomendados:*
        *   Fondo Lejano: -100
        *   Fondo Medio: -50
        *   Escenario/Suelo: 0
        *   Items/Monedas: 10
        *   Jugador/Enemigos: 100
        *   Efectos/Explosiones: 200
        *   UI/Letras: 500
*   **Pivot (Punto de Anclaje):** El "tornillo" desde donde el objeto gira y se escala.
    *   (0.5, 0.5): Centro perfecto. Ideal para proyectiles y explosiones.
    *   (0.5, 0): Centro inferior (los pies). **OBLIGATORIO** para personajes para que no "floten" al escalar o rotar.
    *   (0.5, 1): Centro superior (la cabeza). Ideal para lámparas que cuelgan del techo.

### 🎞️ VideoPlayer (Reproductor de Video)
Reproduce archivos de video .mp4 o .webm directamente en el mundo de juego o en la UI. Ideal para intros, cinemáticas o televisores dentro de un nivel.

*   **Source:** El archivo de video.
*   **Volume:** Control de sonido de 0 a 1.
*   **Loop:** Si se activa, el video vuelve a empezar al terminar.
*   **Playback Rate:** Velocidad (1 es normal, 0.5 cámara lenta, 2 cámara rápida).
*   **Scaling Mode:**
    *   **Fit:** El video cabe entero sin deformarse, dejando bordes negros si es necesario.
    *   **Stretch:** El video se estira para llenar todo el rectángulo del objeto, aunque se vea "gordo" o "flaco".
    *   **Fill:** El video llena todo el espacio y recorta lo que sobra para no deformarse.
*   **Play on Awake:** Si se activa, el video empieza nada más abrir el nivel.

### 🌊 Water (Agua Dinámica)
Simulación de fluidos basada en partículas. Crea lagos, piscinas o mares donde los objetos flotan o se hunden.

*   **Width / Height:** El tamaño del área de agua.
*   **Density (Densidad):** Controla la flotabilidad.
    *   Alta (> 1.5): Los objetos flotan mucho y cuesta sumergirlos.
    *   Baja (< 0.5): Casi todo se hunde rápido.
*   **Viscosity (Viscosidad):** Qué tan "pegajoso" es el líquido. Un valor alto hace que se mueva como miel o aceite.
*   **Show Tides (Mareas):** Si se activa, el nivel del agua subirá y bajará rítmicamente creando olas suaves.

---

## ⚙️ 3. FÍSICAS 2D (EL PESO Y EL TACTO)

### ⚖️ Rigidbody2D (Cuerpo Rígido)
Activa el motor de físicas de Newton para el objeto. Sin esta ley, el objeto es un fantasma.

*   **Body Type (Tipo de Materia):**
    *   **Dynamic:** Reacciona a la gravedad, a las colisiones y a las fuerzas. Úsalo para el Jugador, Enemigos y cajas movibles.
    *   **Static:** Inamovible. Es como una montaña. Gasta muy pocos recursos. Úsalo para suelos y paredes fijas.
    *   **Kinematic:** Ignora la gravedad pero detecta choques. Úsalo para ascensores o plataformas móviles que tú mueves por código.
*   **Mass (Masa):** Cuánto "pesa" el objeto. Útil para choques; un camión con masa 1000 moverá a un coche con masa 1.
*   **Linear Drag:** Fricción con el aire. Si pones 10, el objeto se parará casi al instante al dejar de empujarlo.
*   **Angular Drag:** Resistencia a girar sobre sí mismo.
*   **Gravity Scale:** Multiplicador. 1 es gravedad normal. 0 es flotar en el espacio. 5 es caer como un yunque de plomo.
*   **Fixed Rotation:** Si se marca, el objeto nunca rotará tras un choque. **Vital para personajes** para que no terminen caminando de cabeza tras chocar con una esquina.
*   **Interpolate:** Suaviza el movimiento visual si el juego da tirones.

### 📦 Colisionadores (Box, Circle, Capsule)
Definen la "piel" o superficie sólida del objeto.

*   **Is Trigger (¿Es Gatillo?):**
    *   **Desactivado:** El objeto es sólido como una pared.
    *   **Activado:** El objeto es atravesable como un fantasma, pero el motor "avisa" cuando algo entra en él. Úsalo para monedas, checkpoints o zonas de muerte.
*   **Offset (X, Y):** Permite mover la caja de choque sin mover el dibujo del objeto.
*   **Size (Box) / Radius (Circle):** Ajusta el tamaño de la zona sólida.
*   **Direction (Capsule):** Si la cápsula es vertical (para personas) u horizontal (para coches).
*   **Edge Radius:** Suaviza las esquinas de una caja para que no se "traben" en las uniones de los bloques.

---

## 🚗 4. VEHÍCULOS Y CONTROLADORES AVANZADOS

### 🚁 HelicopterController (Helicóptero)
Simulación física de vuelo lateral. Convierte cualquier sprite en un vehículo volador.

*   **Potencia Motor:** Fuerza de los rotores hacia arriba.
*   **vDespegue:** La fuerza de sustentación base que mantiene el helicóptero flotando.
*   **Agilidad Giro:** Qué tan rápido se inclina al presionar las teclas.
*   **Auto-Estabilizar:** Fuerza que intenta poner el helicóptero en posición horizontal cuando sueltas los mandos.
*   **Arrastre Aire:** Qué tanto frena el aire al vehículo.

### 🏎️ VehicleTopDown (Coche Cenital)
Control arcade para coches vistos desde arriba (estilo GTA clásico).

*   **Potencia:** Aceleración inicial.
*   **Velocidad Máxima:** Límite de velocidad.
*   **Velocidad Giro:** Qué tan rápido dobla.
*   **Intensidad Derrape (Drift):**
    *   0: Agarre total (como un tren).
    *   0.8: Coche deportivo.
    *   1: Coche en hielo.
*   **Frenado Motor:** Qué tan rápido pierde velocidad al no acelerar.

### ✈️ PlaneController (Avión)
Física de vuelo real con sustentación aerodinámica.

*   **Sustentación (Lift):** Cuánta fuerza genera el aire bajo las alas al ir rápido.
*   **Velocidad Despegue:** Velocidad mínima para que el avión empiece a subir.
*   **Agilidad Giro:** Control de la nariz (subir/bajar).
*   **Arrastre:** Fricción aerodinámica.

---

## 🤖 5. INTELIGENCIA Y COMPORTAMIENTO (IA)

### 🧠 BasicAI (IA Básica)
Controla NPCs y enemigos de forma automática.

*   **Behavior (Comportamiento):**
    *   **Follow:** Persigue al "Target" sin descanso.
    *   **Escape:** Huye del "Target" si entra en su rango de visión.
    *   **Wander:** Camina aleatoriamente, ideal para decorar ciudades con gente.
*   **Movement Type:**
    *   **Top-Down:** Se mueve libremente en todas direcciones.
    *   **Platformer:** Solo se mueve a los lados y sabe saltar obstáculos.
*   **Speed:** Velocidad de movimiento.
*   **Detection Distance:** El "círculo de visión". Si el jugador entra aquí, la IA se activa.
*   **Obstacle Avoidance:** Si se activa, la IA intentará rodear las paredes en lugar de quedarse chocando contra ellas.

### 🎬 SceneLoader (Cargador de Niveles)
El componente vital para conectar tu juego.

*   **Scene Path:** Ruta al archivo .ceScene (ej: "Assets/Nivel2.ceScene").
*   **Modos de Activación:**
    *   **Colisión:** Cuando el Jugador toca este objeto (ej: una puerta o meta).
    *   **Tecla:** Al presionar una tecla (ej: Enter o E).
    *   **Botón UI:** Al hacer clic en un botón de menú.
*   **Trigger Tag:** Qué grupo de objetos puede activar el cambio (normalmente "Player").

---

## 📱 6. INTERFAZ DE USUARIO (UI)

### 🖼️ Canvas (Lienzo)
El contenedor maestro de toda la UI. Nada de UI funciona fuera de él.

*   **Render Mode:**
    *   **Screen Space:** Fijo en tu monitor. No le afecta el movimiento de la cámara.
    *   **World Space:** Existe dentro del mapa. Úsalo para carteles o barras de vida sobre enemigos.
*   **Reference Resolution:** La resolución para la que diseñas. El motor escalará todo para que se vea igual en un móvil o una TV 4K.
*   **Scale Children:** Si se activa, al estirar el Canva se estiran todos los botones dentro.

### 🔘 Button (Botón)
Permite al jugador interactuar.

*   **Interactable:** Si el botón está "encendido" o "apagado" (gris).
*   **Transition (Transición):**
    *   **Color Tint:** Cambia de color al pasar el ratón o pulsar.
    *   **Sprite Swap:** Cambia la imagen (ej: una imagen para el botón normal y otra iluminada).
    *   **Animation:** Dispara una animación al interactuar.
*   **On Click ():** La lista de tareas que el botón debe hacer. Puedes añadir varias.

### 📏 Layout Groups (Auto-organizadores)
Componentes mágicos para que no tengas que alinear botones a mano.

*   **Vertical Layout Group:** Alinea sus hijos en una columna perfecta.
*   **Horizontal Layout Group:** Alinea sus hijos en una fila.
*   **Grid Layout Group:** Organiza en filas y columnas (cuadrícula).
*   **Padding:** El margen interno (espacio desde el borde).
*   **Spacing:** El espacio entre un elemento y otro.

---

## 🎬 7. ANIMACIÓN E ILUMINACIÓN

### 🎮 AnimatorController (Controlador)
El "cerebro" que decide qué animación poner en cada momento.

*   **Controller Path:** El archivo .ceanim que contiene el diagrama de estados.
*   **Smart Mode:**
    *   Si el objeto tiene un Rigidbody y esta casilla está marcada, el motor pondrá automáticamente animaciones llamadas "Run", "Jump" e "Idle" según la velocidad física. **¡Ahorra horas de trabajo!**

### 💡 PointLight2D (Luz Puntual)
*   **Radius:** Qué tan lejos llega la luz (en píxeles).
*   **Intensity:** El brillo. Un valor de 2 será deslumbrante, 0.5 será tenue.
*   **Color:** El color de la bombilla.
*   **Filtro Opacidad:** Qué tan "densa" es la luz. Si es bajo, la luz será casi transparente.

### 🔦 SpotLight2D (Luz Focal)
*   **Angle (Ángulo):** El ancho del cono de luz. 30 grados es una linterna estrecha, 90 es un foco de escenario.
*   **Radius:** Largo del rayo de luz.

---

## 🛠️ 8. UTILIDADES Y SISTEMAS AVANZADOS

### 🎒 ProgressBar (Barra de Progreso)
Ideal para vida, magia, energía o barras de carga.

*   **Value / Max Value:** Los números que definen cuánto se llena la barra.
*   **Fill Materia:** El objeto de imagen que se va a estirar o encoger (normalmente una barra roja).
*   **Orientation:** Si se vacía de derecha a izquierda o de arriba abajo.
*   **Is Scene Loading:** Si se marca, la barra se llenará sola mostrando el progreso de carga de un nivel.

### 🧬 ParticleSystem (Sistema de Partículas)
Para crear fuego, humo, chispas o explosiones.

*   **Prefab Path:** El "molde" de cada partícula (un sprite pequeño).
*   **Emission Rate:** Cuántas partículas salen por segundo.
*   **Lifetime:** Segundos que vive cada partícula antes de desaparecer.
*   **Speed:** Qué tan rápido salen disparadas.
*   **Spread (Dispersión):** El ángulo de salida. 0 grados es un chorro recto, 360 es una explosión circular.

---

## 🏗️ 9. COMPONENTES DE MAPA Y TERRENO

### 🗺️ TilemapRenderer (Renderizado de Bloques)
Optimiza el dibujo de niveles grandes.

*   **Palette Path:** El archivo de paleta (.cepalette) que contiene los bloques.
*   **Layer Order:** Para que el pasto se vea delante de la tierra.
*   **Collision Mode:**
    *   **Grid:** Choques por cuadrados exactos.
    *   **Smooth:** Suaviza los bordes para un movimiento más fluido.

### ⛰️ TerrenoCollider2D (Colisiones Orgánicas)
Genera la forma física para los mapas dibujados a mano con el editor de Terreno.

*   **Resolution:** Qué tan detallada es la colisión. Un valor bajo (ej: 4) crea muchos rectángulos pequeños para seguir curvas perfectas. Un valor alto (ej: 32) es más eficiente pero menos preciso.
*   **Is Trigger:** Para zonas de agua o barro que frenan pero no bloquea.

---

## 🧬 10. REFERENCIA TÉCNICA DE PROPIEDADES (GLOSARIO)

*   **Asset Path:** La dirección de un archivo dentro de tu proyecto. Siempre empieza por "Assets/".
*   **Trigger Tag:** Una palabra clave (Tag) que identifica a un grupo de objetos para lógica de choque.
*   **Linear Velocity:** La velocidad actual de un objeto en píxeles por segundo.
*   **Angular Velocity:** La velocidad de rotación.
*   **Culling Mask:** Filtro que decide qué capas de objetos son afectados por una ley (ej: una luz que solo ilumina al Jugador).
*   **Reference Resolution:** El tamaño de pantalla base para el diseño de UI (ej: 1920x1080).
*   **Sorting Layer:** Capas de dibujo globales definidas en la configuración del proyecto.
*   **Bounciness:** Nivel de rebote de un material físico.
*   **Friction:** Nivel de rozamiento (qué tanto resbala).
*   **Interpolation:** Técnica matemática para suavizar el movimiento entre dos puntos.
*   **Raycast:** Un rayo láser invisible que se lanza para detectar qué hay en una dirección.
*   **Collision Layer:** Una categoría que decide con qué otros grupos puede chocar un objeto.
*   **Delta Time:** El tiempo transcurrido desde el último dibujo de pantalla.
*   **Fixed Update:** Un reloj interno que late a una velocidad constante para la física.
*   **Prefab Instance:** Una copia de un molde (Prefab) que vive en tu nivel.
*   **Game Loop:** El ciclo infinito de "Leer Teclas -> Calcular -> Dibujar" que hace que el juego funcione.
*   **Viewport:** El área rectangular de la pantalla donde se ve el juego.
*   **Z-Order:** El orden de profundidad en una escena 2D.
*   **Alpha Channel:** La parte de una imagen que guarda la información de transparencia.
*   **Normal Map:** Una imagen especial que le dice a la luz cómo rebotar para simular relieve.
*   **Skeletal Animation:** Animación basada en huesos que deforman una imagen.
*   **IK (Inverse Kinematics):** Sistema que calcula cómo mover una pierna para que el pie llegue a un punto.
*   **Smart Mode:** Lógica automatizada que ahorra programación al usuario.
*   **Object Pooling:** Técnica de optimización que recicla objetos (como balas) para no gastar memoria.
*   **Singleton:** Un objeto especial que solo puede existir una vez (ej: el controlador de música).
*   **Draw Call:** Una orden enviada a la tarjeta gráfica para dibujar algo.
*   **Bitmask:** Un sistema para guardar muchas opciones de "Sí/No" en un solo número pequeño.
*   **Serialization:** El proceso de guardar el estado de tu juego en un archivo de texto.
*   **Event System:** El sistema que detecta dónde haces clic en la pantalla.
*   **Pivot Point:** El eje central imaginario sobre el cual gira un objeto.
*   **Linear Drag:** La resistencia al movimiento en línea recta (como el viento).
*   **Angular Drag:** La resistencia a la rotación (como la fricción de un eje).
*   **Gravity Scale:** Fuerza personalizada que atrae al objeto hacia abajo.
*   **Continuous Collision:** Modo de detección de choques para objetos muy rápidos (evita que atraviesen paredes).
*   **Discrete Collision:** Modo normal de choques, más rápido pero menos preciso para proyectiles veloces.
*   **Trigger Event:** Una señal que se dispara cuando algo entra en una zona fantasma.
*   **OnCollisionEnter:** Momento exacto en que dos objetos sólidos se tocan.
*   **OnTriggerExit:** Momento en que un objeto sale de una zona de detección.
*   **Layer Mask:** Filtro para elegir qué capas de objetos ignorar en una búsqueda.
*   **World Space:** Las coordenadas reales dentro del mapa infinito del juego.
*   **Screen Space:** Las coordenadas relativas a los píxeles de tu monitor.
*   **AspectRatio:** La relación entre el ancho y el alto de la pantalla (ej: 16:9).
*   **Culling:** El proceso de no dibujar lo que el jugador no está viendo para ganar velocidad.
*   **Frustum:** El volumen de espacio que la cámara es capaz de capturar.
*   **Ortho Size:** El tamaño de la vista en una cámara 2D (cuanto más alto, más lejos se ve todo).
*   **Sprite:** Un dibujo 2D que vive en el juego.
*   **Vector2:** Un par de números (X, Y) que representan una dirección o posición.
*   **Loop:** Algo que se repite para siempre (música, animaciones).
*   **Input:** La entrada del jugador (teclas, ratón, mando).
*   **UI (User Interface):** Todo lo que ves en pantalla que no es el juego en sí (menús, textos).
*   **Script:** Un archivo de texto con las reglas personalizadas de tu juego.
*   **Inspector:** El panel derecho donde cambias las propiedades de las leyes.
*   **Jerarquía:** La lista de la izquierda con todos los objetos de tu nivel.
*   **Assets Browser:** La carpeta de abajo con todos tus archivos.
*   **Physics Material:** Define si un objeto rebota mucho o es pegajoso.
*   **Culling Mask:** Filtro para decidir qué objetos ve una cámara o luz.
*   **Singleton:** Un objeto que es único en todo el juego (ej: el controlador de música).
*   **Raycast:** Un rayo láser invisible que detecta colisiones en línea recta.
*   **Keyframe:** Un momento clave en una animación.
*   **Bitmask:** Un valor matemático que guarda muchas opciones en un solo número.
*   **Shader:** Un pequeño programa que decide cómo se dibuja cada píxel (luces, efectos).
*   **Optimization:** El arte de hacer que tu juego pida pocos recursos al PC.
*   **Alpha:** El nivel de transparencia de un color o imagen.
*   **Orthographic:** Una cámara que no tiene perspectiva (ideal para 2D).
*   **Resolution:** El tamaño en píxeles de tu pantalla (ej: 1920x1080).
*   **AspectRatio:** La relación entre el ancho y el alto de la pantalla (ej: 16:9).
*   **Build:** El proceso de convertir tu proyecto en un juego que otros puedan jugar.
*   **Event:** Algo que sucede en el juego y a lo que puedes reaccionar (ej: un clic).
*   **Variable:** Un lugar donde guardas un dato (ej: la puntuación del jugador).
*   **Function:** Un bloque de código que hace una tarea específica.
*   **Class:** Una plantilla para crear objetos.
*   **Inheritance:** Cuando un objeto hereda las propiedades de otro.
*   **Abstraction:** Simplificar algo complejo para que sea fácil de usar.
*   **Encapsulation:** Guardar los datos importantes dentro de un objeto para que nadie los rompa.
*   **Polymorphism:** La capacidad de un objeto de comportarse de diferentes formas.
*   **Algorithm:** Una serie de pasos para resolver un problema.
*   **Data Structure:** La forma en que organizas la información en tu juego.
*   **Lerp:** Una transición suave entre dos valores (ej: mover la cámara suavemente).
*   **Quaternion:** Un sistema matemático complejo para rotar objetos en 3D (en 2D usamos ángulos simples).
*   **State Machine:** Un sistema que decide qué animación o comportamiento activar según la situación.
*   **Namespace:** Un "apellido" para tus códigos para que no se mezclen con otros.
*   **Garbage Collector:** El sistema que limpia la memoria de tu juego automáticamente.
*   **Physics Engine:** El programa interno que calcula los choques y la gravedad.
*   **Rendering Pipeline:** El camino que sigue un dibujo hasta aparecer en tu monitor.
*   **API (Application Programming Interface):** Las herramientas que el motor te da para hablar con él.
*   **Dynamic Batching:** Combinar objetos iguales para dibujarlos más rápido.
*   **Post-Processing:** Efectos de imagen aplicados después de dibujar el juego (ej: niebla, brillo).
*   **Anchor Point:** Punto de referencia para situar la UI en la pantalla.
*   **World Coordinates:** Las coordenadas absolutas del universo del juego.
*   **Local Coordinates:** Las coordenadas relativas al centro de un objeto padre.
*   **Bone Chain:** Una serie de huesos conectados para animaciones esqueléticas.
*   **Vertex Weight:** Qué tanto afecta un hueso a un punto específico de una imagen.
*   **Masking:** Ocultar partes de una imagen usando otra imagen como molde.
*   **Clamping:** Limitar un valor para que no se pase de un mínimo y un máximo.
*   **Normalized Vector:** Un vector que solo indica dirección, con fuerza 1.

---

## 🧪 11. VALORES RECOMENDADOS SEGÚN EL GÉNERO

### 🏃 Juego de Plataformas (Mario, Sonic)
*   **Rigidbody:**
    *   Gravity Scale: 3.0 (Para que el salto sea rápido y no parezca que está en la luna).
    *   Linear Drag: 1.0 (Para evitar que deslice demasiado al soltar las teclas).
    *   Fixed Rotation: **Marcado**.
*   **Capsule Collider:** Úsala siempre para el jugador, evita atascos en los bordes de los bloques.
*   **Movement:**
    *   Jump Force: 15.0.
    *   Speed: 10.0.

### 🚗 Juego de Coches Top-Down
*   **VehicleTopDown:**
    *   Drift Intensity: 0.7 para un manejo divertido.
    *   Potencia: 1500.
*   **Rigidbody:**
    *   Linear Drag: 0.5.
    *   Fixed Rotation: **Desactivado** (el coche debe poder girar).

### 🔫 Juego de Disparos (Shooter)
*   **ProjectileLauncher:**
    *   Fire Rate: 0.1 para ametralladoras, 1.5 para escopetas.
    *   Projectile Speed: 1000+ para que se sienta instantáneo.
*   **AutoDestroy:**
    *   Delay: 3.0 (Para que las balas no viajen por siempre y saturen el juego).

---

## ⚠️ ERRORES COMUNES (PITFALLS)

1.  **"Mi objeto atraviesa las paredes":** Asegúrate de que el suelo es **Static** y el jugador es **Dynamic**. Si ambos son Kinematic, no chocarán físicamente.
2.  **"La luz no ilumina nada":** Las luces solo funcionan si tienes un componente **SpriteRenderer** o **TilemapRenderer**. No iluminan el "vacío".
3.  **"El botón no hace clic":** Revisa que no haya otra imagen de UI (invisible o transparente) encima del botón tapándolo.
4.  **"La animación va muy lenta":** Revisa los FPS en el Editor de Animación, lo normal son 12 o 24.
5.  **"Mi juego da tirones":** Revisa que no tengas 1000 Rigidbodys Dynamic moviéndose a la vez. Usa **Static** para todo lo que no se mueva.
6.  **"El sonido se escucha bajo":** Verifica la propiedad **Volume** y si el sonido es **Spatial**, asegúrate de que la cámara esté cerca del objeto.

---

## 💡 CONSEJOS PRO PARA EL INSPECTOR

*   **Bloquear el Inspector:** Puedes usar el icono del candado para que el panel no cambie si seleccionas otro objeto por error.
*   **Copiar y Pegar:** Puedes hacer clic derecho en el nombre de una Ley para copiar todos sus valores y pegarlos en otro objeto idéntico.
*   **Variables de Script:** Si escribes un script y pones la palabra `publico` antes de una variable, esta aparecerá en el Inspector para que puedas cambiar su valor sin abrir el código.

---
*Creative Engine: Donde cada parámetro es una posibilidad infinita.*

© 2024 Carley Interactive Studio. Documentación enciclopédica para creadores de leyendas.
