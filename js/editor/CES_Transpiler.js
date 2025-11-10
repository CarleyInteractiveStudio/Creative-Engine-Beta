// Contains the logic for transpiling Creative Engine Script (.ces) to JavaScript.
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

const usingMap = {
    'creative.engine': "import * as Engine from './modules/engine.js';",
    'creative.engine.core': "import * as Core from './modules/core.js';",
    'creative.engine.ui': "import * as UI from './modules/ui.js';",
    'creative.engine.animator': "import * as Animator from './modules/animator.js';",
    'creative.engine.physics': "import * as Physics from './modules/physics.js';",
};

export function transpile(code) {
    const allAPIs = RuntimeAPIManager.getAPIs();
    const lines = code.split(/\r?\n/);
    const errors = [];
    let jsCode = '';
    const imports = new Set();
    let inBlock = false;

    const importedLibs = [];
    const availableFunctions = {};
    const ambiguousFunctions = new Set();

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) return;

        // --- Phase 1: Handle imports (go and using) ---
        const goMatch = trimmedLine.match(/^go\s+"([^"]+)"/);
        if (goMatch) {
            const libName = goMatch[1];
            if (!allAPIs[libName]) {
                errors.push(`Línea ${lineNumber}: La librería '${libName}' no se encontró o no está registrada.`);
                return;
            }
            importedLibs.push(libName);

            // Register functions and check for ambiguities
            for (const funcName in allAPIs[libName]) {
                if (availableFunctions[funcName]) {
                    ambiguousFunctions.add(funcName);
                } else {
                    availableFunctions[funcName] = libName;
                }
            }
            return; // Finished processing this 'go' line
        }

        const usingMatch = trimmedLine.match(/^using\s+([^;]+);/);
        if (usingMatch) {
            const namespace = usingMatch[1].trim();
            if (usingMap[namespace]) imports.add(usingMap[namespace]);
            else errors.push(`Línea ${lineNumber}: Namespace '${namespace}' desconocido.`);
            return;
        }

        // Defer processing of other lines until all 'go' statements are read
    });

    if (errors.length > 0) return { errors };

    // --- Phase 2: Process the rest of the code ---
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('go ')) return;

        if (trimmedLine.includes('{')) inBlock = true;

        if (!inBlock) {
            const varMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject)\s+([^;]+);/);
            if (varMatch) {
                jsCode += `let ${varMatch[1]};\n`;
                return;
            }
        }

        // Handle function calls from libraries
        let processedLine = trimmedLine.replace(/(\w+)\s*\((.*)\)/g, (match, funcName, args) => {
            // Check for direct, non-ambiguous call
            if (availableFunctions[funcName] && !ambiguousFunctions.has(funcName)) {
                const libName = availableFunctions[funcName];
                return `RuntimeAPIManager.getAPIs()["${libName}"].${funcName}(${args})`;
            }
            // Check for ambiguity
            if (ambiguousFunctions.has(funcName)) {
                errors.push(`Línea ${lineNumber}: Llamada a función ambigua '${funcName}'. Especifique la librería (ej: LibName.${funcName}() o go[1].${funcName}()).`);
                return match;
            }
            // Check for disambiguation by name
            const byNameMatch = match.match(/(\w+)\.(\w+)\s*\((.*)\)/);
            if (byNameMatch) {
                const [_, libName, func, funcArgs] = byNameMatch;
                if (importedLibs.includes(libName) && allAPIs[libName][func]) {
                    return `RuntimeAPIManager.getAPIs()["${libName}"].${func}(${funcArgs})`;
                }
            }
            // Check for disambiguation by index
            const byIndexMatch = match.match(/go\[(\d+)\]\.(\w+)\s*\((.*)\)/);
            if (byIndexMatch) {
                const [_, indexStr, func, funcArgs] = byIndexMatch;
                const index = parseInt(indexStr, 10) - 1;
                if (index >= 0 && index < importedLibs.length) {
                    const libName = importedLibs[index];
                    if (allAPIs[libName][func]) {
                        return `RuntimeAPIManager.getAPIs()["${libName}"].${func}(${funcArgs})`;
                    }
                }
            }
            return match; // Return original if no match
        });

        if (errors.length > 0) return;

        const starMatch = processedLine.match(/^public\s+star\s*\(\)\s*{/);
        if (starMatch) {
            jsCode += 'Engine.start = function() {\n';
            return;
        }
        const updateMatch = processedLine.match(/^public\s+update\s*\(([^)]*)\)\s*{/);
        if (updateMatch) {
            jsCode += `Engine.update = function(${updateMatch[1]}) {\n`;
            return;
        }

        if (inBlock) {
            if (processedLine.includes('}')) {
                inBlock = false;
                jsCode += '};\n';
                return;
            }
            jsCode += `    ${processedLine}\n`;
        } else {
             if (!processedLine.startsWith('let')) {
                 errors.push(`Línea ${lineNumber}: Sintaxis inesperada: "${trimmedLine}"`);
             }
        }
    });

    if (errors.length > 0) return { errors };
    const finalImports = Array.from(imports).join('\n');
    return { jsCode: `${finalImports}\n\n${jsCode}` };
}
