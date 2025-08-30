import fs from 'fs';
import path from 'path';

// --- Type Definitions ---
type TranspileResult = {
    jsCode?: string;
    errors?: string[];
};

// --- Mapeo de la sintaxis .ces a JavaScript ---
const usingMap: { [key:string]: string } = {
    'creative.engine': "import * as Engine from './modules/engine.js';",
    'creative.engine.core': "import * as Core from './modules/core.js';",
    'creative.engine.ui': "import * as UI from './modules/ui.js';",
    'creative.engine.animator': "import * as Animator from './modules/animator.js';",
    'creative.engine.physics': "import * as Physics from './modules/physics.js';",
    'creative.engine.materials': "import * as Materials from './modules/materials.js';",
    'creative.engine.audio': "import * as Audio from './modules/audio.js';",
};

// --- Función Principal de Transpilación ---
function transpile(code: string): TranspileResult {
    const lines: string[] = code.split(/\r?\n/);
    const errors: string[] = [];
    let jsCode: string = '';
    const privateVars: string[] = [];
    const imports = new Set<string>();
    let blockDepth = 0;

    lines.forEach((line, index) => {
        const lineNumber: number = index + 1;
        let trimmedLine: string = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) {
            return;
        }

        // Naive block depth counting (doesn't handle braces in strings/comments)
        const openBraces = (trimmedLine.match(/{/g) || []).length;
        const closeBraces = (trimmedLine.match(/}/g) || []).length;

        // Process line content BEFORE changing depth for the current line
        const isTopLevel = blockDepth === 0;

        if (isTopLevel) {
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

            const publicVarMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject|sprite|SpriteAnimacion)\s+([^;]+);/);
            if (publicVarMatch) {
                jsCode += `let ${publicVarMatch[1]};\n`;
                return;
            }

            const privateVarMatch = trimmedLine.match(/^private\s+\w+\s+([^;]+);/);
            if (privateVarMatch) {
                privateVars.push(privateVarMatch[1]);
                return;
            }
        }

        const starMatch = trimmedLine.match(/^public\s+star\s*\(\)\s*{/);
        if (starMatch) {
            let privateDeclarations = '';
            if (privateVars.length > 0) {
                privateDeclarations = `    let ${privateVars.join(', ')};\n`;
            }
            jsCode += `Engine.start = function() {\n${privateDeclarations}`;
            blockDepth += openBraces - closeBraces;
            return;
        }

        const updateMatch = trimmedLine.match(/^public\s+update\s*\(([^)]*)\)\s*{/);
        if (updateMatch) {
            jsCode += `Engine.update = function(${updateMatch[1]}) {\n`;
            blockDepth += openBraces - closeBraces;
            return;
        }

        // Process lines inside a block
        if (blockDepth > 0) {
            blockDepth += openBraces - closeBraces;

            // If this line closes a function block, add the semicolon
            if (blockDepth === 0 && closeBraces > 0 && (trimmedLine.trim() === '}' || trimmedLine.trim() === '};')) {
                 jsCode += '};\n';
                 return;
            }

            let processedLine = trimmedLine;
            processedLine = processedLine.replace(/crear\s+sprite\s+([^,]+)\s+con\s+"([^"]+)";/g, '$1 = SceneManager.createSprite("$1", "$2");');
            processedLine = processedLine.replace(/reproducir\s+animacion\s+"([^"]+)"\s+en\s+([^;]+);/g, '$2.getComponent(Animator).play("$1");');
            processedLine = processedLine.replace(/cambiar\s+estado\s+en\s+([^,]+)\s+a\s+"([^"]+)";/g, '$1.getComponent(Animator).play("$2");');
            processedLine = processedLine.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
            processedLine = processedLine.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
            processedLine = processedLine.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');

            jsCode += `    ${processedLine}\n`;
            return;
        }

        // If we get here, the syntax is unexpected
        errors.push(`Línea ${lineNumber}: Sintaxis inesperada: "${trimmedLine}"`);
    });

    if (errors.length > 0) {
        return { errors };
    }

    const finalImports = `import * as SceneManager from './modules/SceneManager.ts';\n` + Array.from(imports).join('\n');
    return { jsCode: `${finalImports}\n\n${jsCode}` };
}

// --- Lógica para leer/escribir archivos desde la línea de comandos ---
const args: string[] = process.argv.slice(2);
if (args.length < 2) {
    console.error("Uso: node transpiler.js <archivo_entrada.ces> <archivo_salida.js>");
    process.exit(1);
}

const inputFile: string = args[0];
const outputFile: string = args[1];

if (path.extname(inputFile) !== '.ces') {
    console.error("El archivo de entrada debe tener la extensión .ces");
    process.exit(1);
}

fs.readFile(inputFile, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
    if (err) {
        console.error(`❌ Error al leer el archivo de entrada: ${err.message}`);
        process.exit(1);
    }

    const result: TranspileResult = transpile(data);

    if (result.errors && result.errors.length > 0) {
        console.error(`❌ Traducción fallida. Se encontraron ${result.errors.length} errores en '${inputFile}':\n`);
        result.errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPor favor, corrige los errores y vuelve a intentarlo.');
        process.exit(1);
    } else if (result.jsCode) {
        fs.writeFile(outputFile, result.jsCode, 'utf8', (err: NodeJS.ErrnoException | null) => {
            if (err) {
                console.error(`❌ Error al escribir el archivo de salida: ${err.message}`);
                process.exit(1);
            }
            console.log(`✅ Traducción completada con éxito: '${inputFile}' -> '${outputFile}'`);
        });
    }
});
