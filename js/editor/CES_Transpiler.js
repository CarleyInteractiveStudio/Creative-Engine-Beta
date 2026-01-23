// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map(); // Nueva estructura para metadatos

/**
 * Pre-processes the raw .ces code to remove comments and build a line map.
 * This allows for more accurate error reporting by tracking original line numbers.
 * @param {string} code The raw code.
 * @returns {{cleanCode: string, lineMap: number[]}}
 */
function preprocess(code) {
    const lines = code.split('\n');
    const cleanLines = [];
    const lineMap = []; // cleanLines index -> original line number
    let inMultiLineComment = false;

    for (let i = 0; i < lines.length; i++) {
        const originalLineNumber = i + 1;
        let line = lines[i];
        let processedLine = '';

        let j = 0;
        while (j < line.length) {
            if (inMultiLineComment) {
                const endCommentIndex = line.indexOf('*/', j);
                if (endCommentIndex !== -1) {
                    inMultiLineComment = false;
                    j = endCommentIndex + 2;
                } else {
                    break; // Whole line is a comment
                }
            } else {
                const startMultiComment = line.indexOf('/*', j);
                const startSingleComment = line.indexOf('//', j);

                if (startMultiComment !== -1 && (startSingleComment === -1 || startMultiComment < startSingleComment)) {
                    processedLine += line.substring(j, startMultiComment);
                    inMultiLineComment = true;
                    j = startMultiComment + 2;
                } else if (startSingleComment !== -1) {
                    processedLine += line.substring(j, startSingleComment);
                    break; // Rest of the line is a comment
                } else {
                    processedLine += line.substring(j);
                    break; // No more comments on this line
                }
            }
        }

        // Only add non-empty lines to the clean code
        if (processedLine.trim() !== '') {
            cleanLines.push(processedLine);
            lineMap.push(originalLineNumber);
        }
    }

    return { cleanCode: cleanLines.join('\n'), lineMap };
}


// --- Helper Functions ---

const typeMap = {
    'number': 'number',
    'numero': 'number',
    'dnumber': 'number',
    'dnumero': 'number',
    'text': 'string',
    'texto': 'string',
    'boolean': 'boolean',
    'booleano': 'boolean',
    'Materia': 'Materia'
};

export function getDefaultValueForType(canonicalType) {
    switch (canonicalType) {
        case 'number':
             return 0;
        case 'string': return "";
        case 'boolean': return false;
        case 'Materia': return null;
        default: return null;
    }
}

function parseInitialValue(value, canonicalType) {
    switch (canonicalType) {
        case 'number':
            return parseFloat(value) || 0;
        case 'string':
            // Eliminar comillas si existen
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.slice(1, -1);
            }
            return value;
        case 'boolean':
            return value.toLowerCase() === 'verdadero' || value.toLowerCase() === 'true';
        case 'Materia':
            return null; // Las referencias a objetos no se pueden establecer por defecto
        default:
            // This case should not be hit with the new mandatory types, but kept as a fallback.
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
    // --- Phase 1: Preprocessing ---
    const { cleanCode, lineMap } = preprocess(code);

    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let privateVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    let publicFunctions = [];
    const importedLibs = new Set();

    // --- Phase 2: Parse and Rip Declarations ---
    // Order of operations is important here to avoid regex conflicts.
    // 1. Rip out methods first.
    // 2. Then rip out variables.
    // 3. Finally, handle imports.
    let unprocessedCode = cleanCode;

    // 1.a: Parse and extract methods (bilingual, supports sequences)
    const methodHeaderRegex = /^\s*(public|publico)\s+(?:(sequence|secuencia|function|funcion)\s+)?(\w+)\s*\(([^)]*)\)\s*{/gm;
    const methodMatches = []; // Store matches to process later
    let tempCode = unprocessedCode;
    let methodMatch;

    while ((methodMatch = methodHeaderRegex.exec(tempCode)) !== null) {
        const keyword = methodMatch[2];
        const isSequence = keyword === 'sequence' || keyword === 'secuencia';
        let name = methodMatch[3];
        const args = methodMatch[4];
        const bodyStartIndex = methodMatch.index + methodMatch[0].length;

        let braceCount = 1;
        let bodyEndIndex = -1;
        for (let i = bodyStartIndex; i < tempCode.length; i++) {
            if (tempCode[i] === '{') braceCount++;
            else if (tempCode[i] === '}') {
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

        const body = tempCode.substring(bodyStartIndex, bodyEndIndex);
        const fullMethodText = tempCode.substring(methodMatch.index, bodyEndIndex + 1);

        if (keyword === 'function' || keyword === 'funcion') {
            publicFunctions.push(name);
        }
        methodMatches.push({ name, args, body, isSequence });

        // Blank out the matched method to prevent it from being processed again
        unprocessedCode = unprocessedCode.replace(fullMethodText, '');
    }


// 1.b: Parse and remove public and private variables (supports arrays)
const varRegex = /^\s*(public|private|publico|privado)\s+(?:(var|numero|number|texto|string|booleano|boolean|Materia))\s*(\[\])?\s+([a-zA-Z_]\w*)\s*(?::\s*\w+\s*)?(?:=\s*(.+?))?\s*;/gm;
    let varMatch;
    while ((varMatch = varRegex.exec(unprocessedCode)) !== null) {
        const scope = varMatch[1].replace('publico', 'public').replace('privado', 'private');
        const typeInput = varMatch[2];
        const isArray = varMatch[3] === '[]';
        const name = varMatch[4];
        const value = varMatch[5]; // This will be null for arrays, as they can't be initialized inline

        const canonicalType = typeMap[typeInput] || 'any'; // Default to 'any' if 'var' is used

        let varData = {
            name: name,
            type: canonicalType,
            isArray: isArray,
            value: isArray ? '[]' : (value || JSON.stringify(getDefaultValueForType(canonicalType))),
            defaultValue: isArray ? [] : (value ? parseInitialValue(value.trim(), canonicalType) : getDefaultValueForType(canonicalType))
        };

        if (scope === 'public') {
            publicVars.push(varData);
        } else {
            privateVars.push(varData);
        }
    }
    unprocessedCode = unprocessedCode.replace(varRegex, '');

// 1.c: Parse and validate library imports (robust version)
const goRegex = /^\s*\bgo\b\s+(?:"([^"]+)"|((?:ce\.)?\w+))\s*/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(unprocessedCode)) !== null) {
        const libName = goMatch[1] || goMatch[2];
        if (!RuntimeAPIManager.getAPI(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró o no está registrada.`);
        } else {
            importedLibs.add(libName);
        }
    }
    unprocessedCode = unprocessedCode.replace(goRegex, '');


    // Almacenar los metadatos de las variables públicas
    const metadata = {
        publicVars: publicVars.map(pv => ({
            name: pv.name,
            type: pv.type,
            isArray: pv.isArray,
            defaultValue: pv.defaultValue
        })),
        publicFunctions: publicFunctions
    };
    scriptMetadataMap.set(scriptName, metadata);


    // --- Phase 2: Transpile method bodies ---
    for (const match of methodMatches) {
        let { name, args, body, isSequence } = match;

        // 2.a: Replace coroutine wait command
        if (isSequence) {
            body = body.replace(/\besperar\s*\(([^)]*)\)/g, 'yield $1');
        }

// 2.b: Replace console shortcuts with word boundaries for safety
body = body.replace(/\b(imprimir|log)\s*\(/g, 'console.log(');

// 2.b: Auto-prefix core APIs with 'this.', using word boundaries
body = body.replace(/\b(input|entrada)\./g, 'this.$1.');
body = body.replace(/\b(engine|motor)\./g, 'this.$1.');
body = body.replace(/\b(scene|escena)\./g, 'this.$1.');

        // 2.c: Replace custom library function calls (explicitly 'go' imported)
        for (const libName of importedLibs) {
            const api = RuntimeAPIManager.getAPI(libName);
            if (!api) continue; // Should have been caught by an error earlier, but safe guard
            for (const functionName in api) {
                // Use a negative lookbehind assertion to ensure we only replace global calls, not member accesses.
                const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
                // For custom libs, use RuntimeAPIManager.getAPI directly
                const replacement = `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`;
                body = body.replace(regex, replacement);
            }
        }

        // 2.c: Map Spanish lifecycle methods to their English counterparts
        if (name === 'iniciar') name = 'star';
        if (name === 'actualizar') name = 'update';

        if (name === 'star') {
            starMethod = body;
        } else if (name === 'update') {
            updateMethod = body;
        } else {
            const functionMarker = isSequence ? '*' : '';
            customMethods += `    ${name}${functionMarker}(${args}) {\n${body}\n    }\n\n`;
        }
    }

// 1.d: Final check for leftover code and improved error reporting
const unprocessedLines = unprocessedCode.trim().split('\n');
if (unprocessedLines.length > 0 && unprocessedLines[0].trim() !== '') {
    // Find the original line number of the first invalid piece of code.
    // This is a bit tricky since `unprocessedCode` has had declarations removed.
    // We find the first line with content in the remainder, and find its index
    // in the original `cleanCode` to map it back.
    const cleanLines = cleanCode.split('\n');
    let originalLine = -1;
    for (let i = 0; i < cleanLines.length; i++) {
        if (cleanLines[i].includes(unprocessedLines[0].trim())) {
            originalLine = lineMap[i];
            break;
        }
    }

    if (originalLine !== -1) {
        errors.push(`Error en la línea ${originalLine}: Código inválido o declaración mal formada: "${unprocessedLines[0].trim()}..."`);
    } else {
        // Fallback if we can't map the line
        errors.push(`Error: Código inválido encontrado fuera de una declaración: "${unprocessedLines[0].trim()}..."`);
    }
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
        jsCode += `            this.${pv.name} = ${pv.value}; // Type: ${pv.type}${pv.isArray ? '[]' : ''}\n`;
    });
    privateVars.forEach(pv => {
        jsCode += `            this.${pv.name} = ${pv.value};\n`;
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
