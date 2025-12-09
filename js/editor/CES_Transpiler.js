// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();

// --- Public API ---

/**
 * Transpiles a .ces script into an ES6 class.
 * @param {string} code The raw .ces code.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {{errors: string[] | null, jsCode: string | null}} An object with an errors array, or the generated JS code.
 */
export function transpile(code, scriptName) {
    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    const importedLibs = new Set();

    // --- Phase 1: Parse top-level declarations ---

    let unprocessedCode = code;

    // 1.a: Parse and validate library imports (handles "libName" and "ce.libName")
    const goRegex = /^\s*go\s+"((?:ce\.)?\w+)"/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(unprocessedCode)) !== null) {
        const libName = goMatch[1];
        if (!RuntimeAPIManager.getAPI(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró o no está registrada.`);
        } else {
            importedLibs.add(libName);
        }
    }
    unprocessedCode = unprocessedCode.replace(goRegex, '');

    // 1.b: Parse and remove public variables
    const publicVarRegex = /^\s*public\s+(\w+)\s+(\w+);/gm;
    let varMatch;
    while ((varMatch = publicVarRegex.exec(unprocessedCode)) !== null) {
        publicVars.push({ type: varMatch[1], name: varMatch[2] });
    }
    unprocessedCode = unprocessedCode.replace(publicVarRegex, '');

    // 1.c: Parse and extract methods using a robust regex
    const methodRegex = /public\s+(\w+)\s*\(([^)]*)\)\s*{((?:[^{}]|{[^{}]*})*)}/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(unprocessedCode)) !== null) {
        const name = methodMatch[1];
        const args = methodMatch[2];
        let body = methodMatch[3];

        // --- Phase 2: Transpile method bodies ---
        // Replace function calls with their fully qualified API calls.
        const functionCallRegex = /(\w+)\s*\(/g;
        body = body.replace(functionCallRegex, (match, functionName) => {
            // Don't replace method declarations or known keywords.
            const keywords = ['if', 'for', 'while', 'switch', 'new', 'return'];
            if (keywords.includes(functionName)) {
                return match;
            }

            const apiName = RuntimeAPIManager.findFunctionInAPIs(functionName, Array.from(importedLibs));
            if (apiName) {
                return `RuntimeAPIManager.getAPI("${apiName}").${functionName}(`;
            }
            // If it's not a known API function, leave it as is. It might be a custom method.
            return match;
        });

        if (name === 'star') {
            starMethod = body;
        } else if (name === 'update') {
            updateMethod = body;
        } else {
            customMethods += `    ${name}(${args}) {\n${body}\n    }\n\n`;
        }
    }
    unprocessedCode = unprocessedCode.replace(methodRegex, '');

    // 1.d: Final check for leftover code
    unprocessedCode = unprocessedCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (unprocessedCode.trim() !== '') {
        const firstInvalidLine = unprocessedCode.trim().split('\n')[0];
        errors.push(`Error: Código inválido encontrado fuera de una declaración: "${firstInvalidLine}..."`);
    }

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        return { errors, jsCode: null };
    }

    // --- Phase 3: Build the JavaScript class ---
    let jsCode = `(function(CreativeScriptBehavior, RuntimeAPIManager) {\n`;
    jsCode += `    class ${className} extends CreativeScriptBehavior {\n`;
    jsCode += `        constructor(materia) {\n            super(materia);\n`;
    publicVars.forEach(pv => {
        jsCode += `            this.${pv.name} = null; // Type: ${pv.type}\n`;
    });
    jsCode += `        }\n\n`;

    const indentBody = (body) => body.trim().split('\n').map(line => `            ${line.trim()}`).join('\n');

    jsCode += `        star() {\n${indentBody(starMethod)}\n        }\n\n`;
    jsCode += `        update(deltaTime) {\n${indentBody(updateMethod)}\n        }\n\n`;

    const indentCustomMethods = (methods) => methods.trim().split('\n').map(line => `        ${line.trim()}`).join('\n');
    jsCode += `${indentCustomMethods(customMethods)}\n`;

    jsCode += `    }\n\n    return ${className};\n});`;

    transpiledCodeMap.set(scriptName, jsCode);
    return { errors: null, jsCode };
}

/**
 * Retrieves the transpiled JavaScript code for a given script.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {string | undefined} The transpiled code, or undefined if not found.
 */
export function getTranspiledCode(scriptName) {
    return transpiledCodeMap.get(scriptName);
}
