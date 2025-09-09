// Contains the logic for transpiling Creative Engine Script (.ces) to JavaScript.

const usingMap = {
    'creative.engine': "import * as Engine from './modules/engine.js';",
    'creative.engine.core': "import * as Core from './modules/core.js';",
    'creative.engine.ui': "import * as UI from './modules/ui.js';",
    'creative.engine.animator': "import * as Animator from './modules/animator.js';",
    'creative.engine.physics': "import * as Physics from './modules/physics.js';",
};

export function transpile(code) {
    const lines = code.split(/\r?\n/);
    const errors = [];
    let jsCode = '';
    const imports = new Set();
    let inBlock = false;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) return;

        if (trimmedLine.includes('{')) inBlock = true;

        if (!inBlock) {
            const usingMatch = trimmedLine.match(/^using\s+([^;]+);/);
            if (usingMatch) {
                const namespace = usingMatch[1].trim();
                if (usingMap[namespace]) imports.add(usingMap[namespace]);
                else errors.push(`Línea ${lineNumber}: Namespace '${namespace}' desconocido.`);
                return;
            }
            const varMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject)\s+([^;]+);/);
            if (varMatch) {
                jsCode += `let ${varMatch[1]};\n`;
                return;
            }
        }

        const starMatch = trimmedLine.match(/^public\s+star\s*\(\)\s*{/);
        if (starMatch) {
            jsCode += 'Engine.start = function() {\n';
            return;
        }
        const updateMatch = trimmedLine.match(/^public\s+update\s*\(([^)]*)\)\s*{/);
        if (updateMatch) {
            jsCode += `Engine.update = function(${updateMatch[1]}) {\n`;
            return;
        }
        if (trimmedLine.match(/public\s+.*\(\)\s*{/)) {
            errors.push(`Línea ${lineNumber}: Declaración de función no válida: "${trimmedLine}"`);
            return;
        }

        if (inBlock) {
            if (trimmedLine.includes('}')) {
                inBlock = false;
                if (!trimmedLine.startsWith('}')) {
                    let content = trimmedLine.substring(0, trimmedLine.indexOf('}'));
                    content = content.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
                    content = content.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
                    content = content.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');
                    jsCode += `    ${content}\n`;
                }
                jsCode += '};\n';
                return;
            }

            let originalLine = trimmedLine;
            let processedLine = trimmedLine.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
            processedLine = processedLine.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
            processedLine = processedLine.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');

            if (processedLine === originalLine && !originalLine.match(/(if|for|while|{|})|^\w+\.\w+\(.*\);?$/)) {
                 errors.push(`Línea ${lineNumber}: Comando desconocido dentro de un bloque: "${originalLine}"`);
            } else {
                jsCode += `    ${processedLine}\n`;
            }
            return;
        }
        errors.push(`Línea ${lineNumber}: Sintaxis inesperada: "${trimmedLine}"`);
    });

    if (errors.length > 0) return { errors };
    const finalImports = Array.from(imports).join('\n');
    return { jsCode: `${finalImports}\n\n${jsCode}` };
}
