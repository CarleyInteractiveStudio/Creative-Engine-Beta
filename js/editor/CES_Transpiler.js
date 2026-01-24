// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';
import { Vector2, Color } from '../engine/DataTypes.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map();

// --- Helper Functions ---

const baseTypeMap = {
    // Primitives & Core Types
    'number': 'number', 'numero': 'number',
    'string': 'string', 'texto': 'string',
    'boolean': 'boolean', 'booleano': 'boolean',
    'Materia': 'Materia',
    'Vector2': 'Vector2',
    'Color': 'Color',

    // Asset Types
    'Prefab': 'Prefab',
    'Sprite': 'Sprite',
    'Audio': 'Audio',
    'Scene': 'Scene',

    // Component Types
    'Transform': 'Transform',
    'Camera': 'Camera',
    'CreativeScript': 'CreativeScript',
    'Rigidbody2D': 'Rigidbody2D',
    'BoxCollider2D': 'BoxCollider2D',
    'CapsuleCollider2D': 'CapsuleCollider2D',
    'SpriteRenderer': 'SpriteRenderer',
    'Animator': 'Animator',
    'UITransform': 'UITransform',
    'UIImage': 'UIImage',
    'PointLight2D': 'PointLight2D',
    'SpotLight2D': 'SpotLight2D',
    'FreeformLight2D': 'FreeformLight2D',
    'SpriteLight2D': 'SpriteLight2D',
    'AudioSource': 'AudioSource',
    'TextureRender': 'TextureRender',
    'AnimatorController': 'AnimatorController',
    'UIText': 'UIText',
    'Button': 'Button',
    'Canvas': 'Canvas',
    'Tilemap': 'Tilemap',
    'TilemapRenderer': 'TilemapRenderer',
    'TilemapCollider2D': 'TilemapCollider2D',
    'Grid': 'Grid',
    'CompositeCollider2D': 'CompositeCollider2D',
    'CustomComponent': 'CustomComponent',
    'PathfindingAgent': 'PathfindingAgent',
    'ObjectPoolComponent': 'ObjectPoolComponent',
    'CameraFollow2D': 'CameraFollow2D',
    'ParticleSystem': 'ParticleSystem'
};

function getDefaultValueForType(canonicalType, enums = {}) {
    if (canonicalType.endsWith('[]')) {
        return [];
    }
    if (enums[canonicalType]) {
        return enums[canonicalType][0]; // Default to the first value
    }
    switch (canonicalType) {
        case 'number': return 0;
        case 'string': return "";
        case 'boolean': return false;
        case 'Materia': return null;
        case 'Prefab': return null;
        case 'Sprite': return null;
        case 'Audio': return null;
        case 'Scene': return null;
        case 'Vector2': return new Vector2(0, 0);
        case 'Color': return new Color(255, 255, 255, 255);
        default:
            // All other types, including all Component types, default to null.
            if (baseTypeMap[canonicalType]) {
                return null;
            }
            return null; // Fallback for unknown types
    }
}

function parseInitialValue(value, canonicalType, enums = {}) {
    if (!value) {
        return getDefaultValueForType(canonicalType, enums);
    }
    value = value.trim();

    // Handle array initialization: [el1, el2, ...]
    if (canonicalType.endsWith('[]')) {
        if (value.startsWith('[') && value.endsWith(']')) {
            const baseType = canonicalType.slice(0, -2);
            const content = value.slice(1, -1).trim();
            if (content === '') return [];
            // This is a simplified parser; it won't handle nested arrays, commas in strings, etc.
            const elements = content.split(',').map(el => el.trim());
            return elements.map(el => parseInitialValue(el, baseType, enums));
        }
        return []; // Return empty array if initialization syntax is incorrect
    }

    // Handle Enum initialization
    if (enums[canonicalType]) {
        const cleanValue = value.replace(/["']/g, ''); // Remove quotes
        if (enums[canonicalType].includes(cleanValue)) {
            return cleanValue;
        }
        return enums[canonicalType][0]; // Default to first value if invalid
    }

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
            return null; // References can't be set by default
        case 'Vector2': {
            const match = value.match(/new\s+Vector2\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
            if (match) {
                return new Vector2(parseFloat(match[1]), parseFloat(match[2]));
            }
            return new Vector2(0, 0);
        }
        case 'Color': {
            const match = value.match(/new\s+Color\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/);
            if (match) {
                return new Color(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), match[4] !== undefined ? parseInt(match[4], 10) : 255);
            }
            return new Color(255, 255, 255, 255);
        }
        default:
            return value; // Fallback
    }
}


// --- Public API ---

export function getScriptMetadata(scriptName) {
    return scriptMetadataMap.get(scriptName);
}

export function transpile(code, scriptName) {
    const errors = [];
    const className = scriptName.replace('.ces', '');

    let publicVars = [];
    let privateVars = [];
    let starMethod = '';
    let updateMethod = '';
    let customMethods = '';
    let publicFunctions = [];
    const importedLibs = new Set();
    const enums = {};

    let unprocessedCode = code;

    // --- Phase 1: Parse and Rip Declarations ---

    // 1.a: Parse and extract enums
    const enumRegex = /^\s*(public|publico)\s+enum\s+(\w+)\s*{\s*([^}]+)\s*};?/gm;
    unprocessedCode = unprocessedCode.replace(enumRegex, (match, _scope, enumName, valuesStr) => {
        const enumValues = valuesStr.split(',').map(v => v.trim()).filter(v => v);
        if (enumValues.length > 0) {
            enums[enumName] = enumValues;
        } else {
            errors.push(`Error: El enum '${enumName}' no puede estar vacío.`);
        }
        return ''; // Remove from code
    });

    // 1.b: Parse and extract methods (bilingual)
    const methodHeaderRegex = /^\s*(public|publico)\s+(?:(function|funcion)\s+)?(\w+)\s*\(([^)]*)\)\s*{/gm;
    const methodMatches = [];
    let tempCode = unprocessedCode;
    let methodMatch;

    while ((methodMatch = methodHeaderRegex.exec(tempCode)) !== null) {
        let name = methodMatch[3];
        const args = methodMatch[4];
        const bodyStartIndex = methodMatch.index + methodMatch[0].length;

        let braceCount = 1, bodyEndIndex = -1;
        for (let i = bodyStartIndex; i < tempCode.length; i++) {
            if (tempCode[i] === '{') braceCount++;
            else if (tempCode[i] === '}') {
                braceCount--;
                if (braceCount === 0) { bodyEndIndex = i; break; }
            }
        }

        if (bodyEndIndex === -1) { errors.push(`Error: Método '${name}' no tiene una llave de cierre.`); continue; }

        const body = tempCode.substring(bodyStartIndex, bodyEndIndex);
        const fullMethodText = tempCode.substring(methodMatch.index, bodyEndIndex + 1);

        if (methodMatch[2] === 'function' || methodMatch[2] === 'funcion') { publicFunctions.push(name); }
        methodMatches.push({ name, args, body });
        unprocessedCode = unprocessedCode.replace(fullMethodText, '');
    }

    // 1.c: Dynamically build typeMap with discovered enums
    const typeMap = { ...baseTypeMap };
    for (const enumName in enums) {
        typeMap[enumName] = enumName;
    }

    // 1.d: Parse and remove public and private variables
    const varRegex = /^\s*(public|private|publico|privado)\s+([a-zA-Z_]\w*)\s*(\[\])?\s+([a-zA-Z_]\w*)\s*(?:=\s*(.+))?;/gm;
    unprocessedCode = unprocessedCode.replace(varRegex, (match, scope, typeInput, isArray, name, value) => {
        scope = scope.replace('publico', 'public').replace('privado', 'private');
        let canonicalType = typeMap[typeInput];

        if (!canonicalType) {
            errors.push(`Error: Tipo de variable desconocido '${typeInput}' en la declaración de '${name}'.`);
            return '';
        }
        if (isArray) { canonicalType += '[]'; }

        const parsedValue = value ? parseInitialValue(value, canonicalType, enums) : getDefaultValueForType(canonicalType, enums);

        if (scope === 'public') {
            publicVars.push({ type: canonicalType, name: name, value: value, defaultValue: parsedValue });
        } else {
            privateVars.push({ name: name, value: value });
        }
        return ''; // Remove from code
    });

    // 1.e: Parse and validate library imports
    const goRegex = /^\s*go\s+(?:"([^"]+)"|((?:ce\.)?\w+))/gm;
    unprocessedCode = unprocessedCode.replace(goRegex, (match, libName1, libName2) => {
        const libName = libName1 || libName2;
        if (!RuntimeAPIManager.getAPI(libName)) {
            errors.push(`Error: La librería '${libName}' no se encontró.`);
        } else {
            importedLibs.add(libName);
        }
        return '';
    });

    // --- Store Metadata ---
    const metadata = {
        publicVars: publicVars.map(pv => ({ name: pv.name, type: pv.type, defaultValue: pv.defaultValue })),
        publicFunctions: publicFunctions,
        enums: enums
    };
    scriptMetadataMap.set(scriptName, metadata);

    // --- Phase 2: Transpile method bodies ---
    for (const match of methodMatches) {
        let { name, args, body } = match;
        body = body.replace(/(?<![.\w])(imprimir|log)\s*\(/g, 'console.log(');
        body = body.replace(/(?<![.\w])(input|entrada|engine|motor|scene|escena)\./g, 'this.$1.');

        for (const libName of importedLibs) {
            const api = RuntimeAPIManager.getAPI(libName);
            if (!api) continue;
            for (const functionName in api) {
                const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
                body = body.replace(regex, `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`);
            }
        }

        if (name === 'iniciar') name = 'start';
        if (name === 'actualizar') name = 'update';

        if (name === 'start') starMethod = body;
        else if (name === 'update') updateMethod = body;
        else customMethods += `    ${name}(${args}) {\n${body}\n    }\n\n`;
    }

    // --- Final Validation ---
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

    // --- Phase 3: Build the JavaScript class ---
    let jsCode = `(function(CreativeScriptBehavior, RuntimeAPIManager) {\n`;
    jsCode += `    const { Vector2, Color } = RuntimeAPIManager.getAPI('ce.DataTypes');\n\n`;
    jsCode += `    class ${className} extends CreativeScriptBehavior {\n`;
    jsCode += `        constructor(materia) {\n            super(materia);\n`;
    publicVars.forEach(pv => {
        let valueStr;
        if (pv.type === 'Vector2' || pv.type === 'Color' || (pv.type.endsWith('[]') && pv.value)) {
            valueStr = pv.value;
        } else {
            valueStr = JSON.stringify(pv.defaultValue);
        }
        jsCode += `            this.${pv.name} = ${valueStr || JSON.stringify(pv.defaultValue)}; // Type: ${pv.type}\n`;
    });
    privateVars.forEach(pv => { jsCode += `            this.${pv.name} = ${pv.value || 'null'};\n`; });
    jsCode += `        }\n\n`;

    jsCode += `        star() {\n${starMethod.trim().split('\n').map(line => `            ${line}`).join('\n')}\n        }\n\n`;
    jsCode += `        update(deltaTime) {\n${updateMethod.trim().split('\n').map(line => `            ${line}`).join('\n')}\n        }\n\n`;
    jsCode += `${customMethods}\n`;
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
