const fs = require('fs');
const path = require('path');

// --- Mapeo de la sintaxis .ces a JavaScript ---
const usingMap = {
    'creative.engine': "import * as Engine from './modules/engine.js';",
    'creative.engine.core': "import * as Core from './modules/core.js';",
    'creative.engine.ui': "import * as UI from './modules/ui.js';",
    'creative.engine.animator': "import * as Animator from './modules/animator.js';",
    'creative.engine.physics': "import * as Physics from './modules/physics.js';",
    'creative.engine.materials': "import * as Materials from './modules/materials.js';",
    'creative.engine.audio': "import * as Audio from './modules/audio.js';",
};

// --- Función Principal de Transpilación ---
function transpile(code) {
    const lines = code.split(/\r?\n/);
    const errors = [];
    let jsCode = '';
    const privateVars = []; // To store private variables to be declared in start()
    const imports = new Set();
    let inBlock = false; // Usamos un 'inBlock' más genérico en lugar de 'inFunctionBody'

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) {
            return;
        }

        // --- Detección de Bloques ---
        if (trimmedLine.includes('{')) {
            inBlock = true;
        }

        // --- Lógica de Transpilación ---

        // 1. Declaraciones de nivel superior (solo si no estamos dentro de un bloque)
        if (!inBlock) {
            const usingMatch = trimmedLine.match(/^using\s+([^;]+);/);
            if (usingMatch) {
                const namespace = usingMatch[1].trim();
                if (usingMap[namespace]) {
                    imports.add(usingMap[namespace]);
                } else {
                    errors.push(`Línea ${lineNumber}: El namespace '${namespace}' es desconocido.`);
                }
                return;
            }

            // Public variables (materia/gameObject, sprite, SpriteAnimacion)
            const publicVarMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject|sprite|SpriteAnimacion)\s+([^;]+);/);
            if (publicVarMatch) {
                jsCode += `let ${publicVarMatch[1]};\n`;
                return;
            }

            // Private variables
            const privateVarMatch = trimmedLine.match(/^private\s+\w+\s+([^;]+);/);
            if(privateVarMatch) {
                // We store them to inject them into the start function later
                privateVars.push(privateVarMatch[1]);
                return;
            }
        }

        // 2. Declaraciones de funciones (que inician un bloque)
        const starMatch = trimmedLine.match(/^public\s+star\s*\(\)\s*{/);
        if (starMatch) {
            let privateDeclarations = '';
            if (privateVars.length > 0) {
                privateDeclarations = `    let ${privateVars.join(', ')};\n`;
            }
            jsCode += `Engine.start = function() {\n${privateDeclarations}`;
            return;
        }

        const updateMatch = trimmedLine.match(/^public\s+update\s*\(([^)]*)\)\s*{/);
        if (updateMatch) {
            jsCode += `Engine.update = function(${updateMatch[1]}) {\n`;
            return;
        }

        // Si parece una declaración de función pero no es válida, es un error.
        if (trimmedLine.match(/public\s+.*\(\)\s*{/)) {
            errors.push(`Línea ${lineNumber}: Declaración de función no válida: "${trimmedLine}"`);
            return; // No procesar más esta línea
        }

        // 3. Comandos dentro de un bloque
        if (inBlock) {
            // Manejar la llave de cierre
            if (trimmedLine.includes('}')) {
                inBlock = false;
                // Asumimos que la llave cierra una función de motor
                if (!trimmedLine.startsWith('}')) { // Si hay código antes de la '}'
                    let content = trimmedLine.substring(0, trimmedLine.indexOf('}'));
                    // Transpilar el contenido de la línea antes de la llave
                    content = content.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
                    content = content.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
                    content = content.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');
                    jsCode += `    ${content}\n`;
                }
                jsCode += '};\n';
                return;
            }

            // Reemplazar comandos específicos del motor
            let originalLine = trimmedLine;
            let processedLine = trimmedLine.replace(/crear\s+sprite\s+([^,]+)\s+con\s+"([^"]+)";/g, '$1 = SceneManager.createSprite("$1", "$2");');
            processedLine = processedLine.replace(/reproducir\s+animacion\s+"([^"]+)"\s+en\s+([^;]+);/g, '$2.getComponent(Animator).play("$1");');
            processedLine = processedLine.replace(/cambiar\s+estado\s+en\s+([^,]+)\s+a\s+"([^"]+)";/g, '$1.getComponent(Animator).play("$2");');
            processedLine = processedLine.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
            processedLine = processedLine.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
            processedLine = processedLine.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');

            // Si la línea no cambió y no parece JS válido, es un error de comando
            if (processedLine === originalLine && !originalLine.match(/(if|for|while|{|})|^\w+\.\w+\(.*\);?$/)) {
                 errors.push(`Línea ${lineNumber}: Comando desconocido o sintaxis incorrecta dentro de un bloque: "${originalLine}"`);
            } else {
                jsCode += `    ${processedLine}\n`;
            }
            return;
        }

        // 4. Si después de todas las comprobaciones no hay coincidencia, es un error
        errors.push(`Línea ${lineNumber}: Sintaxis inesperada: "${trimmedLine}"`);
    });

    if (errors.length > 0) {
        return { errors };
    }

    // Add the SceneManager import, as it's crucial for creating objects.
    const finalImports = `import * as SceneManager from './modules/SceneManager.js';\n` + Array.from(imports).join('\n');
    return { jsCode: `${finalImports}\n\n${jsCode}` };
}


// --- Lógica para leer/escribir archivos desde la línea de comandos ---

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Uso: node transpiler.js <archivo_entrada.ces> <archivo_salida.js>");
    process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

if (path.extname(inputFile) !== '.ces') {
    console.error("El archivo de entrada debe tener la extensión .ces");
    process.exit(1);
}

fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error(`❌ Error al leer el archivo de entrada: ${err.message}`);
        process.exit(1);
    }

    const result = transpile(data);

    if (result.errors && result.errors.length > 0) {
        console.error(`❌ Traducción fallida. Se encontraron ${result.errors.length} errores en '${inputFile}':\n`);
        result.errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPor favor, corrige los errores y vuelve a intentarlo.');
        process.exit(1); // Salir con código de error
    } else {
        fs.writeFile(outputFile, result.jsCode, 'utf8', (err) => {
            if (err) {
                console.error(`❌ Error al escribir el archivo de salida: ${err.message}`);
                process.exit(1);
            }
            console.log(`✅ Traducción completada con éxito: '${inputFile}' -> '${outputFile}'`);
        });
    }
});
