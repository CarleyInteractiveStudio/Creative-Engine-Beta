const fs = require('fs');
const path = require('path');

const projectName = process.argv[2];

if (!projectName) {
    console.error("Por favor, proporciona un nombre para tu proyecto.");
    console.log("Uso: node create-project.js <nombre-del-proyecto>");
    process.exit(1);
}

const projectPath = path.join(process.cwd(), projectName);
const sourcePath = __dirname; // Directorio de ces-transpiler

if (fs.existsSync(projectPath)) {
    console.error(`¡Error! El directorio '${projectName}' ya existe.`);
    process.exit(1);
}

console.log(`Creando proyecto '${projectName}'...`);

// 1. Crear directorios del proyecto
fs.mkdirSync(projectPath, { recursive: true });
fs.mkdirSync(path.join(projectPath, 'assets'), { recursive: true });
fs.mkdirSync(path.join(projectPath, 'modules'), { recursive: true });
fs.mkdirSync(path.join(projectPath, 'assets/tutorial'), { recursive: true });

console.log("Directorios creados.");

// 2. Crear el archivo README del tutorial
const tutorialContent = `
# ¡Bienvenido a Creative Engine! - Guía de Inicio Rápido

¡Felicidades por crear tu nuevo proyecto! Estás a un paso de dar vida a tus ideas. Esta guía te ayudará a comenzar tu viaje como creador de videojuegos. Recuerda: cada gran universo comenzó con una sola línea de código, ¡y tú ya diste el primer paso!

---

## 1. Tus Creaciones son 100% Tuyas

**Licencia y Propiedad:** Queremos que te sientas seguro y libre para crear. Por eso, nuestra licencia es clara: **todo videojuego, arte o contenido que crees con Creative Engine es 100% de tu propiedad.**

No reclamamos derechos sobre tus juegos, ni participación en tus ganancias. Tu creatividad y tu trabajo te pertenecen por completo. ¡Así que sueña en grande!

---

## 2. Únete a Nuestra Comunidad de Creadores

¡No estás solo en esta aventura! Creative Engine es un proyecto hecho con pasión, y nuestra comunidad es el corazón que lo hace latir. Conectarte con otros desarrolladores es la mejor forma de aprender, resolver dudas y encontrar inspiración.

**¡Únete a nuestros canales oficiales y ayúdanos a construir algo increíble!**

*   **[👥 Grupo de Facebook](https://www.facebook.com/share/g/19VVcyGHHq/)**: Este es el lugar perfecto para empezar. Aquí encontrarás **tutoriales**, podrás **iniciar debates** sobre desarrollo, **mostrar tus avances** y, lo más importante, **pedir ayuda**. Siempre intentaremos verificar las publicaciones y responder tus dudas para que nunca te sientas atascado.
*   **[📢 Canal de WhatsApp](https://whatsapp.com/channel/0029Vao9B2OJP21CsSXDHL20)**: Únete para recibir las noticias más recientes, actualizaciones del motor y anuncios importantes directamente en tu móvil.
*   **[🎬 Canal de Facebook](https://www.facebook.com/share/19ccrRy1kZ/)**: Síguenos para ver contenido inspirador, proyectos destacados de la comunidad y mucho más.

Tu participación es lo que hace a esta comunidad especial. **Comparte el enlace del motor con tus amigos y en redes sociales:** [https://carleyinteractivestudio.github.io/Creative-Engine-Beta/](https://carleyinteractivestudio.github.io/Creative-Engine-Beta/)

---

## 3. Tutorial: Programando tu Primer Juego en \`.ces\`

Nuestro lenguaje de scripting, \`.ces\`, está diseñado para ser sencillo y potente. Aquí tienes un tutorial detallado para que empieces a programar ya mismo.

### Paso 1: Entendiendo la Estructura Básica

Todo script \`.ces\` tiene dos funciones principales: \`star()\` y \`update()\`.

*   \`public star()\`: Se ejecuta **una sola vez** cuando el juego comienza. Es el lugar perfecto para configurar tu escena, cargar modelos, posicionar la cámara, etc.
*   \`public update(deltaTime)\`: Se ejecuta en **cada fotograma (frame)** del juego. Aquí va toda la lógica que se repite, como mover personajes, comprobar colisiones o leer la entrada del jugador. \`deltaTime\` es el tiempo que ha pasado desde el último fotograma, ¡úsalo para que el movimiento sea fluido sin importar la velocidad del ordenador!

### Paso 2: Importando Módulos del Motor

Para usar las funciones del motor (como la física, la interfaz de usuario, etc.), primero debes "importarlas" al principio de tu archivo. Esto se hace con la palabra clave \`using\`.

\`\`\`ces
// Importa los módulos que necesitarás
using creative.engine;        // Funciones principales del motor
using creative.engine.core;     // Funciones del núcleo
using creative.engine.ui;       // Para crear textos, botones, etc.
using creative.engine.physics;  // Para usar la gravedad y otras fuerzas
\`\`\`

### Paso 3: Declarando Variables (GameObjects)

Un \`gameObject\` (o \`materia\` en nuestro lenguaje) es cualquier objeto en tu juego: el jugador, un enemigo, una moneda, una pared, etc. Para poder usar uno en tu script, primero debes declararlo.

\`\`\`ces
// Declara una variable para guardar tu jugador
public materia/gameObject jugador;
\`\`\`

### Paso 4: Dando Vida a tu Juego en \`star()\`

Ahora, usemos la función \`star()\` para configurar la escena.

\`\`\`ces
public star() {
    // Carga una escena (si la tienes definida)
    Scene.load("Nivel1");

    // Coloca la cámara para que se vea bien la escena
    Camera.setPosition(0, 5, -10);

    // Muestra un texto de bienvenida en la pantalla
    UI.text("¡Bienvenido a mi juego!", 20, 20);

    // Crea una instancia de tu jugador y carga su modelo 3D
    // El modelo "player.glb" debe estar en tu carpeta 'assets'
    materia crear jugador, "assets/player.glb";

    // ¡Activemos la gravedad!
    ley gravedad activar;
}
\`\`\`

**Comandos clave usados:**
*   \`Camera.setPosition(x, y, z)\`: Mueve la cámara a una coordenada en el espacio 3D.
*   \`UI.text("mensaje", x, y)\`: Dibuja un texto en la pantalla en las coordenadas X e Y.
*   \`materia crear <variable>, "<ruta_al_modelo>"\`: Asigna un modelo 3D a tu variable de \`gameObject\`.
*   \`ley gravedad activar\`: Activa la simulación de gravedad para todos los objetos.

### Paso 5: Añadiendo Interactividad en \`update()\`

Finalmente, hagamos que el jugador se mueva. Usaremos la función \`update()\` para comprobar si el jugador presiona una tecla.

\`\`\`ces
public update(deltaTime) {
    // Comprueba si la tecla "Flecha Arriba" está presionada
    if (Input.keyDown("ArrowUp")) {
        // Mueve al jugador hacia adelante (en el eje Z)
        jugador.z += 5 * deltaTime;
    }

    if (Input.keyDown("ArrowDown")) {
        // Mueve al jugador hacia atrás
        jugador.z -= 5 * deltaTime;
    }
}
\`\`\`

**¡Eso es todo por ahora!**

Con estos conceptos, ya puedes empezar a experimentar. Intenta añadir más movimientos, cargar diferentes modelos o mostrar otros mensajes en la pantalla. ¡El límite es tu imaginación!
`;
fs.writeFileSync(path.join(projectPath, 'assets/tutorial/README.md'), tutorialContent.trim());
console.log("- Archivo 'assets/tutorial/README.md' creado.");


// 3. Copiar archivos y plantillas
const filesToCopy = [
    // Plantillas
    'template/MANUAL.md',
    'template/escena_de_prueba.ces',
    // Archivos del lanzador y configuración
    'launcher.html',
    'launcher.js',
    'project.json',
    // Módulos del motor
    'modules/engine.js',
    'modules/core.js',
    'modules/ui.js',
    'modules/animator.js',
    'modules/physics.js'
];

filesToCopy.forEach(file => {
    const sourceFile = path.join(sourcePath, file);
    // Asegurarse de que el destino mantiene la estructura de carpetas
    const destFile = path.join(projectPath, file.replace('template/', ''));
    fs.copyFileSync(sourceFile, destFile);
    console.log(`- ${file} copiado.`);
});


// 4. Crear un archivo .ces básico para empezar
const cesTemplate = `// ¡Bienvenido a tu nuevo proyecto en Creative Engine!
// Empieza a escribir tu código aquí. Consulta MANUAL.md para la guía.

using creative.engine;
using creative.engine.core;
using creative.engine.ui;

public materia/gameObject jugador;

public star() {
    // Configura tu escena inicial
    Camera.setPosition(0, 0, 10);
    UI.text("Mi Juego Comienza", 10, 10);

    // materia crear jugador, "assets/player.glb";
}

public update(deltaTime) {
    // Lógica que se ejecuta en cada frame
    // if (Input.keyDown("ArrowUp")) {
    //     jugador.y += 10 * deltaTime;
    // }
}
`;
fs.writeFileSync(path.join(projectPath, 'main.ces'), cesTemplate);
console.log("- Archivo 'main.ces' creado.");

console.log(`\n✅ ¡Proyecto '${projectName}' creado con éxito!`);
console.log("   Ahora tienes un entorno de juego autocontenido.");
console.log("\n   Pasos a seguir:");
console.log(`   1. Entra en el directorio: cd ${projectName}`);
console.log("   2. Escribe tu código en 'main.ces' o 'escena_de_prueba.ces'.");
console.log("   3. Traduce tu script: node ../transpiler.js main.ces game.js");
console.log("   4. ¡Prueba tu juego abriendo 'launcher.html' en un navegador!");
