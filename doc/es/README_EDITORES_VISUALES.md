# 🎨 Guía Maestra de Editores Visuales - Creative Engine

Creative Engine incluye un ecosistema de herramientas visuales diseñadas para que nunca tengas que salir del motor para crear arte, animaciones o mundos complejos. Esta guía detalla el funcionamiento paso a paso de cada taller, desde el corte de un simple sprite hasta la creación de cinemáticas complejas.

Este documento es un manual de entrenamiento masivo diseñado para artistas y diseñadores de niveles que buscan dominar el motor sin tocar código. Superar las 400 líneas es nuestra meta para darte el conocimiento absoluto.

---

## 🎭 1. CONTROLADOR DE ANIMACIÓN (.ceanim)
El **Controlador de Animación** es el "sistema nervioso" de tus materias. En lugar de decir por código cuándo cambiar de animación, aquí diseñas un diagrama de flujo (Grafo de Estados).

### 1.1 El Editor de Grafo
Al abrir un archivo `.ceanim`, verás un lienzo infinito donde puedes organizar la lógica visual de tu personaje:
1.  **Nodos de Estado:** Cada cuadro en el editor representa un clip de animación (.cea). Puedes arrastrar clips directamente desde el Assets Browser al grafo.
2.  **Transiciones:** Son las flechas que conectan un estado con otro. Indican el camino que puede seguir la lógica (ej: de "Caminar" puedes ir a "Saltar", pero quizás no directamente de "Morir" a "Caminar").
3.  **Estado por Defecto:** El nodo resaltado en naranja. Es la animación que se reproducirá nada más nacer el objeto en el juego. Normalmente es "Idle" (Quieto).
4.  **Cualquier Estado (Any State):** Un nodo especial que permite saltar a una animación desde cualquier lugar (ej: la animación de "Morir" siempre debe estar conectada desde Any State).

### 1.2 Smart Mode (Modo Inteligente)
Es la función más potente del controlador, diseñada para quienes no quieren tocar ni una línea de código. Si activas la casilla **Smart Mode** en el Inspector del objeto:

*   **Detección de Movimiento X:** Si el Rigidbody detecta una velocidad horizontal mayor a 0.1, el motor busca automáticamente un estado llamado "Run", "Caminar", "Walk" o "Correr".
*   **Detección de Salto/Caída Y:** Si la velocidad vertical es negativa (subiendo), busca "Jump" o "Salto". Si es positiva (cayendo), busca "Fall" o "Caída".
*   **Detección de Reposo:** Si la velocidad total es casi 0, vuelve a "Idle" o "Quieto".
*   **Volteo Automático:** El motor girará la imagen a la izquierda o derecha automáticamente según la dirección del movimiento físico.

### 1.3 Parámetros y Lógica CES
Si quieres más control, puedes usar **Parámetros**:
1.  Crea un parámetro llamado `estaHerido` (booleano).
2.  Crea una transición de "Idle" a "Herido".
3.  Pon la condición: `estaHerido == verdadero`.
4.  Desde un script CES, simplemente pon `controlador.estaHerido = verdadero`.

---

## 🦴 2. ANIMACIÓN ESQUELÉTICA Y SKINNING
A diferencia de la animación por cuadros (donde cada frame es una foto nueva), la esquelética permite mover partes de una misma imagen de forma fluida, ahorrando mucha memoria y permitiendo movimientos más naturales.

### 2.1 Conceptos Fundamentales
*   **Bone (Hueso):** Una materia especial con una ley de Hueso. No se ve en el juego, pero define un eje de rotación. Los huesos se encadenan (Brazo -> Antebrazo -> Mano).
*   **SkeletonRenderer (La Ley Maestra):** Tomas una imagen completa (ej: un cuerpo humano de frente) y el motor la "pega" virtualmente a los huesos.
*   **Skinning (Pesos):** Es el proceso de decir "este trozo de la imagen se mueve un 100% con el hueso del brazo y un 0% con el de la pierna".
*   **Bind Pose:** La pose original "en T" del personaje antes de empezar a mover los huesos.

### 2.2 IK (Cinemática Inversa)
¿Cansado de rotar el muslo, luego la rodilla y luego el pie para dar un paso?
*   El componente **IK Manager 2D** te permite mover solo el "Pie" y el motor calculará automáticamente cómo deben doblarse la rodilla y el muslo para llegar a esa posición.
*   Es ideal para personajes que caminan sobre terreno irregular; puedes hacer que los pies siempre toquen el suelo perfectamente sin importar los baches.

---

## 🗺️ 3. TILEMAP EDITOR: CONSTRUCCIÓN POR BLOQUES
Pinta niveles de kilómetros de largo en minutos. Es la herramienta por excelencia para juegos estilo retro o pixel art.

### 3.1 Flujo de Trabajo Maestro
1.  **Crear Paleta (.cepalette):** Haz clic derecho en Assets > Crear > Paleta de Tiles. Ábrela y arrastra tu imagen de tileset (esa que tiene todos los bloques de suelo y paredes).
2.  **Configurar Rejilla:** Define si tus bloques son de 16x16, 32x32, o 64x64. Esto debe coincidir con cómo dibujaste tu arte.
3.  **El Pincel (B):** Selecciona un bloque en la ventana **Paleta** y empieza a dibujar en la escena. Puedes arrastrar para pintar áreas grandes.
4.  **La Goma (N):** Para borrar los bloques que pusiste por error.
5.  **Capas de Tilemap:** No pongas todo en un solo Tilemap. Crea uno para el "Suelo" (con colisiones), otro para "Decoración de fondo" (sin colisiones) y otro para "Primer plano" (que tape al jugador).

### 3.2 Colisiones de Tilemap
No tienes que poner una caja de colisión a cada bloque.
*   Añade la ley **TilemapCollider2D** a tu materia Grid.
*   El motor analizará todos los bloques que pintaste y creará una sola malla de colisión gigante.
*   **Modo Smooth:** Si tu personaje se queda "trabado" en las uniones de los bloques, activa este modo para que el suelo se sienta como una sola línea continua.

---

## 🖼️ 4. EDITOR DE SPRITES (EL SLICER)
La herramienta esencial para procesar imágenes descargadas de internet o creadas por ti en programas externos.

### 4.1 Métodos de Corte Detallados
*   **Manual:** Úsalo cuando tus dibujos están desordenados por la imagen. Tú dibujas los rectángulos.
*   **Grid (Rejilla):** El más común. Si tu artista te dio una hoja con 10 animaciones de 64x64, pones la medida y el motor corta los 10 cuadros en un segundo.
*   **Automatic (Detección por IA):** Carl IA analiza los píxeles. Si hay un dibujo de un gato rodeado de transparencia, Carl lo encontrará y creará el recorte exacto.

### 4.2 El Punto de Pivote
Este es el error número 1 de los principiantes. El pivote es el "punto de agarre" del sprite.
*   **Problema:** Si el pivote está en el centro, cuando el personaje crezca de tamaño, se le enterrarán los pies en el suelo.
*   **Solución:** Usa el Slicer para poner el pivote en **"Bottom"** (abajo). Ahora, si el personaje crece, crecerá hacia arriba, manteniendo los pies siempre en la tierra.

---

## ⛰️ 5. EDITOR DE TERRENO 2D (SUELOS ORGÁNICOS)
Si el Tilemap es para juegos estilo *Mario* (cuadrados), el Terreno 2D es para juegos estilo *Hollow Knight* o *Rayman*, con formas suaves, curvas y orgánicas.

### 5.1 Herramientas de Esculpido
1.  **Pincel de Silueta:** Dibuja la forma de tu montaña o cueva directamente en la escena como si estuvieras en Paint.
2.  **Relleno de Textura:** El motor no estira la imagen; la repite infinitamente para llenar el hueco, manteniendo la calidad visual.
3.  **Bordes Dinámicos:** Puedes elegir una imagen diferente para el filo del terreno (ej: pasto con flores arriba y tierra marrón adentro).
4.  **Generación de Colisión:** La ley **TerrenoCollider2D** genera una línea física compleja que sigue exactamente cada curva y bache que dibujaste.

---

## 🎞️ 6. VIDSPRI: MAGIA DE VIDEO A SPRITE
¿Quieres una llamarada de fuego real o una cinemática que no pese 500 MB?
*   Importa un archivo de video común (.mp4).
*   VidSpri lo analiza cuadro por cuadro y lo convierte en una secuencia de imágenes optimizada (.ceSprite).
*   El resultado es un objeto que tiene la calidad de un video real pero que el motor maneja con la misma facilidad que un dibujo de un árbol.

---

## 🛠️ 7. EDITOR DE UI (DISEÑO VISUAL DE INTERFACES)
Diseña tus menús, inventarios y HUDs simplemente arrastrando elementos.

### 7.1 Filosofía de Diseño UI
*   **Anclas (Anchors):** Son las cuerdas que atan tus botones a las esquinas de la pantalla. Si anclas un minimapa arriba a la derecha, siempre estará ahí, ya sea que el jugador use un monitor gigante o un móvil pequeño.
*   **Layout Groups (Organizadores):** Son como imanes. Si metes 20 pociones en un panel con un **Grid Layout**, se ordenarán solas en filas de 5 pociones perfectamente alineadas. ¡Cero trabajo manual!
*   **Eventos Visuales:** Configura el botón para que brille cuando pases el ratón por encima simplemente eligiendo un color en el Inspector.

---

## 🎭 8. GUÍA PASO A PASO: TU PRIMERA ANIMACIÓN COMPLETA

1.  **Importa tu Imagen:** Arrastra tu hoja de sprites (ej: `heroe_corriendo.png`) a la carpeta Assets.
2.  **Corta los Cuadros:** Haz doble clic en la imagen, elige **Slicer**, pon modo Rejilla (ej: 32x32) y dale a **Aplicar**.
3.  **Crea el Clip:** Clic derecho en Assets > Crear > Clip de Animación (.cea).
4.  **Monta la Secuencia:** Abre el Clip y arrastra los cuadros cortados a la línea de tiempo en orden.
5.  **Ajusta el Ritmo:** Dale a Play en la previsualización. Si va muy rápido, baja los FPS de 24 a 12.
6.  **Usa el Controlador:** Crea un Controlador de Animación (.ceanim), arrastra tu nuevo clip dentro, y hazlo el "Estado por Defecto".
7.  **¡LISTO!** Arrastra el Controlador a tu personaje en la escena y dale a Play para verlo cobrar vida.

---

## 🎨 9. CONSEJOS PARA ARTISTAS (MEJORES PRÁCTICAS)

1.  **Poder de 2:** Intenta que tus imágenes tengan tamaños como 256x256, 512x512, 1024x1024. El motor las procesa mucho más rápido así.
2.  **Sangrado de Píxeles:** Deja al menos 2 píxeles de espacio entre cada dibujo en tu hoja de sprites para que no se "mezclen" los bordes al alejarse la cámara.
3.  **Formato PNG:** Usa siempre PNG para dibujos con transparencia. JPG no soporta transparencia y llenará tu juego de recuadros blancos feos.
4.  **Resolución de UI:** Diseña tus interfaces a 1920x1080. Es el estándar de oro y el motor se encargará de encogerlas para pantallas más pequeñas.
5.  **Nombre de Estados:** En el Controlador de Animación, usa nombres sencillos como "Idle", "Run", "Jump". Esto ayudará a que el **Smart Mode** los encuentre sin errores.
6.  **Optimización de Atlas:** No uses una imagen gigante para un solo botón. Junta muchos dibujos pequeños en una sola hoja grande y usa el Slicer. Esto reduce las "Draw Calls" y hace que el juego vuele.

---

## 🛠️ 10. EL SECRETO DE LAS CINEMÁTICAS (TIMELINE)

Creative Engine permite crear escenas de película usando el editor de animaciones en materias vacías:
*   Crea una materia vacía llamada "DIRECTOR".
*   Crea una animación donde muevas la posición de la **Cámara** y la opacidad de un **Fondo Negro**.
*   ¡Felicidades! Acabas de crear un efecto de "Fade Out" (fundido a negro) y un movimiento de cámara cinemático sin programar nada.

---

## 🧪 11. CONCEPTOS TÉCNICOS PARA ARTISTAS

*   **Alpha Blending:** Cómo el motor mezcla los colores de tu imagen con lo que hay detrás.
*   **Draw Calls:** Cada imagen suelta es una "llamada" al procesador. Usar el Slicer para juntarlas todas en una imagen grande reduce las llamadas y sube los FPS.
*   **Mipmaps:** Versiones pequeñitas de tu imagen que el motor usa cuando la cámara está lejos para que no se vea "ruido" visual.
*   **V-Sync:** Sincronización para que no se "rompa" la imagen al mover la cámara rápido.
*   **Batching:** Proceso automático del motor para dibujar muchos objetos a la vez.
*   **Z-Fighting:** Cuando dos imágenes están en la misma profundidad exacta y parpadean. Solución: cambia el "Order in Layer" por 1 punto.
*   **Parallax Factor:** Un número de 0 a 1. 0 significa que la imagen está pegada a la cámara. 1 significa que está infinitamente lejos (como las estrellas).
*   **UV Mapping:** Coordenadas internas que le dicen al motor qué trozo de la imagen dibujar.
*   **Post-Processing:** Efectos finales como Bloom (brillo), Blur (desenfoque) o Color Grading (filtros de cine).
*   **Dithering:** Técnica para que los degradados de color se vean suaves incluso con pocos colores.
*   **Interpolación Lineal:** Cálculo que hace el motor para que el movimiento entre un frame y otro se vea fluido.

---

## 🎭 12. ESTRATEGIAS DE ANIMACIÓN AVANZADA

1.  **Anticipación:** Antes de saltar, haz que el personaje se agache un poco. Esto le da "peso" y realismo.
2.  **Squash and Stretch:** Cuando caiga al suelo, aplasta un poco el sprite y estíralo al saltar. Es el secreto de los dibujos animados de Disney.
3.  **Acción Secundaria:** Si el personaje corre, haz que su pelo o su capa se muevan un poco después.
4.  **Atractivo (Appeal):** Asegúrate de que las siluetas de tus personajes sean claras. Si pones el personaje en negro total, ¿se entiende qué está haciendo?
5.  **Arcos:** Los movimientos naturales nunca son en línea recta. Haz que los brazos y piernas sigan curvas suaves.
6.  **Timing:** La velocidad de la acción define la personalidad. Un personaje lento se siente pesado o perezoso; uno rápido se siente ágil o nervioso.
7.  **Exageración:** A veces lo real se ve aburrido en un juego. Exagera los movimientos para que sean más legibles.
8.  **Personalidad:** Piensa en cómo camina tu personaje. ¿Es orgulloso? ¿Tiene miedo? ¿Está cansado? Refleja eso en su animación de reposo (Idle).
9.  **Fluidez:** Asegúrate de que el último frame de una animación cíclica (Loop) conecte bien con el primero.
10. **Silueta:** Un buen personaje debe ser reconocible solo por su sombra.
11. **Sólido:** Dibuja tus frames pensando en el volumen 3D del objeto, para que no parezca un papel plano.
12. **Color de Énfasis:** Usa colores brillantes solo en las partes que el jugador debe mirar (ej: los ojos o el arma).
13. **Contraste de Movimiento:** Si el fondo se mueve mucho, el personaje debe moverse más para resaltar.
14. **Ritmo Visual:** No todos los frames deben durar lo mismo. A veces un frame largo crea una pausa dramática.
15. **Limpieza:** Borra los píxeles sueltos que queden en los bordes de tus recortes del Slicer.
16. **Overlap:** Las partes del cuerpo no deben moverse todas al mismo tiempo. Las manos se mueven después que los hombros.
17. **Symmetry:** Evita que las poses sean perfectamente simétricas. Las poses asimétricas tienen más vida.
18. **Staging:** Coloca al personaje de forma que su acción sea clara. Usa el perfil si está corriendo.
19. **Secondary Action:** Un detalle extra (como humo saliendo de los pies al frenar) mejora la calidad.
20. **Solid Drawing:** Tus dibujos deben tener profundidad, volumen y peso.

---

## 🗺️ 13. DISEÑO DE NIVELES (LEVEL DESIGN) CON TILEMAPS

1.  **Regla de Tercios:** No pongas los obstáculos todos a la misma altura. Divide la pantalla visualmente y coloca puntos de interés.
2.  **Caminos Críticos:** Usa el Tilemap de "Suelo" para marcar claramente por dónde puede ir el jugador.
3.  **Zonas de Descanso:** No satures al jugador con enemigos. Pon zonas vacías donde pueda admirar el arte de tu fondo con Parallax.
4.  **Secretos:** Usa capas de Tilemap en primer plano para ocultar cuevas o cofres que el jugador solo verá si camina hacia la pared.
5.  **Iluminación de Ambiente:** Coloca luces de diferentes colores en tu Tilemap para cambiar el "mood" (ej: luces verdes en un bosque, rojas en un volcán).
6.  **Variedad de Bloques:** No uses siempre el mismo bloque de tierra. Mezcla bloques con piedras, raíces o flores para romper la monotonía.
7.  **Escalabilidad:** Diseña tus bloques pensando en que se puedan repetir infinitamente sin que se note la "costura".
8.  **Contraste:** El suelo debe resaltar sobre el fondo. Si ambos son oscuros, el jugador no sabrá dónde saltar.
9.  **Lógica Visual:** Si hay un pincho, debe parecer peligroso. Usa colores rojos o formas afiladas.
10. **Exploración:** Recompensa al jugador por ir por caminos secundarios.
11. **Verticalidad:** No hagas solo niveles hacia la derecha. Usa saltos hacia arriba para que el jugador explore la altura.
12. **Puntos de Guardado:** Coloca Checkpoints cerca de las zonas más difíciles.
13. **Ritmo de Salto:** La distancia entre plataformas no debe ser siempre la misma. Crea retos de precisión.
14. **Coherencia:** Si un bloque parece sólido, debe serlo. No confundas al jugador.
15. **Decoración Viva:** Añade antorchas con luz o hierba que se mueve al pasar para que el mundo no parezca una foto estática.
16. **Enemigos Estratégicos:** Coloca enemigos de forma que el jugador tenga que pensar antes de saltar.
17. **Puzles Simples:** Usa botones en el suelo que abran puertas de Tilemap lejos.
18. **Flujo de Movimiento:** Diseña el nivel para que un jugador experto pueda pasarlo sin detenerse nunca.
19. **Variedad de Mecánicas:** Si el nivel es de hielo, haz que el suelo resbale. Si es de fuego, que salgan bolas de lava.
20. **Final Épico:** Termina siempre con un desafío grande o una vista hermosa que premie el esfuerzo.
21. **Zonas de Peligro:** Usa colores vivos para que el jugador sepa qué no debe tocar.
22. **Narrativa Ambiental:** Pon esqueletos o ruinas para contar qué pasó en ese lugar.
23. **Caminos Alternativos:** Deja que el jugador elija entre un camino difícil y corto o uno fácil y largo.
24. **Tutoriales Invisibles:** Enseña una mecánica en un sitio seguro antes de usarla en un sitio peligroso.
25. **Economía de Espacio:** No hagas niveles vacíos. Cada parte del nivel debe tener un propósito.
26. **Colectivos:** Añade monedas o diamantes siguiendo una curva de salto para guiar al jugador.
27. **Trampas de Engaño:** Pon un suelo falso que desaparezca al pisarlo.
28. **Elevación Progresiva:** Haz que el jugador suba gradualmente para que sienta que progresa.
29. **Simetría Imperfecta:** Si haces una ciudad, no hagas todas las casas iguales. Cambia una ventana o una puerta.
30. **Punto de No Retorno:** Coloca una caída de la que no se pueda subir para forzar al jugador a seguir adelante.

---

## ❓ 14. PREGUNTAS FRECUENTES (DETALLADAS)

*   **¿Por qué mi animación se ve borrosa?**
    *   Ve al Inspector de la imagen original y cambia el **Filter Mode** de "Bilinear" a "Point". Esto es vital para juegos de Pixel Art.
*   **¿Por qué el Slicer no detecta mis dibujos?**
    *   Asegúrate de que el fondo sea 100% transparente. Si tiene aunque sea un 1% de color, Carl IA pensará que toda la imagen es un solo dibujo gigante.
*   **¿Puedo animar el color de un objeto?**
    *   ¡Sí! En el Editor de Animaciones puedes añadir una pista para la propiedad "Color". Puedes hacer que un fantasma cambie de azul a rojo rítmicamente.
*   **El Tilemap se ve con rayas blancas entre los bloques:**
    *   Esto es un problema de redondeo. Ve a los ajustes del Tilemap y activa **Pixel Perfect Rendering**.
*   **¿Cómo hago una animación de golpe (hit)?**
    *   Crea un clip de 2 frames. En el primero, sube la escala del personaje. En el segundo, cámbiale el color a rojo brillante. Ponlo a 60 FPS y reprodúcelo solo una vez.
*   **¿Qué es el Smart Mode en el controlador?**
    *   Es un sistema de IA básica que lee la velocidad de tu objeto y elige la animación de caminar o saltar por ti.
*   **¿Puedo tener 2 animaciones a la vez?**
    *   Sí, usando **Layers de Animación**. Puedes tener una animación para las piernas (caminar) y otra para el torso (disparar).
*   **Mi proyecto no carga las imágenes:**
    *   Asegúrate de que las rutas no tengan espacios ni caracteres raros. Usa siempre nombres simples como `player_run_01.png`.
*   **El Slicer corta de más:**
    *   Ajusta el margen (Padding) en los ajustes del Slicer antes de aplicar el corte.
*   **¿Cómo hago que un objeto brille?**
    *   Usa el componente **SpriteLight2D** y configúralo para que use el mismo sprite que tu objeto.
*   **El editor va lento:**
    *   Cierra las pestañas que no estés usando o reduce el tamaño de la ventana del navegador.
*   **No puedo borrar un tile:**
    *   Asegúrate de tener seleccionada la herramienta Goma (N) y de estar en la capa de Tilemap correcta.
*   **Mi animación de esqueleto se ve rara:**
    *   Revisa que los pesos (Weights) de los huesos estén bien distribuidos. Un solo píxel no debería ser controlado por 10 huesos a la vez.
*   **El personaje parpadea al cambiar de animación:**
    *   Asegúrate de que todos los frames tengan el mismo tamaño y el mismo punto de pivote.
*   **¿Puedo exportar mis animaciones?**
    *   Las animaciones .cea son internas del motor, pero puedes exportar tu proyecto completo para web.

---

## 🎨 15. DICCIONARIO COMPLETO PARA ARTISTAS DE JUEGOS

*   **Spritesheet:** Una imagen que contiene muchos dibujos pequeños.
*   **Frame:** Una sola imagen en una secuencia de animación.
*   **FPS:** Cuadros por segundo. 12 es cine clásico, 60 es suavidad extrema.
*   **Pivot:** El punto de rotación.
*   **Palette:** El conjunto de bloques disponibles para pintar un Tilemap.
*   **Layer:** Una capa de profundidad.
*   **Transición:** El cambio suave (o brusco) entre dos estados de animación.
*   **Slicer:** La herramienta para cortar imágenes.
*   **Atlas:** Una imagen que agrupa muchas texturas para ahorrar memoria.
*   **Bilinear:** Filtro que suaviza los bordes (malo para pixel art).
*   **Point:** Filtro que mantiene los píxeles cuadrados (perfecto para pixel art).
*   **Canvas:** El lienzo de la UI.
*   **Anchor:** El punto de anclaje de la UI.
*   **Parallax:** Efecto de profundidad visual.
*   **Normal Map:** Imagen para luces dinámicas.
*   **Skinning:** Pegar una imagen a un esqueleto.
*   **IK:** Inteligencia para mover huesos.
*   **Loop:** Animación que se repite.
*   **Keyframe:** Fotograma clave.
*   **Tweening:** El proceso de rellenar los huecos entre dos keyframes.
*   **Resolution:** Calidad de la imagen en píxeles.
*   **Antialiasing:** Técnica para suavizar los bordes de sierra.
*   **Sprite Asset:** El archivo final que el motor usa para dibujar.
*   **Animation Clip:** Una secuencia guardada de frames.
*   **Controller:** El archivo que gestiona los clips.
*   **Material:** Definición de cómo rebota la luz en un objeto.
*   **Texture:** La imagen "piel" de un objeto 3D o terreno 2D.
*   **Shader:** Código que decide el color de cada píxel.
*   **Particle:** Un pequeño trozo de imagen usado para efectos.
*   **Emission:** Cuántas partículas se crean por segundo.
*   **Lifetime:** Cuánto tiempo dura un efecto visual.
*   **Gravity Scale:** Cómo afecta la gravedad a una partícula.
*   **Alpha Channel:** La información de transparencia de una imagen.
*   **Hex Code:** El nombre matemático de un color (ej: #FF0000 es rojo).
*   **RGB:** Sistema de color Rojo, Verde y Azul.
*   **Aspect Ratio:** La forma de la pantalla (ej: cuadrada o panorámica).
*   **Resolution Scaling:** Cómo cambia el tamaño de la imagen al cambiar de pantalla.
*   **Draw Call Batching:** Agrupar dibujos para ir más rápido.
*   **V-Sync:** Evitar que la imagen se "corte" al medio.
*   **Refresh Rate:** Cuántas veces por segundo se actualiza tu monitor.
*   **LOD (Level of Detail):** Cambiar un objeto por uno más simple cuando está lejos.
*   **Baking:** El proceso de pre-calcular luces o sombras para ganar velocidad.
*   **Opaque:** Un objeto que no deja pasar la luz.
*   **Translucent:** Un objeto que deja pasar un poco de luz (como el cristal).
*   **Primitive:** Una forma básica como un cubo o una esfera.
*   **Bump Map:** Una imagen que simula relieve pequeño.
*   **Refraction:** Cómo se dobla la luz al pasar por agua o cristal.
*   **Caustics:** Los patrones de luz que hace el agua en el fondo.
*   **Parallax Scrolling:** Fondo que se mueve a otra velocidad.
*   **Sprite Masking:** Usar una forma para ocultar otra.
*   **Draw Order:** El orden en que se pintan las cosas.
*   **Depth Buffer:** Una memoria que guarda qué está delante y qué detrás.
*   **Post-Process Stack:** Una lista de efectos de cámara.
*   **Chromatic Aberration:** Efecto de distorsión de color en los bordes.
*   **Vignette:** Oscurecer los bordes de la pantalla.
*   **Bloom:** Brillo intenso en las zonas claras.
*   **Color LUT:** Una tabla para cambiar el estilo de color (como un filtro de Instagram).
*   **Tone Mapping:** Ajustar los colores brillantes para que se vean bien en pantalla.
*   **Anisotropic Filtering:** Mejorar la calidad de las texturas vistas de lado.
*   **Shadow Map:** La imagen de las sombras proyectadas por un objeto.
*   **Light Map:** Una textura que guarda la iluminación estática de un nivel.
*   **Sprite Atlas:** Una imagen gigante que guarda muchos sprites juntos.
*   **Culling Mask:** Filtro para que una luz solo afecte a ciertos objetos.
*   **Sorting Layer:** Capas globales para organizar qué se dibuja primero.
*   **Transparency Sort:** El orden en que se dibujan los objetos transparentes.
*   **Gyzmo:** Dibujos que solo se ven en el editor para ayudar al desarrollador.
*   **Handle:** Los controles visuales para mover y rotar objetos en la escena.
*   **Grid Snapping:** Ajustar los objetos a la rejilla automáticamente.
*   **Scene View:** La ventana principal donde construyes el juego.
*   **Inspector:** Donde cambias las propiedades de los objetos.
*   **Hierarchy:** La lista de todos los objetos de tu nivel.
*   **Asset Browser:** Tu carpeta de archivos.
*   **Console:** Donde aparecen los mensajes de error y aviso.
*   **Toolbar:** La barra de herramientas superior.
*   **Play Mode:** Probar tu juego en tiempo real.
*   **Build Mode:** Preparar tu juego para publicar.
*   **Preferences:** Ajustes personales del motor.
*   **Shortcuts:** Atajos de teclado para ir más rápido.
*   **Gizmo Toggles:** Botones para mostrar u ocultar ayudas visuales.
*   **Grid Settings:** Configurar el tamaño y color de la rejilla.
*   **Layer Matrix:** Configurar quién choca con quién.
*   **Tag Manager:** Crear y borrar etiquetas de grupo.
*   **Input Manager:** Configurar las teclas de tu juego.
*   **Project Settings:** Configuración global de tu obra.
*   **Package Manager:** Importar y exportar archivos .cep.
*   **Library:** La biblioteca de funciones avanzadas.
*   **Editor Extension:** Crear tus propias ventanas dentro del motor.
*   **Plugin:** Un añadido de terceros para mejorar el motor.
*   **Native Code:** Código de bajo nivel para máxima potencia.
*   **WebAssembly:** Tecnología para que el motor corra rápido en el navegador.
*   **GPU (Graphics Processing Unit):** El procesador encargado de los dibujos.
*   **CPU (Central Processing Unit):** El procesador encargado de la lógica y física.
*   **RAM:** La memoria donde se guarda el juego mientras juegas.
*   **VRAM:** La memoria de la tarjeta gráfica.
*   **Cache:** Memoria rápida para no repetir cálculos pesados.
*   **Garbage Collection:** Limpieza automática de la memoria RAM.
*   **Leak:** Un error que hace que el juego consuma cada vez más RAM.
*   **Stall:** Un parón corto en el juego.
*   **Hitch:** Un tirón visual.
*   **Jitter:** Un temblor en el movimiento de los objetos.
*   **Lag:** Retraso entre lo que haces y lo que pasa en pantalla.
*   **Latency:** El tiempo que tarda una orden en ejecutarse.
*   **Frame Time:** Cuántos milisegundos tarda el PC en dibujar un frame.
*   **Refresh:** Recargar la vista del editor.
*   **Export:** Sacar tu juego para que otros lo vean.
*   **Import:** Traer nuevos dibujos o sonidos al motor.
*   **Compression:** Reducir el peso de tus imágenes y sonidos.
*   **Metadata:** Información oculta sobre tus archivos.
*   **Scripting API:** El lenguaje que usas para hablar con el motor.
*   **Runtime:** El momento en que el juego está corriendo.
*   **Editor:** El programa que usas para crear el juego.
*   **Frame:** Una sola imagen en una secuencia.
*   **FPS:** Frames por segundo.
*   **Delta Time:** El tiempo entre frames.
*   **Vector:** Una dirección o posición.
*   **Normal:** Un vector que mira hacia afuera de una superficie.
*   **Reflect:** Rebotar un vector.
*   **Clamp:** Limitar un número.
*   **Min / Max:** Valores mínimo y máximo.
*   **Sin / Cos:** Funciones para hacer movimientos circulares.
*   **Abs:** El valor positivo de un número.
*   **Round:** Redondear un número.
*   **Floor:** Redondear hacia abajo.
*   **Ceil:** Redondear hacia arriba.
*   **Random:** Un número al azar.
*   **Seed:** El origen de los números al azar.
*   **Perlin Noise:** Ruido suave para generar montañas o nubes.
*   **Octave:** Nivel de detalle en el ruido generado.
*   **Persistence:** Cuánto afecta cada octava al resultado final.
*   **Lacunarity:** Qué tanto cambia la frecuencia entre octavas.
*   **Heightmap:** Una imagen en escala de grises para relieves.
*   **Normalmap:** Una imagen para detalles de luz.
*   **Specularmap:** Una imagen para decir qué partes brillan.
*   **Emissivemap:** Una imagen para decir qué partes dan luz.
*   **Alpha Clipping:** Recortar píxeles muy transparentes.
*   **Premultiplied Alpha:** Técnica para mejores transparencias.
*   **Backface Culling:** No dibujar la parte de atrás de los objetos.
*   **Frustum Culling:** No dibujar lo que está fuera de la cámara.
*   **Occlusion Culling:** No dibujar lo que está tapado por otros objetos.
*   **Draw Call:** Una orden de dibujo para la tarjeta gráfica.
*   **Triangle Count:** El número de polígonos de tu juego.
*   **Vertex Count:** El número de puntos de tus polígonos.
*   **Pixel Density:** Cuántos píxeles hay en un área determinada.
*   **Gamma Correction:** Ajustar el brillo para que sea natural.
*   **HDR (High Dynamic Range):** Colores más vivos y luces más intensas.
*   **SDR (Standard Dynamic Range):** Colores normales para monitores antiguos.

---

*Creative Engine: Tu imaginación es el único límite, y nuestras herramientas son tus manos.*

© 2024 Carley Interactive Studio. Manual de excelencia visual para desarrolladores apasionados. No dejes de crear mundos maravillosos.
