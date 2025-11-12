// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();

// --- Public API ---

/**
 * Transpiles a .ces script into an ES6 class.
 * @param {string} code The raw .ces code.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {{errors: string[] | null}} An object with an errors array, or null if successful.
 */
export function transpile(code, scriptName) {
    const allAPIs = RuntimeAPIManager.getAPIs();
    const lines = code.split(/\r?\n/);
    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    const importedLibs = new Set();
    const functionToLibMap = new Map();

    // --- Phase 1: Pre-process lines to find imports, public vars, and method blocks ---
    let currentMethod = null;
    let methodContent = '';
    let braceCount = 0;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('//')) return;

        // Handle library imports
        const goMatch = trimmedLine.match(/^go\s+"([^"]+)"/);
        if (goMatch) {
            const libName = goMatch[1];
            if (!allAPIs.has(libName)) {
                errors.push(`Línea ${lineNumber}: La librería '${libName}' no se encontró.`);
                return;
            }
            importedLibs.add(libName);
            const libAPI = allAPIs.get(libName);
            for (const funcName in libAPI) {
                if (functionToLibMap.has(funcName)) { // Ambiguity detected
                    functionToLibMap.set(funcName, null);
                } else {
                    functionToLibMap.set(funcName, libName);
                }
            }
            return;
        }

        // Handle public variables
        const publicVarMatch = trimmedLine.match(/^public\s+(\w+)\s+(\w+);/);
        if (publicVarMatch) {
            publicVars.push({ type: publicVarMatch[1], name: publicVarMatch[2] });
            return;
        }

        // Detect start of a method
        const methodMatch = trimmedLine.match(/^public\s+(\w+)\s*\(([^)]*)\)\s*{/);
        if (methodMatch) {
            if (currentMethod) {
                errors.push(`Línea ${lineNumber}: No se puede anidar una función dentro de otra.`);
                return;
            }
            currentMethod = { name: methodMatch[1], args: methodMatch[2] };
            braceCount = 1;
            methodContent = '';
            if (trimmedLine.endsWith('}')) { // Handle single-line methods
                 braceCount = 0;
                 if (currentMethod.name === 'star') starMethod = methodContent;
                 else if (currentMethod.name === 'update') updateMethod = methodContent;
                 else customMethods += `    ${currentMethod.name}(${currentMethod.args}) { ${methodContent} }\n\n`;
                 currentMethod = null;
            }
            return;
        }

        // Handle content inside a method
        if (currentMethod) {
            methodContent += line + '\n';
            if (trimmedLine.includes('{')) braceCount++;
            if (trimmedLine.includes('}')) braceCount--;

            if (braceCount === 0) {
                 if (currentMethod.name === 'star') starMethod = methodContent;
                 else if (currentMethod.name === 'update') updateMethod = methodContent;
                 else customMethods += `    ${currentMethod.name}(${currentMethod.args}) { ${methodContent} }\n\n`;
                 currentMethod = null;
            }
        } else {
             errors.push(`Línea ${lineNumber}: Código encontrado fuera de un método.`);
        }
    });

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        return { errors };
    }

    // --- Phase 2: Build the JavaScript class ---
    let jsCode = `import { CreativeScriptBehavior } from './engine/Components.js';\n`;

    // Add library functions to the top level for easy access within the class
    importedLibs.forEach(libName => {
        const libAPI = allAPIs.get(libName);
        for (const funcName in libAPI) {
            // If the function is not ambiguous, create a proxy for it
            if(functionToLibMap.get(funcName) === libName) {
                jsCode += `const ${funcName} = (...args) => RuntimeAPIManager.getAPI("${libName}").${funcName}(...args);\n`;
            }
        }
    });

    jsCode += `\nexport default class ${className} extends CreativeScriptBehavior {\n`;

    // Add constructor
    jsCode += `    constructor(materia) {\n        super(materia);\n`;
    publicVars.forEach(pv => {
        jsCode += `        this.${pv.name} = null; // Type: ${pv.type}\n`;
    });
    jsCode += `    }\n\n`;

    // Add star method
    jsCode += `    star() {\n${starMethod}\n    }\n\n`;

    // Add update method
    jsCode += `    update(deltaTime) {\n${updateMethod}\n    }\n\n`;

    // Add custom methods
    jsCode += customMethods;

    jsCode += `}\n`;

    transpiledCodeMap.set(scriptName, jsCode);
    return { errors: null };
}

/**
 * Retrieves the transpiled JavaScript code for a given script.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {string | undefined} The transpiled code, or undefined if not found.
 */
export function getTranspiledCode(scriptName) {
    return transpiledCodeMap.get(scriptName);
}
