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
    const allAPIs = RuntimeAPIManager.getAPIs();
    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    const importedLibs = new Set();
    const functionToLibMap = new Map();

    // --- Phase 1: Parse top-level declarations ---

    let validationCode = code;

    // 1.a: Parse and remove library imports
    const goRegex = /^\s*go\s+"([^"]+)"/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(code)) !== null) {
        const libName = goMatch[1];
        if (!allAPIs.has(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró.`);
            continue;
        }
        importedLibs.add(libName);
        const libAPI = allAPIs.get(libName);
        for (const funcName in libAPI) {
            if (functionToLibMap.has(funcName) && functionToLibMap.get(funcName) !== null) {
                functionToLibMap.set(funcName, null); // Ambiguity detected
            } else {
                functionToLibMap.set(funcName, libName);
            }
        }
    }
    validationCode = validationCode.replace(goRegex, '');

    // 1.b: Parse and remove public variables
    const publicVarRegex = /^\s*public\s+(\w+)\s+(\w+);/gm;
    let varMatch;
    while ((varMatch = publicVarRegex.exec(code)) !== null) {
        publicVars.push({ type: varMatch[1], name: varMatch[2] });
    }
    validationCode = validationCode.replace(publicVarRegex, '');

    // 1.c: Parse and remove methods using a robust regex that handles one level of nested braces
    const methodRegex = /public\s+(\w+)\s*\(([^)]*)\)\s*{((?:[^{}]|{[^{}]*})*)}/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(code)) !== null) {
        const name = methodMatch[1];
        const args = methodMatch[2];
        const body = methodMatch[3];

        if (name === 'star') {
            starMethod = body;
        } else if (name === 'update') {
            updateMethod = body;
        } else {
            customMethods += `    ${name}(${args}) {\n${body}\n    }\n\n`;
        }
    }
    validationCode = validationCode.replace(methodRegex, '');

    // 1.d: Remove comments and check for leftover code
    validationCode = validationCode.replace(/\/\/.*/g, '');
    validationCode = validationCode.replace(/\/\*[\s\S]*?\*\//g, '');
    if (validationCode.trim() !== '') {
        const firstInvalidLine = validationCode.trim().split('\n')[0];
        errors.push(`Error: Código inválido encontrado fuera de una declaración de método, variable o import: "${firstInvalidLine}..."`);
    }

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        return { errors, jsCode: null };
    }

    // --- Phase 2: Build the JavaScript class ---
    let jsCode = `(function(CreativeScriptBehavior, RuntimeAPIManager) {\n`;

    importedLibs.forEach(libName => {
        const libAPI = allAPIs.get(libName);
        for (const funcName in libAPI) {
            if(functionToLibMap.get(funcName) === libName) {
                jsCode += `    const ${funcName} = (...args) => RuntimeAPIManager.getAPI("${libName}").${funcName}(...args);\n`;
            }
        }
    });

    jsCode += `\n    class ${className} extends CreativeScriptBehavior {\n`;

    jsCode += `        constructor(materia) {\n            super(materia);\n`;
    publicVars.forEach(pv => {
        jsCode += `            this.${pv.name} = null; // Type: ${pv.type}\n`;
    });
    jsCode += `        }\n\n`;

    // Indent the method bodies correctly
    const indentBody = (body) => body.trim().split('\n').map(line => `            ${line.trim()}`).join('\n');

    jsCode += `        star() {\n${indentBody(starMethod)}\n        }\n\n`;
    jsCode += `        update(deltaTime) {\n${indentBody(updateMethod)}\n        }\n\n`;

    // Custom methods also need indentation
    const indentCustomMethods = (methods) => {
        return methods.trim().split('\n').map(line => `        ${line.trim()}`).join('\n');
    };
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
