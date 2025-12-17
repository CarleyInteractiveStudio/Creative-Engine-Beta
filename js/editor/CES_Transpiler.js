// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map(); // Nueva estructura para metadatos

// --- Helper Functions ---

function getDefaultValueForType(type) {
    switch (type) {
        case 'numero': return 0;
        case 'texto': return "";
        case 'booleano': return false;
        case 'Materia': return null;
        default: return null;
    }
}

function parseInitialValue(value, type) {
    switch (type) {
        case 'numero':
            return parseFloat(value) || 0;
        case 'texto':
            // Eliminar comillas si existen
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.slice(1, -1);
            }
            return value;
        case 'booleano':
            return value.toLowerCase() === 'verdadero' || value.toLowerCase() === 'true';
        case 'Materia':
            return null; // Las referencias a objetos no se pueden establecer por defecto
        default:
            // Para 'any' o tipos desconocidos, intentar adivinar
            if (!isNaN(parseFloat(value)) && isFinite(value)) return parseFloat(value);
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'verdadero') return true;
            if (value.toLowerCase() === 'false' || value.toLowerCase() === 'falso') return false;
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
            return value;
    }
}


// --- Public API ---

/**
 * Retrieves the metadata for a given script.
 * @param {string} scriptName The name of the script file.
 * @returns {object | undefined} The script's metadata or undefined.
 */
export function getScriptMetadata(scriptName) {
    return scriptMetadataMap.get(scriptName);
}

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
    let privateVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    const importedLibs = new Set();

    // --- Phase 1: Parse top-level declarations ---

    let unprocessedCode = code;

    // 1.a: Parse and validate library imports. Handles both `go "libName"` and `go ce.libName`.
    const goRegex = /^\s*go\s+(?:"([^"]+)"|((?:ce\.)?\w+))/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(unprocessedCode)) !== null) {
        // Match group 1 is for quoted strings, group 2 is for unquoted.
        const libName = goMatch[1] || goMatch[2];
        if (!RuntimeAPIManager.getAPI(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró o no está registrada.`);
        } else {
            importedLibs.add(libName);
        }
    }
    unprocessedCode = unprocessedCode.replace(goRegex, '');

    // 1.b: Parse and remove public and private variables (bilingual)
    const varRegex = /^\s*(public|private|publica|privado)\s+(?:(\w+)\s+)?(\w+)(?:\s*=\s*(.+))?;/gm;
    let varMatch;
    while ((varMatch = varRegex.exec(unprocessedCode)) !== null) {
        const scope = varMatch[1]; // public, private, publica, or privado
        const type = varMatch[2] || 'any';  // optional type, default to 'any'
        const name = varMatch[3];  // variable name
        const value = varMatch[4]; // optional initial value

        const parsedValue = value ? parseInitialValue(value.trim(), type) : getDefaultValueForType(type);

        if (scope === 'public' || scope === 'publica') {
            publicVars.push({ type: type, name: name, value: value, defaultValue: parsedValue });
        } else { // private or privado
            privateVars.push({ name: name, value: value });
        }
    }
    unprocessedCode = unprocessedCode.replace(varRegex, '');

    // Almacenar los metadatos de las variables públicas
    const metadata = {
        publicVars: publicVars.map(pv => ({
            name: pv.name,
            type: pv.type,
            defaultValue: pv.defaultValue
        }))
    };
    scriptMetadataMap.set(scriptName, metadata);


    // 1.c: Parse and extract methods using a robust brace-counting loop (bilingual)
    const methodHeaderRegex = /(?:public|publica)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
    let remainingCode = unprocessedCode;
    let methodsCode = '';

    let methodMatch;
    while ((methodMatch = methodHeaderRegex.exec(unprocessedCode)) !== null) {
        let name = methodMatch[1];
        const args = methodMatch[2];
        const bodyStartIndex = methodMatch.index + methodMatch[0].length;

        let braceCount = 1;
        let bodyEndIndex = -1;
        for (let i = bodyStartIndex; i < unprocessedCode.length; i++) {
            if (unprocessedCode[i] === '{') {
                braceCount++;
            } else if (unprocessedCode[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    bodyEndIndex = i;
                    break;
                }
            }
        }

        if (bodyEndIndex === -1) {
            errors.push(`Error: Método '${name}' no tiene una llave de cierre correspondiente.`);
            continue;
        }

        let body = unprocessedCode.substring(bodyStartIndex, bodyEndIndex);

        // Mark this section of code as processed
        const fullMethodText = unprocessedCode.substring(methodMatch.index, bodyEndIndex + 1);
        methodsCode += fullMethodText;


        // --- Phase 2: Transpile method bodies ---
        for (const libName of importedLibs) {
            const api = RuntimeAPIManager.getAPI(libName);
            if (!api) continue;
            for (const functionName in api) {
                const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
                const replacement = `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`;
                body = body.replace(regex, replacement);
            }
        }

        // Map Spanish lifecycle methods to their English counterparts
        if (name === 'iniciar') name = 'star';
        if (name === 'actualizar') name = 'update';

        if (name === 'star') {
            starMethod = body;
        } else if (name === 'update') {
            updateMethod = body;
        } else {
            customMethods += `    ${name}(${args}) {\n${body}\n    }\n\n`;
        }
    }
    // Remove all processed method code at once
    unprocessedCode = unprocessedCode.replace(methodHeaderRegex, (match, name, args, offset) => {
        // This is a bit tricky, we need to remove the entire method body.
        // The logic above already extracted it, here we just need to blank it out.
        // We'll rebuild the code without the methods.
        return '';
    });
    // A simpler way is just to remove what we found
    unprocessedCode = unprocessedCode.replace(methodsCode, '');

    // 1.d: Final check for leftover code
    unprocessedCode = unprocessedCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (unprocessedCode.trim() !== '') {
        const firstInvalidLine = unprocessedCode.trim().split('\n')[0];
        errors.push(`Error: Código inválido encontrado fuera de una declaración: "${firstInvalidLine}..."`);
    }

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        scriptMetadataMap.delete(scriptName); // Limpiar metadatos en caso de error
        return { errors, jsCode: null };
    }

    // --- Phase 3: Build the JavaScript class ---
    let jsCode = `(function(CreativeScriptBehavior, RuntimeAPIManager) {\n`;
    jsCode += `    class ${className} extends CreativeScriptBehavior {\n`;
    jsCode += `        constructor(materia) {\n            super(materia);\n`;
    publicVars.forEach(pv => {
        jsCode += `            this.${pv.name} = ${pv.value || JSON.stringify(pv.defaultValue)}; // Type: ${pv.type}\n`;
    });
    privateVars.forEach(pv => {
        jsCode += `            this.${pv.name} = ${pv.value || 'null'};\n`;
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
