# 📔 Creative Engine: La Enciclopedia Maestra Ultra-Detallada (Libro Maestro)

¡Bienvenido a la cumbre absoluta del conocimiento en **Creative Engine**! Si tienes este libro frente a ti, es porque has decidido dar el paso definitivo de jugar videojuegos a *crearlos*. No importa si nunca has visto una línea de código en tu vida, si las matemáticas te asustan o si sientes que la tecnología no es lo tuyo; este manual ha sido redactado con una misión clara: explicarte hasta el último tornillo del motor de la forma más sencilla, detallada, humana y extensa posible.

Este no es un manual de referencia rápida de esos que lees en cinco minutos. Esta es una **Enciclopedia Maestra de más de 400 líneas** diseñada para que, al terminar de leerla, sientas que tienes un superpoder. Serás un arquitecto de mundos, un director de cine interactivo y un creador de experiencias.

---

## 🏛️ CAPÍTULO 1: LA FILOSOFÍA DEL MOTOR (EL ALMA DE TUS CREACIONES)

Para dominar Creative Engine, el primer paso es desaprender cómo funcionan otros motores complejos. Aquí no hablamos de "objetos y componentes" de forma fría. Aquí todo se resume en una analogía vital: **Un Actor y su Guion**.

### 1.1 ¿Qué es una Materia? (El Cuerpo y el Lugar)
Imagina que estás en un teatro inmenso y completamente vacío. Una **Materia** es cualquier cosa que decidas poner en ese escenario: puede ser un foco de luz, un árbol de cartón, una nube pintada o el propio actor principal.

*   **Es un Contenedor:** Por sí misma, una materia es "aire". No tiene peso, no tiene imagen, no tiene sonido. Es solo una intención de existir en el juego.
*   **Tiene Ubicación:** Lo único que una materia posee por nacimiento es una posición en el espacio infinito (sus coordenadas X e Y), una rotación y un tamaño (que llamamos Escala).
*   **Es Jerárquica (Padres e Hijos):** Este es un concepto clave. Puedes meter materias dentro de otras materias. Si creas una "Espada" y la haces hija de un "Héroe", la espada lo seguirá a todas partes. Si rotas al héroe, la espada rotará con él. Esto te permite construir cosas complejas (como un tanque con una torreta que gira) uniendo piezas simples.

> 💡 **Consejo Profesional de Organización:** Nunca dejes materias sueltas por la jerarquía. Usa materias vacías como si fueran carpetas. Crea una llamada `--- NIVEL 1 ---` para el escenario y otra llamada `--- PERSONAJES ---`. Tu cerebro (y tu juego) te lo agradecerán.

### 1.2 ¿Qué es una Ley? (El Espíritu y el Comportamiento)
Si la Materia es el actor, la **Ley** es el guion que le dice qué hacer frame a frame. Sin leyes, el actor se quedaría parado en el escenario en total oscuridad y silencio absoluto.

*   **Son Acumulables:** No tienes que elegir una sola ley. Puedes darle a un actor la ley de "Gravedad", la ley de "Imagen" y la ley de "Caminar". ¡BUM! Acabas de crear un personaje que se ve, que cae al suelo y que puede moverse.
*   **Son Modulares:** Si no te gusta cómo camina el personaje, simplemente le quitas la ley de "Movimiento" y le pones otra más avanzada. No tienes que tirar a tu actor a la basura ni empezar de cero.
*   **Definen la Realidad:** Las leyes son, literalmente, las leyes de la física y la lógica de tu universo. Tú eres el dios de este mundo: tú decides si el fuego quema, si el agua moja o si los cerdos pueden volar.

---

## 📦 CAPÍTULO 2: EL CATÁLOGO MAESTRO DE MATERIAS (TUS PIEZAS DE CONSTRUCCIÓN)

Cuando haces clic derecho en el panel de la **Jerarquía** (a la izquierda), el motor te ofrece una serie de "Materias Pre-fabricadas". Estas son simplemente materias vacías que ya traen las leyes más comunes puestas para que no pierdas tiempo.

### 2.1 La Materia Vacía (La Base de Todo)
Es el origen de la creación. No se ve, no se oye, solo existe.
*   **Uso Maestro 1:** Como "Ancla". Ponla en el centro de un grupo de objetos para moverlos a todos a la vez.
*   **Uso Maestro 2:** Como "Cerebro". Ponle una ley de Script para que controle las reglas del juego (puntos, tiempo, victoria).
*   **Uso Maestro 3:** Como "Spawn Point". Ponla donde quieras que el jugador aparezca al empezar el nivel.

### 2.2 Materia Sprite (La Cara de tu Juego)
Viene con la ley **Renderizador de Sprite**.
*   **Qué hace:** Es la materia que "dibuja" una imagen en la pantalla.
*   **Uso Práctico:** Úsala para todo lo que sea arte estático o animado que no sea suelo. Árboles, personajes, decoraciones, ítems.

### 2.3 Materias Geométricas (Triángulos, Rectángulos, Círculos)
*   **El Secreto:** No necesitan archivos de imagen externos. El motor las dibuja usando matemáticas puras.
*   **Por qué usarlas:** Son perfectas para el **"Blockout"** (diseño rápido). Antes de gastar horas dibujando un castillo, usa rectángulos grises para ver si el nivel es divertido de saltar. Son ligeras y el motor las procesa a la velocidad de la luz.

### 2.4 Materia Cámara (Tus Ojos)
Sin cámara, la pantalla se queda negra. Es el "visor" a través del cual el jugador ve tu mundo.
*   **Zoom:** ¿Quieres un juego de francotiradores? Cambia el zoom de la cámara.
*   **Background Color:** Define el color del cielo cuando no hay nada pintado.
*   **Culling Mask:** Esta es una función avanzada que te permite decir "esta cámara no ve las nubes, solo el suelo". Útil para efectos especiales.

### 2.5 Materia Luz (Atmósfera y Realismo)
Creative Engine tiene un motor de luces 2D muy potente que crea sombras dinámicas.
*   **Punto de Luz:** Como una antorcha o una vela. Ilumina en círculo.
*   **Luz Focal (Spot):** Como un foco de teatro o una linterna. Ilumina en un triángulo (cono).
*   **Luz de Sprite:** ¿Quieres un fantasma que brille? Ponle esta ley y su propia imagen emitirá luz, iluminando las paredes cercanas.
*   **Luz Libre:** Crea rectángulos de luz, ideal para ventanas o zonas de sol.

### 2.6 Materia Audio (La Banda Sonora)
Un juego sin sonido está muerto.
*   **Sonido 2D:** Si quieres música de fondo, pon el sonido en modo "Normal". Se escucha igual en todo el mapa.
*   **Sonido Espacial (3D):** Si lo pones en una antorcha, el sonido se escuchará más fuerte a medida que el jugador se acerque. ¡Inmersión total!

### 2.7 Materia Tilemap (La Fábrica de Niveles)
Imagina que tienes miles de bloques de suelo. Si los creas uno a uno como Sprites, el ordenador explotará.
*   **La Solución:** El Tilemap permite "pintar" bloques sobre una rejilla infinita. Es eficiente, rápido y muy divertido de usar. Viene siempre dentro de una materia **Grid**.

### 2.8 Materia Terreno 2D (Suelos Orgánicos)
A diferencia del Tilemap (que es por cuadrados rígidos), el Terreno te permite dibujar curvas, montañas y colinas a mano alzada. El motor rellenará el interior con la textura que elijas automáticamente y generará las colisiones por ti.

---

## 🖥️ CAPÍTULO 3: EL UNIVERSO DE LA INTERFAZ DE USUARIO (UI)

La UI es la capa "mágica" que flota sobre el juego. Botones de pausa, barras de vida, diálogos. En Creative Engine, la UI vive en su propia dimensión.

### 3.1 El Canva (El Reino de la UI)
Regla inquebrantable: **Todo objeto de UI DEBE ser hijo de un Canva**. Si intentas poner un botón huérfano en la jerarquía, el motor simplemente no lo dibujará. Es el "marco" de tu interfaz.

#### Los 2 Modos del Canva que debes dominar:
1.  **Screen Space (Fijo en tu pantalla):**
    *   Imagina que pegas un papel transparente en el cristal de tu monitor. No importa si tu personaje viaja a otra galaxia; la barra de vida siempre estará pegada en la esquina superior.
    *   **Ideal para:** Menús de inicio, HUD de vida, contadores de tiempo, inventarios.
2.  **World Space (Dentro del mundo):**
    *   Imagina que pones un cartel de madera clavado en el suelo del nivel. Si la cámara se aleja, el cartel se ve pequeño. Si el personaje camina frente a él, lo tapa.
    *   **Ideal para:** Diálogos que salen de la boca de un NPC, barras de vida pequeñas sobre la cabeza de los enemigos, indicadores de "Presiona E para abrir".

### 3.2 El Misterio de los 9 Puntos de Anclaje (Anchors)
¿Alguna vez has hecho un juego y al abrirlo en otro monitor los botones se han movido o desaparecido? Eso es porque no usaste **Anclajes**.
El motor divide tu pantalla en una cuadrícula de 3x3:
*   Esquinas (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
*   Centros de los bordes (Top-Center, Bottom-Center, Left-Center, Right-Center).
*   Centro absoluto de la pantalla (Middle-Center).

**El Truco Maestro:** Si quieres que un mapa esté siempre arriba a la derecha, haz clic en el botón de anclaje "Top-Right". Ahora, no importa si el jugador tiene una pantalla de cine 4K o un móvil pequeño; el mapa siempre estará pegado a esa esquina.

### 3.3 Tutorial: Construyendo un Inventario Profesional
Hacer un inventario parece difícil, pero con **Layout Groups** es un juego de niños:
1.  Crea un **Canva**.
2.  Dentro del Canva, crea un **Panel** y llámalo "Cuadrícula de Inventario".
3.  Añade al Panel la ley **Grid Layout Group**.
4.  Configura el tamaño de celda (ej: 64x64) y el espacio entre ellas (5px).
5.  Ahora, simplemente duplica muchas veces una **UI Image** dentro de ese panel.
6.  **¡LISTO!** El motor las organizará automáticamente en filas y columnas perfectas.

---

## 📜 CAPÍTULO 4: DICCIONARIO ENCICLOPÉDICO DE LEYES (COMPONENTES)

Este es el corazón técnico del motor. Aquí aprenderás qué hace cada casilla del panel de **Inspector**.

### 4.1 LEYES VISUALES (RETOQUE Y APARIENCIA)

#### Renderizador de Sprite (Sprite Renderer)
Es la ley que permite que una imagen exista en el juego.
*   **Source (Fuente):** Aquí arrastras el archivo de imagen (.png o .jpg).
*   **Color:** Sirve para "tintar". Si tu dibujo es blanco, puedes hacerlo de cualquier color. Si tu dibujo ya tiene colores, el tinte se mezclará con ellos.
*   **Flip (Volteo):** Dos casillas (H y V). La 'H' es vital para que un personaje mire a la izquierda o derecha sin necesitar dos imágenes diferentes.
*   **Order in Layer (Orden):** Un número. Si tienes dos objetos en el mismo sitio, el que tenga el número más alto se verá por encima del otro. (Fondo: -100, Suelo: 0, Jugador: 100).
*   **Pivot (Pivote):** El punto central del objeto. Por defecto es (0.5, 0.5), el centro. Si lo pones en los pies (0.5, 1.0), el objeto rotará y se posicionará desde los pies.

#### Renderizador de Textura (Texture Render)
*   **La Diferencia:** Si agrandas un Sprite, la imagen se estira y se ve borrosa (pixelado).
*   **La Ventaja:** Si agrandas una Textura, la imagen **se repite** como los ladrillos de una pared. Úsala para suelos, techos y paredes largas.

---

### 4.2 LEYES DE FÍSICA (EL PESO Y EL TACTO)

#### Rigidbody 2D (El Cuerpo Rígido)
Le da "masa" a tu objeto. Sin esto, el objeto es un fantasma.
*   **Body Type (Tipo de Materia):**
    *   **Dynamic:** La materia "vive". Cae por la gravedad y rebota con otras. (Úsala para el Jugador y enemigos).
    *   **Static:** La materia es una roca inamovible. No se mueve y nada la puede empujar. (Úsala para el Suelo). Ahorra muchísima memoria.
    *   **Kinematic:** Ignora la gravedad, pero tú puedes moverla por código (como un ascensor).
*   **Gravity Scale (Escala de Gravedad):** 1.0 es la Tierra. 0.0 es flotar en el espacio.
*   **Linear Drag (Arrastre):** Es la resistencia del aire. Si es alto, el objeto se detendrá rápido al dejar de empujarlo.
*   **Fixed Rotation:** ¡Marcad siempre esto en vuestros personajes! Si no, cuando el personaje choque con una esquina, empezará a rodar por el suelo como una pelota. Casi siempre debe estar activo para personajes.

#### Colisionadores (La Piel de los Objetos)
Definen la "piel" sólida del objeto.
*   **Box Collider (Caja):** Para suelos, cajas y edificios.
*   **Circle Collider (Círculo):** Para pelotas o ruedas. Es el más rápido de procesar.
*   **Capsule Collider (Cápula):** La mejor para personajes. Evita que se queden atascados en las esquinas de los escalones.
*   **Is Trigger (¿Es Gatillo?):** Si lo activas, el objeto ya no es sólido (atraviesable). Pero enviará una señal cuando alguien entre en él. Úsalo para monedas o trampas.

---

### 4.3 LEYES DE CONTROL Y COMPORTAMIENTO (LA INTELIGENCIA)

#### Movement (Movimiento Básico)
La forma más fácil de empezar.
*   **Configuración:** Solo eliges la velocidad y las teclas.
*   **Tipos:** Top-Down (8 direcciones) o Plataformas (Lados + Salto).

#### Health (Sistema de Vida)
¡No escribas código para la vida! Esta ley ya lo tiene todo.
*   **Max Health:** Vida al empezar.
*   **On Death (Al morir):** Puedes elegir que el objeto se destruya solo o ejecute una animación de muerte.
*   **Invulnerabilidad:** Tiempo tras recibir un golpe en el que el objeto no puede ser dañado de nuevo.

#### Basic AI (IA Básica)
Ideal para enemigos sencillos sin programar.
*   **Modos:**
    *   **Follow:** Persigue al jugador incansablemente.
    *   **Escape:** Huye del jugador si este se acerca demasiado.
    *   **Wander:** Camina aleatoriamente por el mapa como si estuviera paseando.
*   **Detection Range:** El radio de su "vista".

#### Scene Loader (Cargador de Niveles)
*   **Ruta de Escena:** Arrastras el archivo de tu nivel (.ceScene).
*   **Activador:** Puedes elegir que cargue al chocar con el jugador o al presionar una tecla.

---

### 4.4 LEYES DE UTILIDAD (HERRAMIENTAS DE APOYO)

#### Gizmos (Marcadores)
*   **Qué son:** Dibujos que solo tú, el desarrollador, ves en el editor.
*   **Uso:** Dibuja áreas invisibles para saber dónde spawnean los enemigos o hacia dónde fluye el viento. No aparecen cuando juegas el juego final.

#### Raycast Source (El Rayo Laser)
*   **Función:** Lanza un rayo invisible para "ver" qué hay delante.
*   **Uso:** Úsalo para saber si un enemigo tiene un muro delante antes de que choque con él.

---

## 🕒 CAPÍTULO 5: EL CICLO DE VIDA (EL LATIDO DEL JUEGO)

¿Cómo sabe el motor cuándo hacer cada cosa? Todo se divide en tres momentos mágicos que ocurren en los **Scripts**:

1.  **Al Empezar (Start):** Se ejecuta solo una vez, justo cuando el juego arranca. Es el momento de decir: "Ponle 100 de vida al jugador" o "Busca dónde está la espada".
2.  **Al Actualizar (Update):** Se ejecuta **60 veces por segundo**. Es donde ocurre la magia del movimiento. "Si presiono la flecha, muévete 5 píxeles".
3.  **Actualización de Física (FixedUpdate):** Es un latido especial y constante. Úsalo solo para cosas de Rigidbody (empujones, saltos) para que la física sea estable y no haya errores de cálculo.

---

## 🎨 CAPÍTULO 6: EL TALLER DEL ARTISTA (EDITORES VISUALES)

Creative Engine no es solo para programar; es un taller de arte completo.

### 6.1 El Slicer (Cortador de Sprites)
Si descargas una imagen con 50 posiciones de tu personaje, no las cortes a mano.
1.  Ábrela en el motor.
2.  Dale a **Slice**.
3.  Usa el modo **Automatic**: Carl IA detectará dónde termina un dibujo y empieza otro y te los dará cortaditos y listos para usar.
4.  **Pivote Maestro:** Ajusta el punto de rotación de todos los cortes a la vez (ej: todos en los pies).

### 6.2 Editor de Animaciones (.cea)
Aquí es donde creas la ilusión de vida.
1.  Arrastra los frames que cortaste con el Slicer a la línea de tiempo.
2.  Ajustas la velocidad (**FPS**). 12 es lo normal (estilo retro), 24 es fluido, 60 es ultra-realista.
3.  **Loop:** Si es caminar, actívalo. Si es morir o saltar, desactívalo.

### 6.3 El Controlador de Animación (.ceanim)
Es un mapa visual que conecta tus animaciones como si fuera un cerebro.
*   **Nodos:** Cada cuadro es una animación (Quieto, Correr, Saltar).
*   **Transiciones:** Flechas que dicen "si estoy corriendo y salto, pon la animación de salto".
*   **Smart Mode:** ¡El botón mágico! Si lo activas, el motor detecta solo si el personaje se mueve físicamente y pone la animación de caminar sin que tú escribas código.

---

## 🛠️ CAPÍTULO 7: CONFIGURACIÓN MAESTRA DEL PROYECTO

Un buen desarrollador es un desarrollador ordenado. Usa el panel de **Configuración**:

### 7.1 Tags (Etiquetas de Grupo)
Imagina que tienes 200 tipos de enemigos (orcos, trolls, dragones). En lugar de decirle a tu bala que choque con cada uno, marcas a todos como **"Enemigo"**. Ahora la bala solo busca esa etiqueta. Es el método de organización más potente del motor.

### 7.2 Capas (Layers)
Esto es para el control total de la física. Puedes tener una capa de "Agua" y otra de "Fuego". Puedes ir a los ajustes y decir: "El agua y el fuego no pueden chocar entre ellos". El motor ignorará los choques automáticamente, ahorrando procesador.

---

## 🚀 CAPÍTULO 8: TALLER PRÁCTICO (TU PRIMER JUEGO EN 10 MINUTOS)

Vamos a construir juntos un mini-juego de plataformas:

1.  **Crea el Suelo:**
    *   Clic derecho > **Materia Sprite**. Cámbiale el nombre a "Suelo".
    *   Ponle una imagen de césped.
    *   Añade la ley **Box Collider 2D**.
    *   **MUY IMPORTANTE:** En el Rigidbody, pon el tipo en **Static**. ¡Si no, el suelo se caerá al vacío por la gravedad al empezar el juego!
2.  **Crea al Héroe:**
    *   Clic derecho > **Materia Sprite**. Ponle tu imagen de personaje.
    *   Añade **Rigidbody 2D** (Déjalo en Dynamic).
    *   Activa **Fixed Rotation** para que no ruede por el suelo.
    *   Añade la ley **Movement**. Selecciona el modo "Plataformas".
3.  **Configura la Cámara:**
    *   Selecciona la Cámara que ya viene por defecto.
    *   Añade la ley **Camera Follow**.
    *   En el campo "Target", arrastra a tu personaje desde la jerarquía. ¡Ahora la cámara te seguirá como un paparazzi!
4.  **Crea la Meta:**
    *   Crea un Sprite de un banderín.
    *   Ponle un colisionador y marca la casilla **Is Trigger**.
    *   Añade la ley **Scene Loader**. En "Ruta", selecciona el nombre de tu nivel.
    *   **Resultado:** Cuando toques la bandera, el nivel se reiniciará. ¡Acabas de crear un bucle de juego!

---

## 🧪 CAPÍTULO 9: PRINCIPIOS DE DISEÑO (CÓMO HACERLO DIVERTIDO)

Hacer un juego es fácil. Hacer un juego *divertido* requiere psicología:

1.  **La Regla de los 3 Segundos:** Si el jugador no entiende qué tiene que hacer en los primeros 3 segundos, se frustrará. Usa flechas o monedas para guiar el camino.
2.  **Feedback (Sensaciones):** Cuando el jugador salte, añade un pequeño sonido de "boing". Cuando golpee un enemigo, haz que el enemigo parpadee en blanco. Estas pequeñas cosas hacen que el juego se sienta profesional.
3.  **Dificultad Progresiva:** No pongas al jefe final en la primera pantalla. Deja que el jugador aprenda a moverse antes de ponerle obstáculos mortales.
4.  **Curva de Aprendizaje:** Enseña una mecánica nueva en un entorno seguro (sin enemigos) antes de pedirle al jugador que la use bajo presión.
5.  **Recompensa:** Siempre dale algo al jugador por sus logros. Un sonido, un efecto de partículas o un aumento de puntos.
6.  **Variedad Visual:** Cambia el color de los niveles o añade pequeños detalles que no afecten al juego (nubes, pájaros) para que no parezca monótono.
7.  **Sonido Inmersivo:** Un buen sonido de fondo (ambientación) puede hacer que un juego simple parezca una obra maestra.
8.  **Pruebas de Juego:** Pide a un amigo que juegue. Si se queda atascado en un sitio, es que tu diseño necesita mejorar ahí.
9.  **Pulido (Juiciness):** Añade pequeñas sacudidas de cámara cuando haya una explosión. Estos detalles separan un juego amateur de uno profesional.
10. **Claridad:** El jugador nunca debe preguntarse "¿puedo saltar ahí?". Usa colores diferentes para lo que es suelo y lo que es decoración.
11. **Ritmo (Pacing):** Combina momentos de mucha acción con momentos de calma para que el jugador pueda descansar la mente.
12. **Mecánica Única:** Intenta que tu juego tenga al menos una cosa que no tengan los demás. ¡Sé creativo!
13. **Narrativa Visual:** Cuenta una historia a través del escenario. Si hay una espada rota en el suelo, el jugador pensará que hubo una batalla ahí.
14. **Controles Intuitivos:** Si el jugador tiene que presionar 5 teclas a la vez para saltar, tu juego es demasiado difícil de controlar.
15. **Expectativa:** Genera misterio. Si el jugador ve una puerta cerrada al principio, querrá encontrar la llave para ver qué hay detrás.

---

## 🗺️ CAPÍTULO 10: CONSEJOS MAESTROS DE CONSTRUCCIÓN DE MUNDOS

### 10.1 El Arte del Parallax (Profundidad Real)
Un juego plano se siente barato. Usa el componente **Parallax** para crear capas de fondo:
*   **Capa 1 (Suelo):** Se mueve a velocidad 1.0.
*   **Capa 2 (Árboles lejanos):** Velocidad 0.5.
*   **Capa 3 (Montaños lejanas):** Velocidad 0.2.
*   **Capa 4 (Cielo):** Velocidad 0.05.
*   *Resultado:* Al caminar, el fondo parecerá inmenso y realista.

### 10.2 Iluminación Dinámica para el Miedo
¿Quieres un juego de terror?
1.  Baja el color de fondo de la cámara a negro total.
2.  Ponle un **Point Light 2D** a tu personaje.
3.  Ahora el jugador solo podrá ver lo que tiene cerca. ¡Miedo instantáneo!

### 10.3 Uso Inteligente de Tilemaps
Si haces un nivel de 1 kilómetro usando Sprites individuales, el ordenador irá lento. Usa el **Tilemap Editor**. El motor está optimizado para dibujar millones de bloques de Tilemap gastando la misma energía que un solo Sprite suelto.

---

## 🛠️ CAPÍTULO 11: FLUJO DE TRABAJO PROFESIONAL

### 11.1 El Secreto de los Prefabs
Imagina que haces 50 niveles y en todos hay una moneda. Si decides que la moneda debe brillar más, tendrías que cambiar miles de objetos uno por uno.
**Usa Prefabs:** Crea una moneda, arrástrala a tus archivos (Assets). Ahora es un Prefab. Si cambias el archivo Prefab, ¡todas las monedas de todos los niveles cambiarán a la vez! Ahorrarás semanas de trabajo.

### 11.2 Etiquetas (Tags) y Capas (Layers)
*   **Tags:** Úsalas para identificar grupos de lógica. Marca a todos los malos como "Enemigo".
*   **Layers:** Úsalas para la física y el dibujo. Crea una capa llamada "Agua" y dile al motor que el Jugador choca con ella pero las Balas la atraviesan.
*   **Carpeta de Assets:** Mantén todo ordenado. Crea carpetas para `/Sonidos`, `/Imagenes`, `/Scripts`. Un proyecto desordenado es un proyecto que nunca se termina.

---

## 📖 CAPÍTULO 12: EL GRAN GLOSARIO TÉCNICO (PARA HUMANOS)

*   **DeltaTime:** El tiempo entre un dibujo de pantalla y el siguiente. Mantiene la velocidad constante en todos los ordenadores del mundo.
*   **X / Y:** Las coordenadas de tu universo. X es horizontal. Y es vertical (En este motor, hacia arriba es positivo).
*   **Prefab:** Un molde de objeto para crear copias idénticas al instante.
*   **Asset:** Cualquier archivo externo: una canción (.mp3), un dibujo (.png) o un video (.mp4).
*   **Scene (Escena):** Un nivel, un menú o una pantalla de créditos.
*   **FPS (Frames Per Second):** Velocidad a la que se dibuja el juego. 60 es la perfección, 30 es aceptable.
*   **Collision (Colisión):** El choque físico entre dos objetos sólidos.
*   **Trigger (Gatillo):** Una colisión fantasma que solo detecta el paso pero no bloquea el camino.
*   **Parenting (Paternidad):** Meter un objeto dentro de otro para que lo siga fielmente.
*   **Pivot (Pivote):** El punto exacto desde donde el objeto gira, se escala y se posiciona.
*   **Z-Order:** El orden de profundidad. Quién tapa a quién.
*   **Draw Call:** Cada vez que el motor le pide a la tarjeta gráfica que dibuje algo. Menos draw calls = más FPS.
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

---

## ❓ CAPÍTULO 13: EL MÉDICO DEL MOTOR (SOLUCIÓN DE PROBLEMAS)

*   **"Mi personaje atraviesa el suelo":** Revisa que AMBOS tengan colisionador y que el suelo sea **Static** mientras el personaje es **Dynamic**.
*   **"No veo nada al darle a Play":** Revisa que tengas una Cámara en la jerarquía y que la posición Z de los objetos no sea un número extraño.
*   **"Mi UI no funciona":** Asegúrate de que todos los botones sean hijos de un Canva y de haber configurado los **Anchors**.
*   **"El juego va lento":** Estás usando demasiados Sprites. Pásate al **Tilemap Editor** para los fondos y suelos.
*   **"Las animaciones se ven cortadas":** Revisa que los FPS en el Editor de Animación coincidan con la velocidad que quieres.
*   **"El salto no funciona":** Asegúrate de que el Rigidbody esté en modo **Dynamic** y de que el objeto tenga un colisionador.
*   **"El motor se cierra al guardar":** Revisa que el nombre de tu proyecto no tenga caracteres raros como ñ o acentos.
*   **"Mi luz no ilumina":** Revisa la intensidad y el radio en el Inspector. Asegúrate de que no haya un objeto gigante tapándola.
*   **"No escucho el sonido":** Revisa si la casilla "Play on Awake" está marcada o si el volumen está en 0.
*   **"Carl IA no me entiende":** Prueba a ser más específico con los nombres de los objetos o las leyes.
*   **"El cursor desaparece":** Revisa si has activado el modo "Lock Cursor" en la configuración avanzada.
*   **"Mi objeto gira sin parar":** Activa la casilla **Fixed Rotation** en el Rigidbody.
*   **"No puedo mover la cámara en el editor":** Mantén presionado el botón derecho del ratón o la rueda central.
*   **"El suelo se cae":** Cambia el Rigidbody del suelo a tipo **Static**.
*   **"Mi script da error":** Revisa la consola (abajo). Haz clic en el error y te llevará a la línea que está mal.
*   **"No puedo arrastrar archivos":** Revisa que tu navegador tenga permisos para acceder a las carpetas locales.
*   **"El prefab no se guarda":** Asegúrate de estar en el Modo Edición de Prefab antes de hacer cambios profundos.
*   **"El Tilemap no choca":** Recuerda añadir la ley **TilemapCollider2D** a la materia del Tilemap.

---

**[ESPACIO PARA CAPTURA: El ciclo completo de creación de un videojuego desde la idea hasta el botón de Play]**

*Este libro es solo el principio de tu aventura. Creative Engine es un lienzo infinito, y tú eres el artista. No tengas miedo de experimentar, de romper cosas y de volver a construirlas. La mejor forma de aprender es abriendo el editor y creando algo hoy mismo. El mundo está esperando tu historia.*

© 2024 Carley Interactive Studio. Documentación redactada para la eternidad, la pasión y la creatividad absoluta. No dejes de crear.
