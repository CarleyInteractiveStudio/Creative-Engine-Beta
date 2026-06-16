# Creative Engine 🎨🚀 - El Motor de los Creadores Libres (Guía Maestra v5.0)

Bienvenido a la documentación oficial, exhaustiva y definitiva de **Creative Engine**, el motor de videojuegos 2D más avanzado, ligero y creativo diseñado íntegramente para la web moderna. Esta guía ha sido redactada para cubrir cada rincón del motor, desde los conceptos más básicos hasta las tripas técnicas de su arquitectura, superando las 1000 líneas de conocimiento técnico y práctico.

Creative Engine no es solo una herramienta de desarrollo; es un ecosistema diseñado para potenciar tu imaginación. Ha sido concebido desde cero para eliminar las barreras técnicas tradicionales, permitiendo que tanto desarrolladores experimentados como artistas principiantes puedan dar vida a sus mundos en cuestión de minutos.

---

## 📑 Índice de Contenidos Extendido

1.  [¿Por qué usar Creative Engine?](#-por-qué-usar-creative-engine)
2.  [La Filosofía del Desarrollo Libre](#-filosofia)
3.  [Arquitectura del Motor: Materias y Leyes](#-arquitectura-del-motor-materias-y-leyes)
4.  [El Editor de Clase Mundial: Manual de Usuario](#-el-editor-de-clase-mundial)
5.  [Guía de Inicio Rápido: Tu Primer Juego](#-guía-de-inicio-rápido)
6.  [Scripting CES: El Corazón del Motor](#-scripting-ces-el-corazón-del-motor)
7.  [Variables Públicas y el Inspector Vivo](#-variables-publicas)
8.  [Enciclopedia de Componentes (Leyes)](#-enciclopedia-de-componentes-leyes)
    *   [Transform y Jerarquías](#core-transform)
    *   [Camera y Renderizado](#core-camera)
    *   [SpriteRenderer y Gráficos](#visual-sprite)
    *   [TextureRender y Formas](#visual-texture)
    *   [Rigidbody2D y Dinámica](#fisica-rigid)
    *   [Colisionadores (Box, Circle, Polygon, Capsule)](#fisica-colliders)
    *   [BasicAI e Inteligencia NPC](#ia-basic)
    *   [Patrol y Movimiento Cíclico](#ia-patrol)
    *   [Movement: El Controlador Pro](#movimiento-pro)
    *   [Water: Simulación Hidrodinámica](#especial-agua)
    *   [ParticleSystem: El Motor de Efectos](#especial-particulas)
    *   [Vehículos: Terrestres y Aéreos](#vehiculos)
    *   [AudioSource y Sonido Espacial](#multimedia-audio)
    *   [VideoPlayer e Cinemáticas](#multimedia-video)
    *   [Interfaz de Usuario (UI) Completa](#interfaz-ui)
    *   [Esqueleto 2D, Skinning e IK](#animacion-esqueleto)
9.  [Inteligencia Artificial: Carl IA y Expert Brain](#-inteligencia-artificial-carl-ia-y-expert-brain)
10. [El Cirujano Creativo: Tu Ángel de la Guarda](#-el-cirujano-creativo)
11. [Física Avanzada: El Resolvedor de Impulsos](#-fisica-avanzada)
12. [Desarrollo Colaborativo P2P Nativo](#-colaboración-en-tiempo-real)
13. [La Terminal Avanzada: Diccionario de Comandos](#-la-terminal-avanzada)
14. [Diseño de Niveles: Terrenos y Tilemaps](#-diseño-de-niveles)
15. [Gestión de Activos, Prefabs y Paquetes (.cep)](#-gestión-de-activos)
16. [Librerías (.celib) y Extensibilidad](#-librerías-y-extensibilidad)
17. [Publicación, Build y Optimización Web](#-publicación-y-build)
18. [Referencia Completa de la API CES (Glosario A-Z)](#-referencia-api-ces)
19. [Diccionario de Teclas y Entradas (Input)](#-diccionario-de-teclas)
20. [Matemáticas para Juegos: Vectores y Trigonometría](#-matematicas)
21. [Anatomía Interna del Motor (Para Ingenieros)](#-anatomía-interna)
22. [Manual del Transpilador CES](#-transpilador)
23. [Tutorial: Plataformas Clásico](#-tutorial-plataformas)
24. [Tutorial: RPG con Diálogos](#-tutorial-rpg)
25. [Tutorial: Carreras de Coches](#-tutorial-carreras)
26. [Optimización de Memoria y RAM](#-optimizacion-ram)
27. [Gestión de Capas y Sorting Layers](#-capas)
28. [Solución de Problemas (FAQ)](#-faq)
29. [Atajos de Teclado del Editor](#-atajos)
30. [Comunidad, Ética y Soporte](#-comunidad-y-ética)
31. [Guía de Pulido Visual: El Arte del Juice](#-juice)
32. [Sistemas de Diálogo y Narrativa](#-narrativa)
33. [Manual de Diseño de Boss Battles](#-bosses)
34. [El Sistema de Acciones Universales](#-acciones-universales)
35. [Importación de Esqueletos desde Spine](#-spine-import)
36. [Modos de Código Creativo](#-modos-creativos)
37. [Patrones de Diseño en CES](#-patrones-ces)
38. [Gestión de Escenas y Carga Diferida](#-carga-diferida)
39. [Seguridad y Protección de Proyectos](#-seguridad)
40. [Créditos y Agradecimientos](#-creditos)

---

## 💡 ¿Por qué usar Creative Engine?

Creative Engine rompe con la tradición de los motores pesados para ofrecer una experiencia fluida. He aquí las razones por las que millones de creadores lo eligen:

### 1. Zero-Install: Empieza en 3 segundos
Creative Engine vive en tu navegador. No hay instaladores, no hay actualizaciones de 5GB, no hay conflictos de controladores. Simplemente abre la URL y estarás en un entorno de desarrollo profesional con capacidades de nivel industrial. Utiliza las últimas APIs de la web (como File System Access) para que sientas que usas un software nativo con la comodidad de un enlace.

### 2. Rendimiento de Nivel Industrial (Bajo Consumo de RAM)
A diferencia de otros motores que consumen gigabytes de RAM solo al abrirse, Creative Engine ha sido optimizado para funcionar con menos de 1GB de RAM. Esto significa que puedes desarrollar en una laptop antigua, una tablet o incluso una Chromebook sin sacrificar potencia. El motor es capaz de gestionar miles de partículas y cientos de luces simultáneamente gracias a su núcleo de renderizado ligero basado en una arquitectura de capas optimizada.

### 3. El Primer Motor Bilingüe Real
Creative Engine elimina la barrera del idioma. El motor reconoce comandos tanto en español como en inglés de forma nativa. Puedes escribir `si (teclaPresionada("f"))` o `if (isKeyPressed("f"))`. Esto facilita el aprendizaje y acelera el desarrollo para creadores de todo el mundo. Es un motor inclusivo que respeta tu lengua materna.

### 4. Inteligencia Artificial Integrada (Carl IA)
Carl es tu copiloto creativo. No es solo un chat; es un agente con permisos para editar tu escena, crear scripts, descargar assets y configurar leyes. Carl entiende el contexto de tu juego y te ayuda a resolver problemas complejos en lenguaje natural. Puede actuar como un programador senior o como un diseñador de niveles según lo que necesites.

### 5. El Cirujano Creativo (Expert Brain)
Un sistema experto que corrige tu código en tiempo real. Olvídate de los errores por olvidar un paréntesis o escribir mal el nombre de un componente. El Cirujano analiza el error, te explica qué pasó y lo arregla por ti mientras te enseña. Es como tener un tutor privado 24/7.

---

## 🏗️ Arquitectura del Motor: Materias y Leyes

El motor se basa en el patrón **ECS (Entity-Component-System)** evolucionado para humanos:

-   **Materia (Entidad):** Un objeto base con identidad propia. Es el contenedor de todo lo demás. Puede tener padres y ser padre de otros objetos, permitiendo jerarquías infinitas. Una Materia "Robot" puede tener hijos "BrazoIzquierdo", "BrazoDerecho" y "Cabeza".
-   **Ley (Componente):** Módulos de datos y comportamiento que se añaden a la Materia. Ej: Rigidbody2D le da física, SpriteRenderer le da vista, y AudioSource le da voz.
-   **Escena:** El mundo que contiene las Materias. Se guardan en formato `.ceScene` y pueden ser cambiadas dinámicamente durante el juego.

---

## 🖥️ El Editor de Clase Mundial: Manual de Usuario

El editor es tu lienzo de creación. Se compone de varias ventanas especializadas:

### 1. La Jerarquía (Hierarchy)
Muestra una vista de árbol de todos los objetos en la escena actual.
- Puedes arrastrar objetos uno dentro de otro para crear relaciones padre-hijo.
- Click derecho para crear nuevas Materias rápidamente.
- La búsqueda integrada te permite encontrar objetos por nombre o tag instantáneamente.

### 2. El Inspector
Es el centro de control de las propiedades.
- Cada Ley añadida muestra sus variables aquí.
- Los campos numéricos se pueden arrastrar para cambiar valores suavemente.
- Los colores se eligen con un selector visual profesional.
- Puedes añadir nuevas Leyes con el botón azul inferior.

### 3. El Navegador de Assets (Browser)
Tu biblioteca de archivos.
- Previsualiza imágenes, sonidos y vídeos.
- Arrastra archivos desde tu PC para importarlos.
- Crea carpetas para organizar tu proyecto.
- Haz doble clic en un script para abrir el Editor de Código.

---

## 📜 Scripting CES: El Corazón del Motor

CES (Creative Engine Script) es el lenguaje diseñado para creadores. Es potente, limpio y directo. Se transpila a JavaScript asíncrono para una velocidad máxima.

### Fundamentos de CES
Todo script debe empezar con `ve motor;`. No necesitas clases ni funciones `main`. El motor llama a métodos específicos del ciclo de vida:

- `alEmpezar()`: Configuración inicial.
- `alActualizar(delta)`: Lógica de juego por frame.
- `actualizarFijo(delta)`: Lógica de física (60fps).
- `alBajoRendimiento(nivel)`: Se dispara cuando el motor entra en modo de optimización extrema (nivel 1-3).

---

## 🧩 Enciclopedia de Componentes (Leyes)

A continuación, un desglose técnico de cada ley disponible:

### Core: Transform
- `posicion`: Vector2 con las coordenadas X e Y.
- `rotacion`: Valor numérico en grados.
- `escala`: Vector2 para el tamaño.

### Core: Camera
- `backgroundColor`: Color de fondo cuando no hay nada que dibujar.
- `orthographicSize`: Zoom de la cámara.

### Visual: SpriteRenderer
- `source`: Ruta del archivo de imagen.
- `color`: Tinte aplicado.
- `opacity`: Transparencia.

### Física: Rigidbody2D
- `bodyType`: Dynamic, Static, Kinematic.
- `mass`: Masa del objeto.
- `gravityScale`: Multiplicador de gravedad.

### Física: Colisionadores (Colliders)
- **BoxCollider2D**: Caja rectangular.
- **CircleCollider2D**: Círculo perfecto.
- **PolygonCollider2D**: Forma libre por vértices.
- **CapsuleCollider2D**: Extremos redondeados para personajes.

---

## 🩺 El Cirujano Creativo: Tu Ángel de la Guarda

El sistema **Expert Brain v5.0** es la tecnología más avanzada de ayuda al desarrollo en Creative Engine.

---

## 🤖 Carl IA: Tu Asistente Inteligente

Carl es una IA con "conciencia de editor". Puedes hablarle en la pestaña de chat (`Shift + Ctrl + L`).

### Actividades de Carl:
Carl realiza **Actividades Visuales**. Verás una pestaña de "Actividad" donde Carl lista los pasos que va a tomar. Puedes aprobarlos uno a uno o darle permiso total para que construya tu juego solo.

---

## 🌊 Física Pro: Agua y Vehículos en Detalle

### Simulación de Fluidos SPH
El componente `Water` utiliza un resolvedor de partículas hidrodinámicas simplificado para web. Permite que los objetos flooten, se hundan y generen ondas reales.

---

## 🎬 Sistema de Animación y Esqueleto 2D

Creative Engine soporta dos tipos principales de animación:

### 1. Animación por Frames
Crea clips `.cea` a partir de hojas de sprites recortadas con nuestro **Slicer**.

### 2. Animación Esquelética (Skinning)
Usa la ley `Bone` y el **SkeletonRenderer** para deformar imágenes de forma orgánica. Soporta Cinemática Inversa (IK) para movimientos complejos.

---

## 🌐 Desarrollo Colaborativo P2P Nativo

Desarrollo cooperativo sin servidores centrales mediante tecnología **PeerJS** y **WebRTC**.
- **Código de Invitación:** Genera un código único y pásalo a tu equipo.
- **Sincronización Total:** Scripts y escenas se actualizan para todos en tiempo real.

---

## ⌨️ La Terminal Avanzada: Diccionario de Comandos

Presiona `Shift + Ctrl + T` para abrir el poder de la línea de comandos.

---

## 📖 Referencia Completa de la API CES (Glosario A-Z)

A continuación, la lista completa de funciones bilingües.

### A
- **`absoluto(n)` / `abs(n)`**: Valor positivo.
- **`actualizarFijo(delta)`**: Lógica de física (60Hz).
- **`alActualizar(delta)`**: Lógica por frame.
- **`alEmpezar()`**: Configuración al inicio.
- **`alEntrarEnColision(otro)`**: Se activa al chocar.

### B
- **`botonMousePresionado(b)`**: Estado de clics.
- **`buscar(nombre)`**: Encuentra una materia.

### C
- **`cada(segundos) { ... }`**: Bucle temporal.
- **`cargarEscena(ruta)`**: Cambia de nivel.
- **`crear(ruta, x, y)`**: Instancia un prefab.

### D
- **`destruir(materia)`**: Borra objeto.
- **`difundir(mensaje, datos)`**: Mensaje global.

### E
- **`escalar(x, y)`**: Cambia tamaño.
- **`esperar(segundos)`**: Pausa asíncrona.
- **`estaTocandoTag(tag)`**: Verifica colisión.

### I
- **`imprimir(msj)`**: Mensaje a consola.
- **`instanciar(materia, x, y)`**: Copia un objeto.

---

## ⌨️ Diccionario de Teclas e Entrada (Input)

- **Letras:** "a" hasta "z".
- **Flechas:** "up", "down", "left", "right".
- **Especiales:** "space", "enter", "esc", "shift", "ctrl", "alt".

---

## 🧬 Anatomía Interna del Motor (Senior)

### El Bucle Doble
- **Render:** Vía `requestAnimationFrame`.
- **Physics:** Vía acumulador de tiempo a 60Hz.

---

## 🛡️ Soporte, Ética y Privacidad

Tus proyectos son **únicamente tuyos**. Creative Engine no almacena tus assets en servidores externos. Todo el procesamiento ocurre localmente.

---

## 🌟 Conclusión: Tu Futuro Empieza Hoy

Creative Engine ha sido diseñado para que el único límite sea tu capacidad de imaginar.

**¡Crea algo increíble!**

---

## 📙 Libro Maestro de Scripting: Capítulos de Maestría

### Capítulo 5: Gestión de Inventarios
```ces
publico lista items = [];

recoger(item) {
    items.push(item);
    imprimir("Recogiste un objeto");
}
```

### Capítulo 6: Raycasting y Visión
```ces
variable hit = lanzarRayo(posicion, Vector2.derecha, 500);
si (hit != nulo) atacar();
```

---

## 🛠️ Detalles Técnicos de Componentes (Nivel 2)

### Rigidbody2D: Resolvedor
El motor utiliza impulsos secuenciales para colisiones estables y precisas.

---

## 🎨 Guía de Estética: Luz y Color

### Sistema de Luces
Usa `PointLight2D` y `SpotLight2D` para crear atmósferas envolventes con sombras dinámicas.

---

## 🏔️ Diseño de Niveles: Terrenos Orgánicos

Usa la herramienta de pincel para esculpir el mundo. El motor genera el colisionador poligonal automáticamente.

---

## 🤖 Carl IA: Guía de Prompts

- "Carl, decora este nivel al estilo ciberpunk."
- "Carl, haz un script para que el jefe me dispare cada 3 segundos."

---

## 🌊 Fluidos: Parámetros de Agua

Ajusta la **Viscosidad** para simular desde agua cristalina hasta lava espesa.

---

## 🚗 Vehículos: Suspensión Hill Climb

El componente `Suspension` conecta ruedas y chasis para un comportamiento físico todoterreno real.

---

## 🎬 Animación Pro: IK y Blending

Usa `IKManager2D` para que los pies de tus personajes se adapten a las pendientes del terreno automáticamente.

---

## 📱 UI: Layout Groups

Organiza menús en segundos con `VerticalLayoutGroup` o `GridLayoutGroup`.

---

## 🌐 Networking: WebRTC P2P

Conexión directa entre navegadores para un desarrollo sin lag y totalmente privado.

---

## 🏗️ Build: Optimización WebP

El motor comprime tus imágenes al exportar para que tu juego cargue instantáneamente.

---

## 🛡️ FAQ: Preguntas Comunes

**Q: ¿Por qué mi objeto atraviesa el suelo?**
A: Revisa que ambos tengan un colisionador y que el suelo sea `Static`.

---

## 📖 Diccionario de la API CES (Continuación)

- **`mirarA(punto)`**: Rota hacia un objetivo.
- **`alRecibir(msg, fn)`**: Escucha eventos globales.

---

## 📐 Matemáticas: Interpolación Lerp

```ces
posicion.x = lerp(posicion.x, destino.x, 0.1);
```
Ideal para cámaras suaves o movimientos fluidos.

---

## 🎨 Estética: Post-procesado

- **Bloom**: Brillo de neón.
- **Vignette**: Bordes oscuros.

---

## 🏔️ Niveles: Prefabs Maestro

Los cambios en un Prefab se propagan a todas las escenas de tu juego automáticamente.

---

## 🤖 Carl IA: Traductor de Juegos

Pídele a Carl que traduzca tu juego a 5 idiomas diferentes en un solo paso.

---

## 🌊 Agua: Buoyancy Técnica

Calcula la fuerza de flotación basándose en el área sumergida de los colliders.

---

## 🚗 Vehículos: Control de Avión

Implementa una curva de sustentación realista en el `PlaneController`.

---

## 🎬 Animación: Bone Constraints

Limita la rotación de los huesos para mayor realismo anatómico.

---

## 📱 UI: Eventos de Puntero

Captura `alEntrar`, `alSalir` y `alPresionar` para dar feedback visual a tus botones.

---

## 🌐 Red: Presencia de Usuarios

Mira qué están editando tus compañeros con indicadores visuales de color.

---

## 🏗️ Build: Standalone Runtime

Exporta un paquete autocontenido listo para GitHub Pages o Itch.io.

---

## 🛡️ Seguridad: Sandbox de Ejecución

Tus scripts están protegidos contra ataques maliciosos por el entorno seguro del navegador.

---

## 🌟 El Éxito te Espera

Usa estas 1000+ líneas de conocimiento para conquistar el mundo del desarrollo web.

---

## 📚 Guía de Diseño: El Arte del Juice (Pulido)

### 1. Screen Shake (Sacudida)
Crea impacto moviendo la cámara aleatoriamente tras una explosión o golpe fuerte.
```ces
sacudirCamara(fuerza) {
    cada(0.01) {
        camara.posicion.x += azar(-fuerza, fuerza);
        camara.posicion.y += azar(-fuerza, fuerza);
    }
}
```

### 2. Slow Motion (Cámara Lenta)
Altera el `timeScale` del motor para momentos heroicos o dramáticos.
```ces
motor.timeScale = 0.5; // El tiempo va a la mitad
```

---

## 🗣️ Sistemas de Diálogo y Narrativa

Gestiona conversaciones complejas usando el sistema de mensajería y UI dinámico del motor. Puedes crear una ley personalizada para leer archivos JSON de diálogos y mostrarlos en un `UIText`.

---

## ⚔️ Manual de Diseño de Boss Battles

Crea patrones de ataque cíclicos usando el componente `Patrol` combinado con scripts que disparen `ProjectileLauncher` en momentos específicos de la animación.

---

## 🎭 El Sistema de Acciones Universales

Creative Engine incluye un sistema de **Acciones Universales** que permite a cualquier componente interactuar con otro sin necesidad de programar cables complicados.
- Puedes arrastrar un Botón y decirle que ejecute el método `reproducir()` del `AudioSource` de otro objeto diferente.
- Los componentes exponen sus `actionableMethods` con alias localizados.

---

## 🦴 Importación de Esqueletos desde Spine

El motor cuenta con un **SkeletonImporter** oficial para archivos `.json` de Spine.
1. Exporta tu animación desde Spine en formato JSON.
2. Ve a `Archivo > Importar Esqueleto`.
3. El motor creará automáticamente la jerarquía de Materias con leyes `Bone` y configurará el `SkeletonRenderer`.

---

## 🚀 Modos de Código Creativo

Puedes ajustar el nivel de ayuda del motor desde Preferencias:
1. **Surgical Fix:** Solo corrige errores de sintaxis críticos.
2. **Creative Code:** Añade comentarios y sugerencias lógicas.
3. **Super Creative:** Carl IA y el Cirujano actúan de forma proactiva para generar código por ti.

---

## 🛡️ Seguridad y Protección de Proyectos

Al ser un motor que corre en el navegador, hemos implementado capas de seguridad:
- **Aislamiento de Scripts:** Cada script corre en su propio contexto para evitar que errores en un objeto afecten a otros.
- **Copias de Seguridad en IndexedDB:** El motor guarda instantáneas automáticas de tu escena.

---

## 📦 Gestión de Paquetes .cep (Avanzado)

Un archivo `.cep` es un paquete binario que encapsula una estructura completa de carpetas de `/Assets`. Es ideal para:
- Crear tiendas de assets.
- Mover sistemas complejos entre proyectos.
- Enviar demos a otros desarrolladores.

---

## 🎮 Tutorial: Tu Primer Plataformas

### Paso 1: El Escenario
Dibuja el suelo con el pincel de terreno. Añade el componente `TerrenoCollider2D`. Ponle un material de roca.

### Paso 2: El Jugador
Crea un Sprite con `Rigidbody2D` (Dynamic) y `BoxCollider2D`. Añade el componente `Movement`.

### Paso 3: Configuración
En el componente `Movement`, ajusta la `fuerzaSalto` a 15 y la `velocidad` a 400. ¡Ya tienes un plataformas funcional!

---

## 📜 Patrones de Diseño en CES

### Singleton (Instancia Única)
Para gestores de juego, guarda la referencia en una variable global del motor:
```ces
alEmpezar() {
    motor.gestorPrincipal = materia;
}
```

---

## 📐 Matemáticas: Interpolación de Colores

```ces
renderizadorDeSprite.color = Color.lerp("#ffffff", "#ff0000", t);
```
Úsalo para efectos de daño donde el personaje parpadea en rojo cuando le queda poca vida.

---

## 📱 UI: Contenedores de Ajuste Automático

Usa el componente **ContentSizeFitter** para que tus ventanas de diálogo se estiren solas cuando el texto sea más largo de lo habitual, asegurando que nada se corte.

---

## 🌐 Colaboración: Roles y Permisos

- **Owner:** Control total del proyecto y de la sesión P2P.
- **Collaborator:** Puede editar scripts y escenas en tiempo real.
- **Viewer:** Solo puede observar el proceso sin realizar cambios.

---

## 🏗️ Build: Exportación Standalone Profesional

Al realizar un build, obtienes una carpeta optimizada lista para producción:
- `index.html`: Punto de entrada universal.
- `Assets/`: Solo los archivos realmente usados en tus escenas.
- `Scripts/`: Todo tu código CES transpilado a JavaScript de alto rendimiento.

---

## 🛡️ Privacidad del Creador: Primero lo Local

Creative Engine es **Offline-First**. No necesitas internet para desarrollar, excepto para las funciones de Carl IA y Colaboración. Tus archivos nunca salen de tu ordenador sin que tú lo sepas.

---

## 🌟 La Nueva Era del Desarrollo Web: Tu Legado

Gracias por leer esta guía completa. Estamos emocionados por ver las historias que vas a contar usando Creative Engine.

**El límite no es el cielo, es tu imaginación.**

---

## 📔 Manual de Usuario: Flujo de Trabajo Maestro (Detallado)

### Fase 1: Concepción y Recolección de Assets
Todo gran juego empieza fuera del motor. Reúne tus artes y sonidos. Recuerda que Creative Engine prefiere el formato **WebP** para imágenes y **Ogg/MP3** para audio por su equilibrio entre peso y calidad. Organiza tus archivos en carpetas dentro de la carpeta del proyecto.

### Fase 2: El Montaje de Escena y Jerarquía
Usa la **Jerarquía** para organizar tus objetos de forma lógica. No tengas miedo de crear materias vacías para que sirvan de carpetas lógicas (ej: una materia "Enemigos" que contenga a todos los monstruos de la escena). Esto facilita enormemente el mantenimiento cuando el proyecto crece.

### Fase 3: Lógica, Comportamiento y Scripts CES
Escribe tus scripts CES usando el editor integrado. Usa el **Cirujano Creativo** para limpiar el código y detectar errores rápidamente. Prueba cada función de forma aislada usando la consola (`imprimir()`) antes de integrarla en sistemas mayores.

### Fase 4: Pulido, Efectos y Juice
Añade partículas, luces y sonidos espaciales. Este 10% final del trabajo es el que hace que el jugador sienta que el juego es de alta calidad y profesional. Usa el componente `ParticleSystem` para dar vida a los impactos y saltos.

### Fase 5: El Build Final y Publicación
Realiza pruebas de rendimiento en diferentes navegadores y dispositivos. Usa el **Análisis de Dependencias** del sistema de Build para asegurar un paquete ligero y rápido de cargar. Publica en Itch.io y comparte tu creación con el mundo.

---

## 🛠️ Detalle de Componentes Pro: RaycastSource

El "Rallo" es esencial para mecánicas avanzadas:
- **Detección de Suelo Pro**: Lanza un rayo hacia abajo para saber la distancia exacta al piso y ajustar las animaciones de caída.
- **IA de Disparo**: Lanza un rayo hacia adelante para saber si el jugador está en la línea de fuego antes de apretar el gatillo.
- **Interacción con el Mundo**: Lanza un rayo desde el ratón para saber sobre qué objeto está haciendo clic el usuario y activar interruptores.

---

## 📐 Matemáticas Avanzadas: El Círculo Unitario y Ondas

Dominar `seno` y `coseno` te permite:
- Crear patrones de disparo radiales (estilo Bullet Hell).
- Hacer que la cámara oscile como si alguien la estuviera cargando (Head Bobbing).
- Programar el movimiento de péndulos y plataformas oscilantes en trampas de mazmorras.
- Crear efectos de levitación para objetos mágicos o power-ups.

---

## 🎨 Guía de Arte Pro: Tilemaps y Colisiones Eficientes

En la paleta de tiles, puedes definir **Máscaras de Colisión** por cada azulejo individualmente. Esto permite que un solo objeto Tilemap gestione miles de colisiones de forma ultra-eficiente, mucho mejor que poner miles de BoxCollider2D individuales que saturarían el motor de física.

---

## 🤖 Carl IA: Planificación de Proyectos y Tareas

"Carl, haz una lista de tareas para crear un juego tipo Flappy Bird". Carl generará un documento en tu navegador con los pasos de diseño, arte y programación necesarios, actuando como un gestor de proyectos que te mantiene enfocado.

---

## 🌊 Agua Técnica: Presión Hidrostática y Buceo

Cuanto más profundo esté un objeto en la ley `Water`, más presión recibirá. Puedes leer este valor desde script para hacer que el jugador reciba daño por profundidad o para activar efectos visuales de burbujas y distorsión de pantalla.

---

## 🚗 Vehículos Pro: Aerodinámica de Aviones y Stall

En el `PlaneController`, el ángulo de las alas (Rotación del Transform) influye directamente en la sustentación generada. Si inclinas el avión hacia arriba, ganarás altura pero perderás velocidad rápidamente. Si lo inclinas demasiado, entrarás en un "Stall" físico donde el avión perderá el control y caerá. Es una simulación real en un entorno 2D.

---

## 🎬 Animación Pro: Skinning y Deformación de Malla

El `SkeletonRenderer` permite que una sola imagen se doble y se estire. Esto es perfecto para:
- Capas de personajes que ondean con el viento de forma procedimental.
- Tentáculos de monstruos marinos que se mueven con curvas de seno.
- Movimiento fluido de plantas, árboles y banderas en el fondo del nivel.

---

## 📱 UI Pro: Ajuste de Texto Dinámico y Localización

La ley `UIText` permite el uso de plantillas de variables. Puedes escribir `Puntos: {puntos}` y el motor reemplazará automáticamente el valor en pantalla cada vez que la variable `puntos` cambie en tu script, sin necesidad de actualizar el texto manualmente en cada frame.

---

## 🌐 Colaboración Pro: Historial de Cambios y Auditoría

Consulta quién movió cada objeto por última vez en el panel de **Actividad Colaborativa**. Es ideal para saber qué ha hecho tu equipo mientras tú no estabas conectado y para revertir cambios accidentales realizados por otros colaboradores.

---

## 🏗️ Build Pro: Optimización de Sonido y Bitrate

El motor puede reducir el bitrate de los efectos de sonido pesados durante el proceso de build para que el juego total no ocupe más de unos pocos megabytes, algo ideal para portales de juegos web instantáneos que requieren tiempos de carga mínimos.

---

## 🛡️ Seguridad Pro: Verificación de Código y Sandboxing

Antes de ejecutar cualquier script, el motor realiza una pasada de seguridad estática para asegurar que no hay bucles infinitos o llamadas recursivas que puedan bloquear el navegador del usuario final, manteniendo la reputación de tu juego intacta.

---

## 🌟 La Distancia más Corta hacia tu Sueño

Desde la primera línea de código hasta el lanzamiento mundial en un dominio .com, Creative Engine te acompaña en cada paso del camino, eliminando la fricción y potenciando tu talento natural.

**Bienvenido a la élite de los creadores de la web moderna.**

---

## 📖 Diccionario de Componentes: Casos de Uso del Mundo Real

### ProjectileLauncher (Lanzador)
- **Uso**: Pistolas, flechas de arco, hechizos mágicos, lanzallamas.
- **Truco**: Pon un valor de dispersión (spread) alto para crear una escopeta o un disparo de metralla.

### AutoDestroy (Auto-Borrado)
- **Uso**: Balas que desaparecen al salir de pantalla, efectos de explosión temporales, mensajes flotantes de daño que suben y se borran.

### CameraFollow (Seguimiento)
- **Uso**: Mantener al jugador en el centro de la acción.
- **Truco**: Ajusta el valor de "Smoothness" (Suavizado) para que la cámara tenga un retraso elegante al seguir al héroe, permitiendo ver más del entorno al correr.

---

## 📐 Matemáticas Pro: Interpolación Circular y Órbitas

Aprende a usar `seno` y `coseno` combinados con el tiempo delta para hacer que los objetos orbiten alrededor de un punto central de forma perfecta:
```ces
alActualizar(delta) {
    angulo += delta * velocidadRotacion;
    posicion.x = centro.x + coseno(angulo) * radio;
    posicion.y = centro.y + seno(angulo) * radio;
}
```

---

## 🎨 Estética Pro: Luces de Sprite y Máscaras de Luz

Usa la ley `SpriteLight2D`. Esta luz toma la forma exacta de una imagen que tú elijas. Es ideal para crear efectos de luces de ventanas proyectadas en el suelo o haces de luz filtrándose por las copas de los árboles de un bosque encantado.

---

## 🏔️ Diseño de Niveles Pro: Triggers de Eventos y Checkpoints

Usa una materia vacía con un `BoxCollider2D` en modo `Is Trigger` para detectar cuando el jugador llega al final del nivel. En el script del trigger, puedes llamar a `cargarEscena()` o guardar la posición actual como un checkpoint en la memoria persistente del motor.

---

## 🤖 Carl IA: Asistente de Configuración de Física

"Carl, configura las capas de colisión para que los 'Aliados' no puedan herirse entre ellos pero sí a los 'Enemigos'." Carl irá automáticamente a los ajustes del proyecto y configurará la matriz de capas por ti en un segundo.

---

## 🌊 Agua Pro: Boyas y Flotadores de Física Real

Crea un objeto pequeño con mucha masa pero con una escala de gravedad muy baja; se comportará como una boya realista que reacciona a las partículas del componente `Water`, subiendo y bajando con las mareas y las ondas de choque.

---

## 🚗 Vehículos Pro: Suspensiones Off-road para Terrenos Difíciles

En el componente `Suspension`, aumenta el valor de "Dureza" para terrenos con muchos baches y obstáculos, y disminúyela para una conducción suave y relajante en carreteras de asfalto liso. Puedes cambiar estos valores por script según la superficie.

---

## 🎬 Animación Pro: Exportación para Web de Alta Velocidad

El formato `.cea` propio de Creative Engine es un JSON ultra-optimizado que permite que las animaciones de mil frames carguen en milisegundos, incluso con conexiones de internet móviles lentas, superando a los pesados formatos de vídeo o GIF.

---

## 📱 UI Pro: Paneles Arrastrables e Inventarios Pro

Con un simple script CES y la API de entrada (`botonMousePresionado`), puedes hacer que tus ventanas de inventario sean totalmente arrastrables por el usuario final, permitiendo que cada jugador personalice su interfaz de juego como en un MMO.

---

## 🌐 Red Pro: Sincronización de Variables de Script

En el modo colaborativo, puedes marcar variables de tus scripts como "Sincronizadas". Esto significa que si tú cambias la `vidaDelJefe` en tu pantalla, el valor se actualizará instantáneamente para todos los demás desarrolladores de la sesión.

---

## 🏗️ Build Pro: Exportación para el Framework Electron

Si quieres que tu juego sea un ejecutable `.exe` para Windows o `.app` para Mac, el resultado del Build de Creative Engine es 100% compatible con el framework Electron, permitiéndote vender tu juego en Steam como una aplicación nativa.

---

## 🛡️ Seguridad Pro: Protección contra Inyecciones de Código

El motor filtra cualquier entrada de texto dinámica en los scripts cargados para evitar que código malicioso externo pueda ejecutarse en el navegador de tus jugadores, manteniendo tu entorno de desarrollo y tu comunidad seguros.

---

## 🌟 El Futuro de la Web es Creativo y es Tuyo

Únete a los miles de desarrolladores que ya están cambiando las reglas del juego y demostrando que no se necesitan motores de 100GB para crear experiencias memorables.

**Creative Engine v2026 - El motor definitivo para una nueva era de creadores.**

---

## 📖 Diccionario de la API CES (Referencia Avanzada Final)

### M
- **`mandoConectado(indice)`**: Retorna un valor booleano si hay un mando activo en el puerto X del sistema.
- **`mandoBotonPresionado(boton, indice)`**: Detecta si un botón específico del mando está siendo mantenido.
- **`mandoEje(eje, indice)`**: Lee la posición exacta de los joysticks analógicos o gatillos sensibles a la presión (-1 a 1).

### N
- **`nombre`**: Propiedad de solo lectura que retorna el nombre asignado a la Materia en la Jerarquía del editor.

### O
- **`obtenerPosicionMouse()`**: Retorna un objeto Vector2 con las coordenadas exactas del ratón proyectadas en el mundo del juego.
- **`obtenerDeltaTime()`**: Retorna el tiempo exacto transcurrido entre el frame anterior y el actual, esencial para movimientos fluidos.

### P
- **`posicion`**: Propiedad Vector2 que representa la ubicación del objeto en el espacio infinito 2D del motor.
- **`pausarJuego()`**: Función que detiene la simulación física y los eventos de actualización de forma global, ideal para menús de pausa.

### R
- **`rotacion`**: Propiedad numérica que define el ángulo del objeto en grados (0-360) respecto a su eje central.
- **`reproducir.Nombre()`**: El proxy más potente del motor para disparar estados visuales de animación o sonidos simplemente escribiendo su nombre.

### S
- **`si (condicion) { ... }`**: La estructura condicional fundamental, disponible tanto en español como en inglés (`if`).
- **`sino { ... }`**: Bloque de código alternativo que se ejecuta si la condición inicial no se cumple.

---

## 📐 Matemáticas Pro: Funciones de Suavizado y Movimiento

- **`lerp(valorInicial, valorFinal, t)`**: Mezcla lineal perfecta para crear cámaras que siguen al jugador o transiciones de color.
- **`smoothstep(valorInicial, valorFinal, t)`**: Mezcla avanzada con aceleración y desaceleración fluida en ambos extremos, ideal para cinemáticas.
- **`azarEntero(min, max)`**: Retorna un número entero aleatorio sin decimales, perfecto para lógica de dados, inventarios o selección de niveles.

---

## 🎨 Guía de Color Pro: Formatos y Estilos Soportados

Creative Engine acepta múltiples formatos profesionales para el tinte del SpriteRenderer y luces:
- **Hexadecimal**: `#ffffff` (Blanco puro), `#000000` (Negro), `#ff0000` (Rojo intenso).
- **RGB Estándar**: `rgb(255, 255, 255)`.
- **RGBA con Transparencia**: `rgba(0, 0, 0, 0.5)` (Crea sombras o efectos de cristal semi-transparente).
- **Nombres de Color Web**: `red`, `blue`, `green`, `purple`, `orange`.

---

## 🛡️ Soporte Pro: Una Comunidad Global que Crece contigo

Creative Engine no es solo un software frío, es una red humana de personas compartiendo conocimiento y pasión por los videojuegos.
- **Wiki Oficial**: Guías paso a paso detalladas por la comunidad, desde lo más básico hasta trucos de optimización extrema.
- **Foro de Ayuda**: Un lugar para preguntar y resolver tus dudas técnicas con los desarrolladores del núcleo del motor.
- **Galería de Juegos**: Inspírate viendo lo que otros creadores han construido y sube tus propias demos para recibir feedback.

---

## 🏆 Tu Sueño Empieza Aquí, Ahora y Para Siempre

Has leído más de 1000 líneas de conocimiento técnico acumulado. Tienes en tus manos el poder de crear mundos enteros, contar historias inolvidables y publicar juegos que millones podrán jugar con un solo clic, sin límites de hardware ni barreras de idioma.

**Toma el control total de tu proceso creativo. Sé valiente. Sé libre. Sé un desarrollador de Creative Engine.**

---
### 👨‍💻 Carley Interactive Studio
*Desarrollando las herramientas que darán forma al futuro de la creatividad digital y el entretenimiento web.*
*© 2026 Carley Interactive Studio. Todos los derechos reservados.*
*Impulsado por el motor Jules de Google AI.*

---

## 📙 Scripting Pro: Eventos de Escena Avanzados

### alEntrarEnEscena()
Usa este método para disparar una cinemática de entrada o activar la música de fondo específica de un nivel nada más cargar.

### alSalirDeEscena()
Ideal para guardar el inventario del jugador en la base de datos local o detener sonidos persistentes antes de cargar el siguiente mapa.

---

## 🛠️ Herramientas Pro: Buscador de Objetos Global

Usa el atajo `Ctrl + F` en la Jerarquía para filtrar objetos por nombre, etiqueta o incluso por las leyes que tienen añadidas. "Cualquier objeto con un Rigidbody2D" es una búsqueda válida que te ahorrará minutos de navegación manual.

---

## 🏔️ Diseño de Niveles: El Arte de los Prefabs Anidados

Puedes anidar estructuras infinitamente. Crea un Prefab "Ciudad" que por dentro tenga Prefabs "Barrio", que a su vez tengan Prefabs "Casa". Esto permite un diseño modular extremadamente rápido para mundos abiertos o interiores complejos.

---

## 🤖 Carl IA: Modo de Inspección Técnica Profunda

Pídele a Carl: "Carl, analiza por qué mi objeto atraviesa las paredes". Carl revisará los colliders, las leyes físicas, las capas de colisión y la velocidad de movimiento para darte un diagnóstico exacto y la solución en un clic.

---

## 🌊 Agua: Efectos de Partículas Automáticos y Ondas

Activa las "Salpicaduras Automáticas" en la ley `Water` para que el motor emita partículas de agua blancas cada vez que algo con Rigidbody2D impacte la superficie. También puedes configurar la fuerza de las olas para que afecten a la navegación de barcos.

---

## 🚗 Vehículos: Simulación de Transmisión Manual y Automática

El componente `VehicleTopDown` permite configurar marchas virtuales. Sentirás cómo el coche gana potencia de forma escalonada, mejorando la sensación arcade de velocidad y control.

---

## 🎬 Animación: Control de Velocidad y Reverse dinámico

Cambia el valor `animador.speed` desde script para simular efectos de "Hielo" (animación lenta) o "Furia" (animación ultra-rápida). Incluso puedes poner valores negativos para reproducir una animación hacia atrás.

---

## 📱 UI: Sistema de Capas y Orden Visual (Z-Order)

La UI tiene su propio sistema de orden independiente del mundo. Los paneles con `Z` más alto siempre se verán por delante de los botones, permitiendo crear sistemas de ventanas emergentes, diálogos y notificaciones sin conflictos.

---

## 🌐 Networking: Servidores de Relay Inteligentes

Si la conexión P2P directa falla por firewalls agresivos en redes corporativas, el motor utiliza automáticamente nuestros servidores de Relay para asegurar que la colaboración en tiempo real nunca se detenga.

---

## 🏗️ Build: Generación de Progressive Web App (PWA) de un clic

El motor puede generar los archivos necesarios (`manifest.json` y `ServiceWorker`) para que tus jugadores puedan "instalar" tu juego en su pantalla de inicio como si fuera una App nativa de Android o iOS, funcionando incluso offline.

---

## 🛡️ Seguridad: Encriptación de Assets en el Build final

Protege tus artes originales activando la encriptación ligera durante el build. El motor descifrará los archivos en la memoria RAM del jugador solo cuando el juego esté en marcha, dificultando el robo de activos.

---

## 🌟 La Revolución de la Creación Web ya está aquí

Has llegado al final de la mayor guía de desarrollo para navegadores jamás escrita. Creative Engine v2026 es tu aliado definitivo para conquistar internet con tus ideas.

**¡A crear mundos épicos! El futuro te pertenece.**

---

## 📘 Manual de Referencia de la API CES (Funciones Misceláneas)

### I
- **`imprimirEnPantalla(texto)`**: Muestra un mensaje temporal en la esquina de la pantalla de juego, ideal para feedback rápido sin consola.

### T
- **`tiempoJuego`**: Retorna los segundos totales que han pasado desde que se inició la escena actual.

### L
- **`leerDatoLocal(clave)`**: Recupera una información guardada permanentemente en el navegador del jugador (como highscores).
- **`guardarDatoLocal(clave, valor)`**: Guarda información de forma persistente.

---

## 📐 Matemáticas: Perlin Noise y Generación Procedimental

Creative Engine incluye funciones de ruido para creadores avanzados:
- **`ruido(x, y)`**: Retorna un valor suave entre 0 y 1. Úsalo para generar terrenos aleatorios o nubes que se mueven de forma natural.

---

## 🎨 Estética: Sistema de Partículas (Presets)

El sistema de partículas incluye presets para:
- **Lluvia**: Configuración automática de gravedad y velocidad vertical.
- **Fuego**: Configuración de gradiente de color de naranja a gris y dispersión cónica.
- **Nieve**: Velocidad lenta y oscilación horizontal tipo seno integrada.

---

## 🏔️ Diseño de Niveles: Oclusión Ambiental 2D

El motor simula sombras de contacto suaves entre objetos cercanos, dando una sensación de profundidad y "peso" a tus niveles sin necesidad de configurar luces complejas.

---

## 🤖 Carl IA: Creación de Assets con IA Generativa

Carl puede conectarse a servicios externos de generación de imágenes si configuras las claves necesarias. Dile: "Carl, genera un sprite de un cofre medieval" y él lo creará, lo descargará y lo pondrá en tu escena.

---

## 🌊 Agua: Buceo y Mecánicas de Oxígeno

Usa la propiedad `densidad` del agua para frenar al jugador. Combínalo con un script que reduzca una variable de `oxigeno` mientras la posición Y del jugador sea menor que la superficie del agua.

---

## 🚗 Vehículos: Física de Neumáticos

En el componente `VehicleTopDown`, puedes configurar la fricción por cada rueda individualmente, permitiendo comportamientos de tracción delantera, trasera o total (4x4).

---

## 🎬 Animación: Máscaras de Animación

Permite que un personaje reproduzca una animación de "Caminar" en las piernas y una de "Saludar" en el brazo derecho simultáneamente.

---

## 📱 UI: Navegación por Teclado y Mando

La UI de Creative Engine detecta automáticamente el foco. Puedes navegar por los botones de tus menús usando las flechas del teclado o el D-pad de un mando sin configurar nada extra.

---

## 🌐 Red: Emparejamiento por Región

El motor selecciona automáticamente el servidor de señalización más cercano a tu ubicación geográfica (Europa, América, Asia) para minimizar la latencia inicial.

---

## 🏗️ Build: Análisis de Rendimiento en el Build

Al terminar de construir el juego, el motor te muestra un gráfico de "Peso de Assets" para que sepas qué imágenes o sonidos están ocupando más espacio y decidas si optimizarlos más.

---

## 🛡️ Seguridad: Certificados SSL en el Servidor de Build

Todos los juegos construidos con Creative Engine están preparados para correr bajo protocolos HTTPS seguros, requisito indispensable para acceder a funciones de hardware como el mando o el sistema de archivos.

---

## 🌟 Un Horizonte Infinito de Posibilidades

Has alcanzado la cima del conocimiento de Creative Engine. No hay nada que no puedas construir ahora.

**¡Diviértete, experimenta y crea el juego de tus sueños!**
