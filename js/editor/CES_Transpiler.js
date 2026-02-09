// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map(); // Nueva estructura para metadatos

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
    'Materia': 'Materia',
    'Sprite': 'Sprite',
    'Audio': 'Audio',
    'Prefab': 'Prefab',
    'prefab': 'Prefab',
    'Scene': 'Scene',
    'Vector2': 'Vector2',
    'Color': 'Color',
    // Engine Components
    'Transform': 'Transform',
    'UITransform': 'UITransform',
    'SpriteRenderer': 'SpriteRenderer',
    'Rigidbody2D': 'Rigidbody2D',
    'BoxCollider2D': 'BoxCollider2D',
    'CapsuleCollider2D': 'CapsuleCollider2D',
    'Animator': 'Animator',
    'AnimatorController': 'AnimatorController',
    'Camera': 'Camera',
    'CreativeScript': 'CreativeScript',
    'PointLight2D': 'PointLight2D',
    'SpotLight2D': 'SpotLight2D',
    'FreeformLight2D': 'FreeformLight2D',
    'SpriteLight2D': 'SpriteLight2D',
    'Tilemap': 'Tilemap',
    'TilemapRenderer': 'TilemapRenderer',
    'TilemapCollider2D': 'TilemapCollider2D',
    'UIImage': 'UIImage',
    'UIText': 'UIText',
    'Canvas': 'Canvas',
    'Button': 'Button',
    'Parallax': 'Parallax',
    'Movement': 'Movement',
    'ParticleSystem': 'ParticleSystem',
    'DrawingOrder': 'DrawingOrder',
    'CameraFollow': 'CameraFollow',
    'variable': 'any',
    'any': 'any'
};

const componentShortcuts = [
    'transform', 'transformacion', 'posicion',
    'rigidbody2D', 'fisica',
    'animatorController', 'controladorAnimacion',
    'spriteRenderer', 'renderizadorDeSprite',
    'audioSource', 'fuenteDeAudio',
    'boxCollider2D', 'colisionadorCaja2D',
    'capsuleCollider2D', 'colisionadorCapsula2D',
    'camera', 'camara',
    'animator', 'animador',
    'pointLight2D', 'luzPuntual2D',
    'spotLight2D', 'luzFocal2D',
    'freeformLight2D', 'luzFormaLibre2D',
    'spriteLight2D', 'luzDeSprite2D',
    'tilemap', 'mapaDeAzulejos',
    'tilemapRenderer', 'renderizadorMapaDeAzulejos',
    'tilemapCollider2D', 'colisionadorMapaDeAzulejos2D',
    'compositeCollider2D', 'colisionadorCompuesto2D',
    'grid', 'rejilla',
    'textureRender', 'renderizadorDeTextura',
    'canvas', 'lienzo',
    'uiImage', 'imagenUI',
    'uiTransform', 'transformacionUI',
    'uiText', 'textoUI',
    'button', 'boton',
    'customComponent', 'componentePersonalizado',
    'parallax',
    'movement', 'movimiento',
    'particleSystem', 'sistemaDeParticulas',
    'cameraFollow', 'seguimientoDeCamara',
    'drawingOrder', 'ordenDeDibujo',
    'materia', 'scene', 'escena', 'input', 'entrada', 'motor', 'engine',
    'obtenerScript', 'getScript', 'destruir', 'destroy', 'instanciar', 'instantiate',
    'crear', 'create', 'estaActivado', 'activo',
    'tieneTag', 'hasTag', 'lanzarRayo', 'raycast', 'danar', 'damage', 'curar', 'heal',
    'difundir', 'broadcast', 'alRecibir', 'onReceive',
    'azar', 'random', 'seno', 'sin', 'coseno', 'cos', 'tangente', 'tan',
    'raizCuadrada', 'sqrt', 'redondear', 'round', 'piso', 'floor', 'techo', 'ceil',
    'absoluto', 'abs', 'limitar', 'clamp', 'distancia', 'distance', 'Vector2', 'Color'
];

function getDefaultValueForType(canonicalType) {
    switch (canonicalType) {
        case 'number':
             return 0;
        case 'string': return "";
        case 'boolean': return false;
        case 'Materia': return null;
        case 'Sprite': return null;
        case 'Audio': return null;
        case 'Prefab': return null;
        case 'Scene': return null;
        case 'Vector2': return { x: 0, y: 0 };
        case 'Color': return { r: 255, g: 255, b: 255, a: 1 };
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
 * Internal helper to transpile a block of code (expression or method body).
 */
function transpileBlock(block, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager) {
    let body = block;

    // 2.0: Handle 'cada' blocks (Simplified Timers)
    let cadaMatch;
    const cadaRegex = /\bcada\s*\(([^)]+)\)\s*{/g;
    while ((cadaMatch = cadaRegex.exec(body)) !== null) {
        const startIdx = cadaMatch.index;
        const contentStartIdx = cadaMatch.index + cadaMatch[0].length;
        let braceCount = 1;
        let endIdx = -1;

        for (let i = contentStartIdx; i < body.length; i++) {
            const char = body[i];
            const nextChar = body[i + 1];

            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                i++;
                while (i < body.length && body[i] !== quote) {
                    if (body[i] === '\\') i++;
                    i++;
                }
                continue;
            }
            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < body.length && body[i] !== '\n') i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < body.length && !(body[i] === '*' && body[i + 1] === '/')) i++;
                i++;
                continue;
            }

            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            const interval = cadaMatch[1];
            const cadaBody = body.substring(contentStartIdx, endIdx);
            const replacement = `this._runInterval(${interval}, async () => {${cadaBody}});`;
            body = body.substring(0, startIdx) + replacement + body.substring(endIdx + 1);
            cadaRegex.lastIndex = startIdx + replacement.length;
        }
    }

    // --- Protected String and Comment Extraction ---
    const protectedBlocks = [];
    body = body.replace(/(["'])(?:(?=(\\?))\2.)*?\1|\/\/.*|\/\*[\s\S]*?\*\//g, (match) => {
        protectedBlocks.push(match);
        return `__CES_PROT_${protectedBlocks.length - 1}__`;
    });

    // 2.a: Replace console shortcuts
    body = body.replace(/(?<![.\w])(imprimir|log)\s*\(/g, 'this._userLog(');

    // 2.b: Replace Spanish keywords
    body = body.replace(/(?<![.\w])si\s*\(/g, 'if (');
    body = body.replace(/(?<![.\w])sino\b/g, 'else');
    body = body.replace(/(?<![.\w])mientras\s*\(/g, 'while (');
    body = body.replace(/(?<![.\w])para\s*\(/g, 'for (');
    body = body.replace(/(?<![.\w])retornar\b/g, 'return');
    body = body.replace(/(?<![.\w])nuevo\b/g, 'new');
    body = body.replace(/(?<![.\w])funcion\b/g, 'function');
    body = body.replace(/(?<![.\w])verdadero\b/g, 'true');
    body = body.replace(/(?<![.\w])falso\b/g, 'false');
    body = body.replace(/(?<![.\w])variable\b/g, 'let');
    body = body.replace(/(?<![.\w])constante\b/g, 'const');

    // 2.c: Coroutines support
    body = body.replace(/(?<![.\w])esperar\s*\(/g, 'await this.esperar(');

    // 2.d: Simplified Prefab Syntax (crear miprefab -> await this.crear(this.miprefab))
    // We handle this before auto-prefixing shortcuts to catch the name correctly
    body = body.replace(/(?<!\w)(this\.)?(crear|create)\s+([a-zA-Z_]\w*)(?!\s*\()/g, (match, p1, p2, p3) => {
        return `await this.${p2}(this.${p3})`;
    });

    // 2.e: Auto-prefix component shortcuts
    componentShortcuts.forEach(shortcut => {
        const regex = new RegExp(`(?<![.\\w])\\b${shortcut}\\b`, 'g');
        body = body.replace(regex, `this.${shortcut}`);
    });

    // 2.e: Replace custom library function calls
    for (const libName of importedLibs) {
        const api = RuntimeAPIManager.getAPI(libName);
        if (!api) continue;
        for (const functionName in api) {
            const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
            const replacement = `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`;
            body = body.replace(regex, replacement);
        }
    }

    // 2.f: Auto-prefix public and private variables
    publicVars.forEach(pv => {
        const regex = new RegExp(`(?<![.\\w])\\b${pv.name}\\b`, 'g');
        body = body.replace(regex, `this.${pv.name}`);
    });
    privateVars.forEach(pv => {
        const regex = new RegExp(`(?<![.\\w])\\b${pv.name}\\b`, 'g');
        body = body.replace(regex, `this.${pv.name}`);
    });

    // --- Protected Block Restoration ---
    body = body.replace(/__CES_PROT_(\d+)__/g, (match, index) => {
        return protectedBlocks[parseInt(index)];
    });

    return body;
}

/**
 * Transpiles a .ces script into an ES6 class.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {{errors: string[] | null, jsCode: string | null}} An object with an errors array, or the generated JS code.
 */
export function transpile(code, scriptName) {
    const errors = [];
    let className = scriptName.replace(/\.(ces|chc)$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    // Asegurar que el nombre de la clase no empiece por un número
    if (/^[0-9]/.test(className)) {
        className = 'Script_' + className;
    }

    let publicVars = [];
    let privateVars = [];
    let startMethod = '';
    let startArgs = '';
    let updateMethod = '';
    let updateArgs = '';
    let publicFunctions = [];
    const importedLibs = new Set();

    // --- Phase 1: Parse and Rip Declarations ---
    // Order of operations is important here to avoid regex conflicts.
    // 1. Rip out methods first.
    // 2. Then rip out variables.
    // 3. Finally, handle imports.

    let unprocessedCode = code;

    // 1.a: Parse and extract methods (bilingual)
    // Scope (public/private) is now optional, defaults to public
    const methodHeaderRegex = /^\s*(?:(public|publico)\s+)?(?:(function|funcion)\s+)?(\w+)\s*\(([^)]*)\)\s*{/gm;
    const methodMatches = []; // Store matches to process later
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
            const char = tempCode[i];
            const nextChar = tempCode[i + 1];

            // Ignorar cadenas de texto (comillas simples, dobles o backticks)
            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                i++;
                while (i < tempCode.length && tempCode[i] !== quote) {
                    if (tempCode[i] === '\\') i++; // saltar carácter escapado
                    i++;
                }
                continue;
            }

            // Ignorar comentarios de una línea
            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < tempCode.length && tempCode[i] !== '\n') i++;
                continue;
            }

            // Ignorar comentarios multilínea
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < tempCode.length && !(tempCode[i] === '*' && tempCode[i + 1] === '/')) i++;
                i++; // saltar el asterisco
                continue;
            }

            if (char === '{') braceCount++;
            else if (char === '}') {
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

        if (isFunction) {
            publicFunctions.push(name);
        }
        methodMatches.push({ name, args, body });

        // Blank out the matched method to prevent it from being processed again
        unprocessedCode = unprocessedCode.replace(fullMethodText, '');
    }


    // 1.b: Parse and remove public and private variables (fully bilingual with new syntax)
    // Scope is optional, defaults to public
    const varRegex = /^\s*(?:(public|private|publico|privado)\s+)?([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)\s*(?:=\s*(.+))?;/gm;
    let varMatch;
    while ((varMatch = varRegex.exec(unprocessedCode)) !== null) {
        const scopeMatch = varMatch[1] || 'public';
        const scope = scopeMatch.replace('publico', 'public').replace('privado', 'private');
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

     // 1.c: Parse and validate library imports.
    const goRegex = /^\s*go\s+(?:"([^"]+)"|((?:ce\.)?\w+))/gm;
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
        publicVars: publicVars.map(pv => ({ name: pv.name, type: pv.type, defaultValue: pv.defaultValue })),
        publicFunctions: publicFunctions
    };
    scriptMetadataMap.set(scriptName, metadata);


    // --- Phase 2: Transpile method bodies ---
    for (const match of methodMatches) {
        let { name, args, body } = match;

        body = transpileBlock(body, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager);

        // 2.g: Map Spanish lifecycle methods to their English counterparts
        if (name === 'iniciar' || name === 'alEmpezar') name = 'start';
        if (name === 'actualizar' || name === 'alActualizar') name = 'update';

        if (name === 'start') {
            startMethod = body;
            startArgs = args;
        } else if (name === 'update') {
            updateMethod = body;
            updateArgs = args;
        }

        match.name = name;
        match.body = body;
    }

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
        let val = pv.value ? transpileBlock(pv.value, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager) : JSON.stringify(pv.defaultValue);
        // Replace Spanish booleans in default values (fallback for non-transpiled parts)
        val = val.replace(/\bverdadero\b/g, 'true').replace(/\bfalso\b/g, 'false');
        jsCode += `            this.${pv.name} = ${val}; // Type: ${pv.type}\n`;
    });
    privateVars.forEach(pv => {
        let val = pv.value ? transpileBlock(pv.value, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager) : 'null';
        val = val.replace(/\bverdadero\b/g, 'true').replace(/\bfalso\b/g, 'false');
        jsCode += `            this.${pv.name} = ${val};\n`;
    });
    jsCode += `        }\n\n`;

    const indentBody = (body) => body ? body.trim().split('\n').map(line => `            ${line.trim()}`).join('\n') : '';

    jsCode += `        async start(${startArgs}) {\n${indentBody(startMethod)}\n        }\n\n`;
    jsCode += `        async update(${updateArgs || 'deltaTime'}) {\n${indentBody(updateMethod)}\n        }\n\n`;

    // Process custom methods to be async too
    const processedCustomMethods = methodMatches
        .filter(m => m.name !== 'start' && m.name !== 'update')
        .map(m => `        async ${m.name}(${m.args}) {\n${indentBody(m.body)}\n        }\n`)
        .join('\n');

    jsCode += `${processedCustomMethods}\n`;

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

export function getAllTranspiledCode() {
    return Object.fromEntries(transpiledCodeMap);
}

export function getAllMetadata() {
    return Object.fromEntries(scriptMetadataMap);
}
