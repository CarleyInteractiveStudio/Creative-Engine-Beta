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
    const allAPIs = RuntimeAPIManager.getAPIs(); // This is a Map
    const lines = code.split(/\r?\n/);
    const errors = [];
    let jsCode = '';
    const imports = new Set();
    let inBlock = false;

    // --- Library Import Data ---
    const importedLibs = [];
    const functionToLibMap = new Map();
    const ambiguousFunctions = new Set();
    const declaredFunctions = new Set();

    // --- Phase 1: Handle all imports (go and using), map library functions, and find user-defined functions ---
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) return;

        // Handle 'go' imports for libraries
        const goMatch = trimmedLine.match(/^go\s+"([^"]+)"/);
        if (goMatch) {
            const libName = goMatch[1];
            if (!allAPIs.has(libName)) {
                errors.push(`Línea ${lineNumber}: La librería '${libName}' no se encontró o no está registrada.`);
                return;
            }
            if (!importedLibs.some(lib => lib.name === libName)) {
                importedLibs.push({ name: libName, index: importedLibs.length });
                const libAPI = allAPIs.get(libName);
                for (const funcName in libAPI) {
                    if (functionToLibMap.has(funcName)) {
                        ambiguousFunctions.add(funcName);
                    } else {
                        functionToLibMap.set(funcName, libName);
                    }
                }
            }
            return; // Finished processing this 'go' line
        }

        // Handle 'using' imports for engine modules
        const usingMatch = trimmedLine.match(/^using\s+([^;]+);/);
        if (usingMatch) {
            const namespace = usingMatch[1].trim();
            if (usingMap[namespace]) imports.add(usingMap[namespace]);
            else errors.push(`Línea ${lineNumber}: Namespace '${namespace}' desconocido.`);
            return;
        }

        // Find user-defined function declarations
        const functionMatch = trimmedLine.match(/^function\s+([a-zA-Z0-9_]+)\s*\(/);
        if (functionMatch) {
            declaredFunctions.add(functionMatch[1]);
        }
    });

    if (errors.length > 0) return { errors };

    // --- Phase 2: Process the rest of the code ---
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('go ') || trimmedLine.startsWith('using ')) return;

        // Handle user-defined function declarations
        if (trimmedLine.startsWith('function ')) {
            jsCode += `${line}\n`;
            return;
        }

        if (trimmedLine.includes('{')) inBlock = true;

        // Retain existing variable declaration logic
        if (!inBlock) {
            const varMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject)\s+([^;]+);/);
            if (varMatch) {
                jsCode += `let ${varMatch[1]};\n`;
                return;
            }
        }

        // --- Transpile Function Calls (Library and Engine) ---
        let processedLine = trimmedLine.replace(/([a-zA-Z0-9_.]+)\s*\((.*)\)/g, (match, funcName, argsStr) => {
            // --- Argument Processing with Callback Support ---
            const processArgs = (argsString) => {
                if (!argsString) return '';
                return argsString.split(',')
                    .map(arg => arg.trim())
                    .map(arg => {
                        // If the argument is a declared function, pass it as a variable.
                        // Otherwise, it's a literal (string, number, etc.) and is passed as is.
                        return declaredFunctions.has(arg) ? arg : arg;
                    })
                    .join(', ');
            };

            const processedArgs = processArgs(argsStr);

            // Handle disambiguation first: Library.function()
            if (funcName.includes('.')) {
                const parts = funcName.split('.');
                const libName = parts[0];
                const fn = parts[1];
                 if (importedLibs.some(lib => lib.name === libName) && allAPIs.get(libName)?.[fn]) {
                    return `RuntimeAPIManager.getAPI("${libName}").${fn}(${processedArgs})`;
                }
            }

            // Handle alternative disambiguation: function.(Library()) - This is a custom syntax
            const altDisambiguationMatch = match.match(/(\w+)\.\s*\(\s*(\w+)\s*\(\s*\)\s*\)\((.*)\)/);
            if (altDisambiguationMatch) {
                const [_, func, libName, funcArgs] = altDisambiguationMatch;
                 const processedFuncArgs = processArgs(funcArgs);
                if (importedLibs.some(lib => lib.name === libName) && allAPIs.get(libName)?.[func]) {
                    return `RuntimeAPIManager.getAPI("${libName}").${func}(${processedFuncArgs})`;
                }
            }

            // Handle standard, non-ambiguous library call
            if (functionToLibMap.has(funcName) && !ambiguousFunctions.has(funcName)) {
                const libName = functionToLibMap.get(funcName);
                return `RuntimeAPIManager.getAPI("${libName}").${funcName}(${processedArgs})`;
            }

            // Report ambiguity error
            if (ambiguousFunctions.has(funcName)) {
                const possibleLibs = importedLibs.filter(lib => allAPIs.get(lib.name)?.[funcName]).map(lib => lib.name);
                errors.push(`Línea ${lineNumber}: Llamada a función ambigua '${funcName}'. Especifique la librería (ej: ${possibleLibs[0]}.${funcName}()).`);
                return match; // Return original match to stop processing this line
            }

            // If it's not a known library function, return it as is for other JS/engine functions.
            return match;
        });

        if (errors.length > 0) return;


        // Retain existing lifecycle function logic
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

        // Retain existing block and syntax error logic
        if (inBlock) {
            if (processedLine.includes('}')) {
                inBlock = false;
                jsCode += '};\n';
                return;
            }
            jsCode += `    ${processedLine}\n`;
        } else {
            // After refactoring, top-level function calls are valid.
            // We just add the processed line to the code.
            jsCode += `${processedLine}\n`;
        }
    });

    if (errors.length > 0) return { errors };
    const finalImports = Array.from(imports).join('\n');
    return { jsCode: `${finalImports}\n\n${jsCode}` };
}
