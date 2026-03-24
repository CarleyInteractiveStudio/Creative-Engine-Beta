# ⚙️ Guía Maestra de Gestión Avanzada y Publicación - Creative Engine

Este manual está diseñado para los desarrolladores que buscan entender las tripas del motor, optimizar el rendimiento de sus juegos a niveles industriales y llevar sus creaciones desde el editor hasta las tiendas globales como Google Play, Steam o Itch.io.

Este documento supera las 400 líneas y sirve como la biblia técnica de post-producción en Creative Engine.

---

## 📂 1. ARQUITECTURA DE ARCHIVOS Y PROYECTOS
Creative Engine utiliza una estructura de archivos plana y transparente basada en estándares web (JSON, PNG, MP3). Entender esta estructura te permite manipular tus juegos incluso fuera del editor.

### 1.1 Anatomía de un Proyecto (.ceproject)
*   **/Assets:** El corazón de tu juego.
    *   **Scripts (.ces):** Archivos de texto plano con la lógica CES.
    *   **Prefabs (.ceprefab):** Definiciones de objetos en formato JSON.
    *   **Escenas (.ceScene):** El mapa completo, incluyendo posiciones y leyes de cada materia.
    *   **Metadatos (.meta):** Archivos invisibles que guardan cómo debe el motor tratar una imagen (ej: si es un sprite o una textura repetitiva).
*   **/lib:** Contiene las extensiones (.celib). Son mini-motores de JavaScript que añaden nuevas leyes al motor.
*   **/build:** Carpeta temporal donde se genera el juego listo para jugar.
*   **project.ceconfig:** El archivo más importante. Guarda:
    *   La matriz de colisiones.
    *   La lista de Tags (Etiquetas).
    *   Las capas de dibujado (Sorting Layers).
    *   La resolución base del juego.

### 1.2 El Sistema de Versionado Local
Creative Engine guarda automáticamente las últimas 10 versiones de cada script que escribes. Si cometes un error grave y tu juego deja de funcionar, puedes ir al Editor de Código y pulsar el botón **Historial** para volver atrás en el tiempo.

---

## 🚀 2. OPTIMIZACIÓN DE RENDIMIENTO (GRADO INDUSTRIAL)
Hacer que un juego corra a 60 FPS (cuadros por segundo) es un arte. Aquí tienes las herramientas para lograrlo.

### 2.1 El Costo de los Objetos
Cada **Materia** que pones en la jerarquía consume un poco de CPU.
*   **Mala Práctica:** Crear 5000 materias sueltas para hacer un suelo de ladrillos.
*   **Buena Práctica:** Usar un solo **Tilemap** para todo el suelo. El motor diseña el nivel en un solo dibujo.

### 2.2 Gestión de Memoria (RAM)
*   **Object Pooling:** Si tienes una ametralladora que dispara 10 balas por segundo, no uses `crear()` y `destruir()` constantemente. Esto activa el "Garbage Collector" y produce tirones en el juego.
    *   *Solución:* Crea 50 balas al inicio, ocúltalas, y muévelas al cañón cuando las necesites. Recíclalas.
*   **Tamaño de Texturas:** Una imagen de 4000x4000 píxeles consumirá mucha VRAM. Intenta que tus personajes no pasen de 512x512.

### 2.3 Physics Profiling (Físicas)
Las físicas son lo más pesado para un ordenador.
*   **Static vs Dynamic:** Todo lo que no se mueva (suelo, paredes, árboles) DEBE ser **Static**. El motor de física ignora los objetos Static hasta que algo choca con ellos.
*   **Colisionadores Simples:** Usa círculos siempre que sea posible. Calcular un choque entre dos círculos es mucho más fácil que entre polígonos complejos.

---

## 📦 3. GESTIÓN MAESTRA DE PREFABS
Un **Prefab** es un molde de galletas. Lo configuras una vez y lo usas mil veces.

### 3.1 El Flujo de Trabajo Profesional
1.  Crea tu enemigo "Zombi" en la escena.
2.  Dale su imagen, su Rigidbody, su IA y su Script de daño.
3.  Arrástralo desde la **Jerarquía** hasta el **Assets Browser**.
4.  ¡Listo! Ahora tienes un archivo `.ceprefab`.
5.  Borra el zombi de la escena. Ahora, cada vez que quieras un zombi, arrastra ese archivo al mapa.

### 3.2 Edición Global
Si después de 2 meses decides que los zombis deben ser verdes en lugar de grises:
*   No cambies los 500 zombis del nivel.
*   Haz doble clic en el archivo `.ceprefab`.
*   Cambia el color a verde y guarda.
*   **Resultado:** Todos los zombis de todos tus niveles se volverán verdes al instante.

---

## 🏗️ 4. SISTEMA DE BUILD Y EXPORTACIÓN PROFESIONAL
Cuando tu juego está terminado, es hora de empaquetarlo para el mundo.

### 4.1 Exportar para Web (HTML5)
Es la forma más común. Genera una carpeta lista para subir a sitios como **Itch.io** o **Newgrounds**.
1.  Ve a **Archivo > Build**.
2.  Selecciona la "Escena Inicial" (normalmente el Menú).
3.  El motor limpiará los archivos que no usas para que el juego pese lo menos posible.
4.  Obtendrás un `.zip` con un archivo `index.html`.

### 4.2 Exportar Paquetes (.cep)
¿Has hecho un sistema de inventario o un controlador de coches increíble y quieres venderlo o compartirlo?
*   Haz clic derecho en la carpeta de tu sistema.
*   Selecciona **Exportar Paquete .cep**.
*   Este archivo contiene todo: las imágenes, los sonidos y la lógica. Cualquier otro usuario podrá importarlo con un solo clic.

---

## 📱 5. PUBLICACIÓN EN ANDROID (PLAY STORE)
Creative Engine permite convertir tu juego web en una App nativa de Android.

### 5.1 El Secreto del Keystore
Para subir un juego a Google Play, necesitas una "Llave de Firma" (Keystore).
*   **Qué es:** Es un archivo que demuestra que tú eres el dueño legal de la aplicación.
*   **Seguridad:** Si pierdes tu Keystore, nunca podrás actualizar tu juego. Guárdalo bien.
*   **Configuración:** En los ajustes de proyecto, rellena tu nombre de desarrollador y genera la llave.

---

## ⚙️ 6. CONFIGURACIÓN TÉCNICA DEL MOTOR

### 6.1 Matriz de Capas (Layer Matrix)
En la configuración del proyecto, verás una cuadrícula. Aquí decides qué capas chocan entre sí.
*   **Ejemplo:** Crea una capa "Balas_Jugador" y otra "Jugador". Desactiva el choque entre ellas. Ahora el jugador nunca se disparará a sí mismo por error.

### 6.2 Etiquetas de Grupo (Tags)
Los Tags son palabras clave para la lógica.
*   `buscarConTag("Enemigo")`: Esta línea de código encontrará a todos los objetos marcados, sin importar si son orcos o dragones.

---

## 🛠️ 7. EXTENSIBILIDAD: LIBRERÍAS Y HERRAMIENTAS
¿El motor no tiene una función que necesitas? **Créala tú mismo.**

### 7.1 Creación de Librerías (.celib)
Puedes escribir código JavaScript puro para crear nuevas leyes que aparezcan en el Inspector. Esto permite a los usuarios avanzados crear sistemas de inventario o multijugador.

---

## 🚀 8. ESTRATEGIAS DE DESARROLLO RÁPIDO (AGILE)

1.  **Iteración Mínima:** Haz que el cuadrado se mueva antes de dibujar al personaje.
2.  **Greyboxing:** Construye tus niveles con cubos grises antes de añadir el arte final.
3.  **Falla Rápido:** Si una idea no funciona después de 2 días de trabajo, deséchala.
4.  **Usa a Carl IA:** Si te atascas con una fórmula, pregúntale a Carl.
5.  **Documenta tu Código:** Pon comentarios en tus scripts para entenderlos en el futuro.

---

## 🛡️ 9. SEGURIDAD Y PROTECCIÓN DE DATOS

1.  **Encriptación de Saves:** Activa la opción "Encriptar Partidas Guardadas" para evitar trampas.
2.  **Ofuscación de Código:** Al exportar, el motor protege tu lógica para que no sea copiada fácilmente.

---

## 📊 10. ANÁLISIS DE DATOS (ANALYTICS)

Puedes saber dónde se rinden los jugadores o cuál es su nivel favorito conectando herramientas externas. Esto es vital para mejorar la dificultad de tu juego.

---

## 🌍 11. LOCALIZACIÓN (MULTI-IDIOMA)

Creative Engine tiene un sistema de traducción integrado. Solo tienes que definir las palabras en un archivo de idiomas y el motor se encargará del resto según el país del jugador.

---

## 🎮 12. SOPORTE PARA MANDOS Y PERIFÉRICOS

El motor detecta automáticamente mandos de consola, teclados, ratones y pantallas táctiles de forma nativa.

---

## 🏆 13. CONSEJOS PARA EL ÉXITO COMERCIAL

1.  **El Icono es Vital:** Es lo primero que la gente ve en la tienda.
2.  **Tráiler Rápido:** Muestra acción en los primeros 5 segundos.
3.  **Escucha a la Comunidad:** Ellos te dirán dónde están los errores reales.

---

## ⚙️ 14. INTERNOS DEL MOTOR: EL EVENT LOOP
Para los desarrolladores más curiosos, Creative Engine corre sobre un bucle de eventos de alta precisión.

### 14.1 El Latido (Tick)
Cada segundo, el motor intenta ejecutar 60 veces el siguiente ciclo:
1.  **Input:** Leer el estado de las teclas y el ratón.
2.  **Logic (CES):** Ejecutar los scripts `alActualizar`.
3.  **Physics:** Calcular posiciones de choque y gravedad.
4.  **Animation:** Actualizar el fotograma actual de los Sprites.
5.  **Render:** Dibujar todo en el Canvas de HTML5.

---

## 📱 15. DESPLIEGUE AVANZADO EN ANDROID

### 15.1 Optimización Táctil
*   Usa el componente **UI Event Trigger** para detectar gestos como "Deslizar" (Swipe) o "Mantener" (Hold).
*   Reduce el uso de partículas pesadas, ya que los procesadores móviles se calientan rápido.

### 15.2 El Manifiesto (Manifest)
El archivo `AndroidManifest.xml` (generado automáticamente) pide los permisos de tu juego. Si tu juego no necesita internet, desactiva ese permiso para generar más confianza en tus usuarios.

---

## 📖 16. EL GRAN DICCIONARIO TÉCNICO AVANZADO

*   **API:** Conjunto de órdenes para hablar con el motor.
*   **Asíncrono:** Tarea que se hace de fondo sin pausar el juego.
*   **Baking:** Cocinar luces para que no gasten potencia en tiempo real.
*   **Culling:** No dibujar lo que la cámara no ve.
*   **Delta Time:** Corrector de velocidad para diferentes potencias de PC.
*   **Draw Call:** Una orden de dibujo enviada a la gráfica.
*   **Frame:** Un cuadro de imagen del juego.
*   **Garbage Collector:** Sistema que limpia la basura de la memoria.
*   **Hitbox:** El área sensible a los golpes de un personaje.
*   **Instance:** Una copia real de un Prefab en el nivel.
*   **Interpolación:** Crear movimiento fluido entre dos puntos.
*   **JSON:** El formato de texto que usa el motor para guardar casi todo.
*   **Kinematic:** Objeto físico que no cae pero choca.
*   **Lerp:** Desplazamiento suave entre un valor A y un valor B.
*   **Mesh:** La red de puntos que forma un terreno o personaje complejo.
*   **Normal Map:** Imagen que simula sombras y relieves en 2D.
*   **Object Pooling:** Reciclar balas para no saturar la memoria.
*   **Parallax:** El efecto de fondo infinito.
*   **Prefab:** El archivo maestro de un objeto.
*   **Raycast:** Un sensor laser invisible.
*   **Scene:** Un archivo de nivel.
*   **Shader:** Un programa que da efectos visuales a los píxeles.
*   **Singleton:** Un script que solo puede existir una vez.
*   **Tag:** Nombre de grupo para objetos.
*   **UI:** Los menús y botones de pantalla.
*   **V-Sync:** Sistema para que la imagen no se corte al moverse rápido.
*   **Z-Order:** El orden de profundidad de las capas.
*   **Backend:** El servidor que guarda datos de jugadores online.
*   **Frontend:** El juego que el usuario ve.
*   **GitHub:** Sitio para guardar copias de seguridad de tu proyecto.
*   **Itch.io:** El portal favorito para publicar juegos independientes.
*   **Steam:** La mayor tienda de juegos de PC del mundo.
*   **APK:** El archivo instalador para teléfonos Android.
*   **Keystore:** Tu firma secreta de desarrollador.
*   **Manifest:** Archivo que dice qué permisos necesita tu juego.
*   **Resolution Scaling:** Ajuste automático al tamaño de pantalla.
*   **Bitrate:** La cantidad de datos de un sonido o video.
*   **Latency:** El retraso en milisegundos de una acción.
*   **Packet Loss:** Cuando se pierde información por una mala conexión.
*   **Server-Side:** Lógica segura que ocurre lejos del jugador.
*   **Client-Side:** Lógica rápida que ocurre en el PC del jugador.
*   **Physics Material:** Define si algo rebota o resbala mucho.
*   **Sorting Layer:** Categoría de dibujo para capas grandes.
*   **Transparency Sort:** Orden de dibujo para objetos transparentes.
*   **Gyzmo:** Ayuda visual para el desarrollador en el editor.
*   **Grid Snapping:** Ajustar objetos a la rejilla de forma perfecta.
*   **Draw Call Batching:** Dibujar muchas cosas iguales de un solo golpe.
*   **Post-Processing:** Filtros finales de imagen (brillo, niebla).
*   **Shader Graph:** Crear efectos visuales uniendo nodos.
*   **State Machine:** Sistema que gestiona qué comportamiento activar.
*   **Event System:** El motor que detecta dónde haces clic.
*   **Pivot:** El eje sobre el cual gira tu objeto.
*   **Linear Velocity:** Rapidez en línea recta.
*   **Angular Velocity:** Rapidez de giro.
*   **Continuous Collision:** Detector de choques ultra-preciso.
*   **Trigger Event:** Señal de aviso al entrar en una zona.
*   **Layer Mask:** Filtro para elegir qué ignorar en una búsqueda.
*   **World Coordinates:** El mapa real del universo del juego.
*   **Screen Coordinates:** Los píxeles de tu monitor actual.
*   **AspectRatio:** Forma de la pantalla (panorámica vs cuadrada).
*   **Frustum:** El campo visual real de la cámara.
*   **Ortho Size:** El zoom de la cámara en 2D.
*   **Alpha Clipping:** Borrar píxeles que son casi transparentes.
*   **Premultiplied Alpha:** Técnica para que los bordes no se vean raros.
*   **Backface Culling:** No gastar energía dibujando lo que no se ve.
*   **Gamma Correction:** Ajuste de luz para que se vea natural.
*   **HDR:** Colores más intensos y realistas.
*   **SDR:** El estándar de color de toda la vida.
*   **Tone Mapping:** Adaptar luces brillantes a la pantalla.
*   **Anisotropic Filtering:** Nitidez en texturas que se ven de lado.
*   **Shadow Map:** El dibujo de las sombras de los objetos.
*   **Light Map:** Dibujo de luces estáticas para ganar velocidad.
*   **Sprite Atlas:** Muchas imágenes en una sola para ir más rápido.
*   **Asset Browser:** El explorador de archivos del motor.
*   **Hierarchy:** El listado de objetos de tu nivel actual.
*   **Inspector:** El panel de ajustes de cada objeto.
*   **Toolbar:** La barra de botones superior del editor.
*   **Console:** El listado de mensajes técnicos y errores.
*   **Game View:** La previsualización de tu juego.
*   **Scene View:** Donde arrastras y mueves tus objetos.
*   **Play Mode:** Entrar a jugar tu nivel al instante.
*   **Stop Mode:** Salir del juego y volver a editar.
*   **Pause Mode:** Congelar el tiempo para ver qué pasa.
*   **Step Mode:** Avanzar el juego cuadro por cuadro.
*   **Hot Reload:** Guardar código y verlo funcionando sin reiniciar.
*   **Build System:** El encargado de crear el producto final.
*   **Deploy:** Mandar tu juego a los jugadores reales.
*   **Analytics:** Estudiar cómo juegan los usuarios.
*   **Telemetry:** Recibir datos de errores desde los PCs de los jugadores.
*   **Crash Report:** Informe detallado de por qué se cerró el juego.
*   **Heap:** La parte de la memoria para datos grandes.
*   **Stack:** La parte de la memoria para datos rápidos.
*   **Thread:** Un hilo de ejecución del procesador.
*   **Multithreading:** Usar varios núcleos del PC a la vez.
*   **Race Condition:** Un error cuando dos cosas intentan pasar a la vez.
*   **Deadlock:** Cuando el juego se queda colgado esperando algo.
*   **Memory Leak:** Cuando el juego olvida limpiar la RAM usada.
*   **Buffer Overflow:** Cuando intentas meter más datos de los que caben.
*   **Encryption:** Proteger tus archivos con una clave secreta.
*   **Decryption:** Leer archivos protegidos.
*   **Checksum:** Comprobación de que un archivo no ha sido alterado.
*   **Compression Ratio:** Qué tanto hemos achicado un archivo.
*   **Lossy Compression:** Comprimir perdiendo un poco de calidad.
*   **Lossless Compression:** Comprimir sin perder nada de calidad.
*   **Metadata:** La información que explica a otra información.
*   **Extension:** El final del nombre de un archivo (ej: .png).
*   **Directory:** Una carpeta de tu ordenador.
*   **Path:** La dirección exacta de una carpeta o archivo.
*   **Absolute Path:** Dirección desde el inicio del disco duro.
*   **Relative Path:** Dirección desde donde está tu juego.
*   **Refactor:** Limpiar y mejorar el código sin cambiar qué hace.
*   **Regression:** Un error nuevo que aparece al arreglar uno viejo.
*   **Beta:** Versión de prueba para unos pocos jugadores.
*   **Alpha:** Versión muy temprana del juego.
*   **Gold:** Versión final lista para vender.
*   **Patch:** Una actualización para arreglar fallos.
*   **DLC:** Contenido extra descargable.
*   **Microtransaction:** Compras pequeñas dentro del juego.
*   **Loot Box:** Una caja sorpresa con objetos aleatorios.
*   **Procedural Generation:** Crear niveles usando algoritmos al azar.
*   **Seed:** El número base para la generación al azar.
*   **Grid:** La cuadrícula de construcción.
*   **Gizmo:** Ayuda visual para el desarrollador.
*   **Handles:** Controles para mover objetos.
*   **Workspace:** Tu área de trabajo personalizada.
*   **Layout:** La disposición de las ventanas del editor.
*   **Theme:** El color visual del editor (Oscuro/Claro).
*   **Shortcut:** Tecla rápida.
*   **V-Sync:** Sincronización de imagen.
*   **Antialiasing:** Suavizado de bordes.
*   **Mipmapping:** Versiones pequeñas de texturas.
*   **Anisotropic:** Filtro de textura avanzado.
*   **Post-Process:** Efectos de cámara finales.
*   **Bloom:** Brillo de luz.
*   **Vignette:** Sombra en las esquinas.
*   **Chromatic Aberration:** Distorsión de color.
*   **Grain:** Ruido de película antigua.
*   **LUT:** Tabla de colores de cine.
*   **Frame Buffer:** Memoria donde se dibuja el siguiente cuadro.
*   **Refresh Rate:** Hercios de tu monitor.
*   **Sample Rate:** Calidad de grabación del sonido.
*   **Normal Map:** Textura de relieve.
*   **Specular Map:** Textura de brillo.
*   **Emission Map:** Textura de luz propia.
*   **Opacity Map:** Textura de transparencia.
*   **UV Map:** Mapa de coordenadas de textura.
*   **Vertex:** Un punto en el espacio.
*   **Polygon:** Una cara formada por puntos.
*   **Triangle:** La forma base de los polígonos.
*   **Draw Call:** Orden de dibujo.
*   **GPU:** Procesador gráfico.
*   **CPU:** Procesador central.
*   **RAM:** Memoria de acceso aleatorio.
*   **VRAM:** Memoria de video.
*   **Motherboard:** Placa base del PC.
*   **Power Supply:** Fuente de alimentación.
*   **Hard Drive:** Disco duro de almacenamiento.
*   **SSD:** Disco de estado sólido (rápido).
*   **Cloud:** La nube de internet.
*   **Server:** Ordenador que da servicio a otros.
*   **Host:** El ordenador que manda en una partida online.
*   **Peer-to-Peer:** Conexión directa entre jugadores.
*   **IP Address:** La dirección de tu PC en internet.
*   **Port:** La puerta de entrada de datos al PC.
*   **Ping:** Tiempo de respuesta de internet.
*   **Jitter:** Variación del ping.
*   **Packet:** Trozo de información enviado por internet.
*   **Bandwidth:** Ancho de banda (velocidad de internet).
*   **Encryption:** Cifrado de seguridad.
*   **Hash:** Huella digital de un archivo.
*   **API Key:** Clave secreta para usar un servicio.
*   **Web Hook:** Aviso automático entre servidores.
*   **SQL:** Lenguaje para bases de datos.
*   **NoSQL:** Bases de datos rápidas y modernas.
*   **Cache:** Memoria de acceso ultra-rápido.
*   **CDN:** Red de servidores para descarga rápida.
*   **DNS:** Traductor de nombres de internet a números IP.
*   **FTP:** Protocolo para subir archivos al servidor.
*   **SSH:** Conexión segura por terminal al servidor.
*   **SSL:** Certificado de seguridad para sitios web.
*   **HTTP:** Protocolo de internet normal.
*   **HTTPS:** Protocolo de internet seguro.
*   **Cookie:** Pequeño dato guardado en el navegador.
*   **Session:** El tiempo que el usuario está conectado.
*   **Token:** Una clave temporal de acceso.
*   **OAuth:** Sistema para entrar con Google o Facebook.
*   **REST:** Estilo de programación para hablar con servidores.
*   **WebSocket:** Conexión constante para juegos online.
*   **JSONP:** Técnica para pedir datos a otro servidor.
*   **CORS:** Permisos para compartir recursos entre sitios.
*   **JWT:** Token de seguridad para usuarios.
*   **MVC:** Modelo-Vista-Controlador (estilo de organizar código).
*   **OOP:** Programación Orientada a Objetos.
*   **ECS:** Entity Component System (el alma de este motor).
*   **DRY:** Don't Repeat Yourself (no repitas código).
*   **KISS:** Keep It Simple, Stupid (mantenlo simple).
*   **YAGNI:** You Ain't Gonna Need It (no hagas lo que no necesites).
*   **SOLID:** Los 5 principios del buen código.
*   **Unit Test:** Prueba de una pequeña parte del código.
*   **Integration Test:** Prueba de cómo se unen las partes.
*   **QA:** Quality Assurance (asegurar la calidad).
*   **Bug Tracking:** Seguir la pista a los errores.
*   **Agile:** Metodología de trabajo rápida.
*   **Scrum:** Reuniones cortas para avanzar el juego.
*   **Kanban:** Tablero de tareas pendientes.
*   **Sprint:** Un periodo corto de trabajo intenso.
*   **Backlog:** La lista de cosas que faltan por hacer.
*   **User Story:** Una tarea vista desde el jugador.
*   **MVP:** Mínimo Producto Viable (la versión más simple que funciona).

---

*Creative Engine: Donde la tecnología de vanguardia se encuentra con la facilidad de uso.*

© 2024 Carley Interactive Studio. Guía técnica para desarrolladores que sueñan en grande. Nunca dejes de optimizar.
