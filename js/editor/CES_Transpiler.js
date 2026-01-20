// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map();

// --- Helper Functions ---

const typeMap = {
    'number': 'number', 'numero': 'number',
    'dnumber': 'number', 'dnumero': 'number',
    'text': 'string', 'texto': 'string',
    'boolean': 'boolean', 'booleano': 'boolean',
    'Materia': 'Materia'
};

function getDefaultValueForType(canonicalType) {
    switch (canonicalType) {
        case 'number': return 0;
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
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.slice(1, -1);
            }
            return value;
        case 'boolean':
            return value.toLowerCase() === 'verdadero' || value.toLowerCase() === 'true';
        case 'Materia':
            return null;
        default:
            if (!isNaN(parseFloat(value)) && isFinite(value)) return parseFloat(value);
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'verdadero') return true;
            if (value.toLowerCase() === 'false' || value.toLowerCase() === 'falso') return false;
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
            return value;
    }
}


// --- Public API ---

export function getScriptMetadata(scriptName) {
    return scriptMetadataMap.get(scriptName);
}

/**
 * Transpiles a .ces script into an ES6 class.
 * @param {string} code The raw .ces code.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @param {Map<string, object>} availableLibs - A map of available libraries for validation.
 * @returns {{errors: string[] | null, jsCode: string | null}} An object with an errors array, or the generated JS code.
 */
export function transpile(code, scriptName, availableLibs = new Map()) {
    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let privateVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    let publicFunctions = [];
    const importedLibs = new Set();

    let unprocessedCode = code;

    const methodHeaderRegex = /^\s*(public|publico)\s+(?:(function|funcion)\s+)?(\w+)\s*\(([^)]*)\)\s*{/gm;
    const methodMatches = [];
    let tempCode = unprocessedCode;
    let methodMatch;

    while ((methodMatch = methodHeaderRegex.exec(tempCode)) !== null) {
        const isFunction = methodMatch[2] === 'function' || methodMatch[2] === 'funcion';
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

        if (isFunction) publicFunctions.push(name);
        methodMatches.push({ name, args, body });
        unprocessedCode = unprocessedCode.replace(fullMethodText, '');
    }

    const varRegex = /^\s*(public|private|publico|privado)\s+([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)\s*(?:=\s*(.+))?;/gm;
    let varMatch;
    while ((varMatch = varRegex.exec(unprocessedCode)) !== null) {
        const scope = varMatch[1].replace('publico', 'public').replace('privado', 'private');
        const typeInput = varMatch[2];
        const name = varMatch[3];
        const value = varMatch[4];

        const canonicalType = typeMap[typeInput];
        if (!canonicalType) {
            errors.push(`Error: Tipo de variable desconocido '${typeInput}' en la declaración de '${name}'.`);
            continue;
        }

        const parsedValue = value ? parseInitialValue(value.trim(), canonicalType) : getDefaultValueForType(canonicalType);
        if (scope === 'public') {
            publicVars.push({ type: canonicalType, name: name, value: value, defaultValue: parsedValue });
        } else {
            privateVars.push({ name: name, value: value });
        }
    }
    unprocessedCode = unprocessedCode.replace(varRegex, '');

    const goRegex = /^\s*go\s+(?:"([^"]+)"|((?:ce\.)?\w+))/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(unprocessedCode)) !== null) {
        const libName = goMatch[1] || goMatch[2];
        // Use the passed-in map for validation
        if (!availableLibs.has(libName) && !RuntimeAPIManager.getAPI(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró o no está registrada.`);
        } else {
            importedLibs.add(libName);
        }
    }
    unprocessedCode = unprocessedCode.replace(goRegex, '');

    const metadata = {
        publicVars: publicVars.map(pv => ({ name: pv.name, type: pv.type, defaultValue: pv.defaultValue })),
        publicFunctions: publicFunctions
    };
    scriptMetadataMap.set(scriptName, metadata);

    for (const match of methodMatches) {
        let { name, args, body } = match;
        body = body.replace(/(?<![.\w])(imprimir|log)\s*\(/g, 'console.log(');
        body = body.replace(/(?<![.\w])(input|entrada)\./g, 'this.$1.');
        body = body.replace(/(?<![.\w])(engine|motor)\./g, 'this.$1.');
        body = body.replace(/(?<![.\w])(scene|escena)\./g, 'this.$1.');

        for (const libName of importedLibs) {
             const api = availableLibs.get(libName) || RuntimeAPIManager.getAPI(libName);
            if (!api) continue;
            for (const functionName in api) {
                const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
                const replacement = `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`;
                body = body.replace(regex, replacement);
            }
        }

        if (name === 'iniciar') name = 'star';
        if (name === 'actualizar') name = 'update';
        if (name === 'star') starMethod = body;
        else if (name === 'update') updateMethod = body;
        else customMethods += `    ${name}(${args}) {\n${body}\n    }\n\n`;
    }

    unprocessedCode = unprocessedCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (unprocessedCode.trim() !== '') {
        const firstInvalidLine = unprocessedCode.trim().split('\n')[0];
        errors.push(`Error: Código inválido encontrado fuera de una declaración: "${firstInvalidLine}..."`);
    }

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        scriptMetadataMap.delete(scriptName);
        return { errors, jsCode: null };
    }

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

export function getTranspiledCode(scriptName) {
    return transpiledCodeMap.get(scriptName);
}
