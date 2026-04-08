import { examples, intentWeights, structuralRules, typeInference, logicPatterns, expensivePatterns } from './AutoReparatorData.js';
import { getAllVariations, syncIfEmpty } from './AutoReparatorStore.js';
import { transpile } from './CES_Transpiler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

/**
 * Auto Reparator Module v4.6 "Truly Intelligent Expert Brain"
 * Analyzes and fixes common syntax errors and misspellings in CES scripts using advanced surgery.
 * Now scales to 2000+ logic variations using IndexedDB.
 */
export async function repair(code, fileName, runtimeError = null) {
    await syncIfEmpty(examples);
    const persistentExamples = await getAllVariations();
    const activeExamples = persistentExamples.length > 0 ? persistentExamples : examples;

    const prefs = getPreferences();
    const isSmartEnabled = prefs.autoCorrectorInteligente !== false;
    const userLang = (prefs.language || 'es').toLowerCase();

    let repairedCode = code;
    const L = window.Localization || { get: (k, d) => d };

    console.log("[AutoReparator v4.6] Iniciando reparación de " + fileName + "...");

    // --- 1. Variable Declaration Healer ---
    if (isSmartEnabled) {
        const lines = repairedCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const decRegex = /^(publico|variable|constante)\s+(\w+)\s+(\w+)\s+([^=;{}()]+);?$/i;
            const match = line.match(decRegex);
            if (match) {
                lines[i] = match[1] + " " + match[2] + " " + match[3] + " = " + match[4].trim() + ";";
            }
        }
        repairedCode = lines.join('\n');
    }

    // --- 2. Pre-Substitution cleanup (Physics Typos) ---
    if (isSmartEnabled) {
        repairedCode = repairedCode.replace(/=\+/g, '= ');
        repairedCode = repairedCode.replace(/=-/g, '= -');
        repairedCode = repairedCode.replace(/\b(ve|go|engine|motor)\s+(ve|go|engine|motor)\b/gi, '$1');
    }

    // --- 3. Smart Keyword Substitutions (Core) ---
    const substitutions = {
        'funcion': ['funsion', 'fucion', 'funcio', 'function', 'função', 'функция', '函数'],
        'publico': ['public', 'pubico', 'público', 'bublico', 'bublica', 'piblico', 'piblica', 'открытый', '公开'],
        'variable': ['var', 'variabke', 'virable', 'variável'],
        'numero': ['num', 'nmero', 'número', 'numeto', 'число', '数字'],
        'texto': ['string', 'text', 'текст', '文本'],
        'booleano': ['bool', 'boolean', 'булево', '布尔值'],
        'verdadero': ['true', 'verdedero', 'истина', '真'],
        'falso': ['false', 'falsoo', 'ложь', '假'],
        'si': ['if', 'se', 'если', '如果'],
        'sino': ['else', 'senão', 'inacne', 'otherwise', 'else if', '否则'],
        'retornar': ['return', 'vernut', '返回'],
        've motor;': ['go motor', 'engine motor', 'import motor', '引擎'],
        'alActualizar': ['actualizar', 'alactualizar', 'onUpdate', 'update', 'atualizar', 'обновить', '更新'],
        'alEmpezar': ['alInicio', 'alempezar', 'onStart', 'start', 'iniciar', 'começar', 'начать', '开始'],
        'materia': ['objeto', 'mtr', 'this', 'matéria', 'материя', '物质'],
        'posicion': ['position', 'pos', 'posição', 'позиция', '位置'],
        'fisica': ['physics', 'rigidbody', 'física', 'физика', '物理'],
        'imprimir': ['log', 'print', 'console.log', 'вывод', '打印'],
        'teclaPresionada': ['teclaPrecionada', 'teclaPrecionda', 'teclaPressionada', 'isKeyPressed'],
        'teclaRecienPresionada': ['teclaRecienPrecionada', 'teclaRecienPrecionda', 'teclaRecemPressionada', 'isKeyJustPressed'],
        'instanciar': ['instantiate', 'crear', 'criar', 'создать', '创建'],
        'velocidad': ['speed', 'velocity'],
        'proyectil': ['projectile']
    };

    const runSubstitutions = (code) => {
        let result = code;
        for (const [correct, wrongList] of Object.entries(substitutions)) {
            for (const wrong of wrongList) {
                const regex = new RegExp("\\b" + (wrong.endsWith(';') ? wrong.slice(0,-1) : wrong) + "\\b;?", 'gi');
                if (correct === 've motor;') {
                    const clean = stripCommentsAndStrings(result).toLowerCase();
                    const headerCount = (clean.match(/\b(ve|go|motor|engine)\s+motor\b/g) || []).length;
                    if (headerCount > 1) { result = result.replace(regex, ""); continue; }
                }
                result = result.replace(regex, correct);
            }
        }
        return result;
    };

    repairedCode = runSubstitutions(repairedCode);

    if (isSmartEnabled) {
        const clean = stripCommentsAndStrings(repairedCode).toLowerCase();
        if (!clean.includes('ve motor')) {
            repairedCode = repairedCode.replace(/(?<!\b(ve|go|motor|engine)\s+)\b(motor|engine)\b;?/gi, "ve motor;");
        }
    }

    // --- 4. Intent Detection ---
    const codeWords = repairedCode.toLowerCase().match(/\w+/g) || [];
    let bestIntent = 'desconocido';
    let maxIntentScore = 0;
    for (const [intent, config] of Object.entries(intentWeights)) {
        let score = 0;
        config.keywords.forEach(k => { if (codeWords.includes(k)) score += 2; });
        if (intent === 'fisica' && (repairedCode.includes('applyImpulse') || repairedCode.includes('velocity'))) score += 10;
        if (score > maxIntentScore) { maxIntentScore = score; bestIntent = intent; }
    }

    // --- 5. Physics Converter (v4.6 Enhanced) ---
    if (isSmartEnabled && (bestIntent === 'movimiento' || bestIntent === 'fisica')) {
        const lines = repairedCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!/^(publico|variable|constante|ve)/i.test(trimmed)) {
                lines[i] = lines[i].replace(/\b(fisicaX|velocidadX|velocityX)\b/g, 'fisica.velocidad.x');
                lines[i] = lines[i].replace(/\b(fisicaY|velocidadY|velocityY)\b/g, 'fisica.velocidad.y');
                lines[i] = lines[i].replace(/\b(voltearH|flipX)\b/g, 'voltearH');
                lines[i] = lines[i].replace(/\b(voltearV|flipY)\b/g, 'voltearV');
            } else if (/\b(fisicaX|fisicaY|velocidadX|velocidadY|velocityX|velocityY|voltearH|voltearV|flipX|flipY)\b/i.test(trimmed)) {
                lines[i] = "// [Creative Code] Redundante: " + trimmed;
            }
        }
        repairedCode = lines.join('\n');
    }

    // --- 6. Function Call Healer ---
    if (isSmartEnabled) {
        const functionsToHeal = ['teclaPresionada', 'teclaRecienPresionada', 'imprimir', 'esperar', 'cada', 'instanciar', 'destruir', 'buscar', 'difundir'];
        const lines = repairedCode.split('\n');
        for(let i=0; i<lines.length; i++) {
            functionsToHeal.forEach(fn => {
                const regex = new RegExp("\\b" + fn + "\\s+(['\"`\\w])", 'g');
                if (regex.test(lines[i])) {
                    if (!lines[i].includes(fn + "(")) lines[i] = lines[i].replace(regex, fn + "($1");
                    const lineOpen = (lines[i].match(/\(/g) || []).length;
                    const lineClose = (lines[i].match(/\)/g) || []).length;
                    if (lineOpen > lineClose) {
                        if (lines[i].includes('{')) lines[i] = lines[i].replace(/\s*{/, ") {");
                        else if (lines[i].includes(';')) lines[i] = lines[i].replace(/;/, ");");
                        else lines[i] = lines[i].trimEnd() + ")";
                    }
                }
            });
        }
        repairedCode = lines.join('\n');
    }

    // --- 7. Smart Auto-Declaration (Truly Intelligent v4.6 Enhanced) ---
    if (isSmartEnabled) {
        const undeclared = detectUndeclaredVariables(repairedCode);
        if (undeclared.length > 0) {
            let declarations = "";
            undeclared.forEach(v => {
                const type = inferVariableType(v, repairedCode);
                const blacklist = [
                    'alActualizar', 'alEmpezar', 'teclaPresionada', 'teclaRecienPresionada',
                    'fisica', 'posicion', 'rotacion', 'escala', 'delta', 'velocidad', 'velocity', 'speed',
                    'proyectil', 'projectile', 'voltearH', 'voltearV', 'renderizadorDeSprite', 'fuenteDeAudio',
                    'animador', 'lienzo', 'uiBarra', 'tiempoDelta', 'azar', 'instanciar', 'destruir', 'lanzarRayo',
                    'buscar', 'cargarEscena', 'difundir', 'obtenerPosicionMouse', 'verdadero', 'falso', 'nulo',
                    'fisicaX', 'fisicaY', 'velocidadX', 'velocidadY', 'velocityX', 'velocityY', 'flipX', 'flipY'
                ];
                if (!blacklist.includes(v)) declarations += "publico " + type + " " + v + ";\n";
            });
            const headerMatch = repairedCode.match(/^(ve|go|engine|motor)\s+motor;?/mi);
            if (headerMatch) {
                const insertPos = headerMatch.index + headerMatch[0].length;
                repairedCode = repairedCode.substring(0, insertPos) + '\n' + declarations + repairedCode.substring(insertPos);
            } else {
                repairedCode = declarations + repairedCode;
            }
        }
    }

    // --- 8. Logic Pattern Completion (v4.6 Bilingual) ---
    if (isSmartEnabled) {
        logicPatterns.forEach(pattern => {
            if (pattern.trigger.test(repairedCode)) {
                const missingElements = pattern.elements.filter(el => !(new RegExp(el, 'i').test(repairedCode)));
                if (missingElements.length > 0 && missingElements.length <= 3) {
                    const targetLifecycle = (pattern.preferredLifecycle === 'alActualizar' && !repairedCode.includes('alActualizar') && repairedCode.includes('update')) ? 'update' :
                                           (pattern.preferredLifecycle === 'alEmpezar' && !repairedCode.includes('alEmpezar') && repairedCode.includes('start')) ? 'start' :
                                           (pattern.preferredLifecycle || 'alActualizar');

                    const methodRegex = new RegExp(targetLifecycle + "\\s*\\([^)]*\\)\\s*{", 'i');
                    const match = repairedCode.match(methodRegex);
                    if (match) {
                        const startIdx = match.index + match[0].length;
                        let braceCount = 1, endIdx = -1;
                        for (let j = startIdx; j < repairedCode.length; j++) {
                            if (repairedCode[j] === '{') braceCount++;
                            else if (repairedCode[j] === '}') { braceCount--; if (braceCount === 0) { endIdx = j; break; } }
                        }
                        if (endIdx !== -1 && !repairedCode.includes("Sugerencia: " + pattern.name)) {
                            const snippetCode = typeof pattern.completion === 'object' ? (pattern.completion[userLang] || pattern.completion['es']) : pattern.completion;
                            const snippet = "\n    // [Creative Code] Sugerencia: " + pattern.name + "\n    " + snippetCode + "\n";
                            repairedCode = repairedCode.substring(0, endIdx) + snippet + repairedCode.substring(endIdx);
                        }
                    }
                }
            }
        });

        // 8b. Performance Mentoring
        expensivePatterns.forEach(rule => {
            if (rule.pattern.test(repairedCode)) {
                const msg = typeof rule.message === 'object' ? (rule.message[userLang] || rule.message['es']) : rule.message;
                if (!repairedCode.includes(msg.substring(0, 20))) {
                    const insertIdx = repairedCode.indexOf('alActualizar') !== -1 ? repairedCode.indexOf('alActualizar') : (repairedCode.indexOf('update') !== -1 ? repairedCode.indexOf('update') : 0);
                    repairedCode = repairedCode.substring(0, insertIdx) + "// " + msg + "\n" + repairedCode.substring(insertIdx);
                }
            }
        });
    }

    // --- 9. Post-processing Substitutions ---
    repairedCode = runSubstitutions(repairedCode);

    // --- 10. Garbage Cleaner ---
    if (isSmartEnabled) {
        const lines = repairedCode.split('\n');
        const dontTouch = [...structuralRules.allowedGlobalScope, ...structuralRules.lifecycleMethods,
                          'delta', 'deltaTime', 'mtr', 'materia', 'retornar', 'esperar', 'detener', 'verdadero', 'falso'];
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed === ';' || trimmed === 've;' || trimmed === 'go;' || trimmed === 'motor;') { lines[i] = ""; continue; }
            if (/^[a-z_][a-z0-9_]*;?$/i.test(trimmed)) {
                const word = trimmed.replace(';', '');
                if (!dontTouch.includes(word) && isNaN(word) && word.length > 0) {
                    lines[i] = lines[i].replace(word, "// [Creative Code REMOVED] " + word);
                }
            }
        }
        repairedCode = lines.join('\n');
    }

    // --- 11. Final Mandatory Header & Cleanup ---
    const finalClean = stripCommentsAndStrings(repairedCode).toLowerCase();
    if (!finalClean.includes('ve motor')) {
        repairedCode = structuralRules.mandatoryHeader + '\n' + repairedCode;
    }

    repairedCode = repairedCode.replace(/;;+/g, ';');
    repairedCode = repairedCode.replace(/\n\s*\n\s*\n/g, '\n\n');

    // --- 12. Syntax Healer ---
    if (isSmartEnabled) repairedCode = healSyntaxStructure(repairedCode);

    // --- 13. Safety Eraser (Bulletproof v4.6 Enhanced) ---
    if (isSmartEnabled) {
        let attempts = 0;
        let finalSuccess = false;
        while (attempts < 3 && !finalSuccess) {
            const validation = transpile(repairedCode, fileName);
            if (validation.errors && validation.errors.length > 0) {
                const lines = repairedCode.split('\n');
                validation.errors.forEach(err => {
                    const idx = err.line - 1;
                    if (lines[idx] && !lines[idx].trim().startsWith("//") && !lines[idx].includes("{") && !lines[idx].includes("}")) {
                        console.log("[Safety Eraser] Comentando línea errónea persistente: " + lines[idx]);
                        lines[idx] = "// [Creative Code REMOVED due to Error] " + lines[idx].trim();
                    }
                });
                repairedCode = lines.join('\n');
                attempts++;
            } else {
                finalSuccess = true;
            }
        }
    }

    const finalValidation = transpile(repairedCode, fileName);
    const success = !finalValidation.errors || finalValidation.errors.length === 0;
    return {
        success,
        code: repairedCode,
        message: success ? L.get('REPARACION_EXITOSA', 'Código reparado con éxito por Expert Brain (v4.6).') : L.get('REPARACION_PARCIAL', 'Se realizaron correcciones, pero el script requiere intervención manual.')
    };
}

function stripCommentsAndStrings(code) {
    return code.replace(/(["'])(?:(?=(\\?))\2.)*?\1|\/\/.*|\/\*[\s\S]*?\*\//g, (match) => " ".repeat(match.length));
}

function detectUndeclaredVariables(code) {
    const cleanCode = stripCommentsAndStrings(code);
    const declared = new Set();
    const declarationRegex = /\b(publico|privado|variable|constante)\s+([\w\u00C0-\u017F]+)(?:\s+([\w\u00C0-\u017F]+))?/g;
    let match;
    while ((match = declarationRegex.exec(cleanCode)) !== null) {
        if (match[1] === 'variable' || match[1] === 'constante') declared.add(match[2]);
        else if (match[3]) declared.add(match[3]);
    }
    const engineKeywords = [
        'posicion', 'fisica', 'materia', 'mtr', 'delta', 'otro', 'datos', 'reproducir', 'imprimir', 'esperar', 'cada',
        'nuevo', 'Vector2', 'azar', 'si', 'sino', 'retornar', 'verdadero', 'falso', 'rotacion', 'escala', 'renderizadorDeSprite',
        'fuenteDeAudio', 'animador', 'lienzo', 'uiBarra', 'tiempoDelta', 'absoluto', 'seno', 'coseno', 'distancia', 'instanciar',
        'destruir', 'lanzarRayo', 'buscar', 'cargarEscena', 'difundir', 'teclaPresionada', 'teclaRecienPresionada', 'obtenerPosicionMouse',
        'publico', 'privado', 'variable', 'constante', 've', 'motor', 'engine', 'go',
        'position', 'physics', 'other', 'data', 'play', 'log', 'wait', 'every',
        'new', 'random', 'if', 'else', 'return', 'true', 'false', 'rotation', 'scale', 'spriteRenderer',
        'audioSource', 'animator', 'canvas', 'uiBar', 'deltaTime', 'abs', 'sin', 'cos', 'distance', 'instantiate',
        'destroy', 'raycast', 'find', 'loadScene', 'broadcast', 'isKeyPressed', 'isKeyJustPressed', 'getMousePosition',
        'alActualizar', 'alEmpezar', 'update', 'start', 'velocidad', 'velocity', 'speed'
    ];
    engineKeywords.forEach(k => declared.add(k));
    const potentialVars = new Set();
    const usageRegex = /(?<![.\w])\b([a-zA-Z_\u00C0-\u017F][\w\u00C0-\u017F]*)\b(?!\s*\()/g;
    while ((match = usageRegex.exec(cleanCode)) !== null) {
        const word = match[1];
        if (!declared.has(word) && isNaN(word) && word.length > 1) potentialVars.add(word);
    }
    return Array.from(potentialVars);
}

function inferVariableType(varName, code) {
    const cleanCode = stripCommentsAndStrings(code);
    for (const rule of typeInference) if (rule.regex.test(varName)) return rule.type;
    const assignmentRegex = new RegExp("\\b" + varName + "\\b\\s*=\\s*([^;\\n]+)", 'i');
    const match = cleanCode.match(assignmentRegex);
    if (match) {
        const value = match[1].trim();
        if (value.startsWith('"') || value.startsWith("'")) return 'texto';
        if (value === 'verdadero' || value === 'falso' || value === 'true' || value === 'false') return 'booleano';
        if (!isNaN(parseFloat(value))) return 'numero';
    }
    return 'numero';
}

function healSyntaxStructure(code) {
    let result = code;
    const count = (str, char) => (str.split(char).length - 1);
    const openParen = count(result, '('), closeParen = count(result, ')');
    if (openParen > closeParen) {
        const lines = result.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineOpen = count(line, '(');
            const lineClose = count(line, ')');
            if (lineOpen > lineClose) {
                if (line.includes('{')) lines[i] = line.replace(/\s*{/, ")".repeat(lineOpen - lineClose) + " {");
                else if (line.includes(';')) lines[i] = line.replace(/;/, ")".repeat(lineOpen - lineClose) + ";");
                else lines[i] = line + ")".repeat(lineOpen - lineClose);
            }
        }
        result = lines.join('\n');
    }
    let lines = result.split('\n'), braceLevel = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceLevel += count(line, '{');
        if (line.includes('}')) braceLevel -= count(line, '}');
    }
    if (braceLevel > 0) {
        result += "\n// [Syntax Healer] Bloque cerrado automáticamente";
        for (let j = 0; j < braceLevel; j++) result += '\n}';
    } else if (braceLevel < 0) {
        for (let j = 0; j < Math.abs(braceLevel); j++) {
            const lastBraceIdx = result.lastIndexOf('}');
            if (lastBraceIdx !== -1) result = result.substring(0, lastBraceIdx) + result.substring(lastBraceIdx + 1);
        }
    }
    return result;
}
