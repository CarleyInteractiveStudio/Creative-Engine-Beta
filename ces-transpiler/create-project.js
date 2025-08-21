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
fs.mkdirSync(path.join(projectPath, 'Assets'), { recursive: true });
fs.mkdirSync(path.join(projectPath, 'modules'), { recursive: true });
fs.mkdirSync(path.join(projectPath, 'Assets/Tutorial'), { recursive: true });

console.log("Directorios creados.");

// 2. Copiar los archivos de documentación
try {
    // Copiar Tutorial
    const tutorialContent = fs.readFileSync(path.join(sourcePath, 'template/TUTORIAL.md'), 'utf8');
    fs.writeFileSync(path.join(projectPath, 'Assets/Tutorial/TUTORIAL.md'), tutorialContent);
    console.log("- Archivo 'Assets/Tutorial/TUTORIAL.md' creado.");

    // Copiar Referencia de Scripting
    const scriptingRefContent = fs.readFileSync(path.join(sourcePath, 'template/Creative Engine Scripting.md'), 'utf8');
    fs.writeFileSync(path.join(projectPath, 'Assets/Tutorial/Creative Engine Scripting.md'), scriptingRefContent);
    console.log("- Archivo 'Assets/Tutorial/Creative Engine Scripting.md' creado.");
} catch (error) {
    console.warn("Advertencia: No se pudieron crear los archivos de documentación. Puede que las plantillas no existan.");
    console.warn(error.message);
}


// 3. Copiar archivos y plantillas
const filesToCopy = [
    // Plantillas
    'template/MANUAL.md',
    'template/escena_de_prueba.ces',
    'template/default.ceScene',
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
    let destFile;

    // Los archivos de escena y scripts de ejemplo van en 'Assets'
    if (file.endsWith('.ces') || file.endsWith('.ceScene')) {
        destFile = path.join(projectPath, 'Assets', path.basename(file));
    } else {
        // Otros archivos mantienen la estructura anterior
        destFile = path.join(projectPath, file.replace('template/', ''));
    }

    fs.copyFileSync(sourceFile, destFile);
    console.log(`- Archivo '${file}' copiado a '${path.relative(process.cwd(), destFile)}'.`);
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
