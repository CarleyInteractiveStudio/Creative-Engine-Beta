import { examples, intentWeights, structuralRules, typeInference, logicPatterns, expensivePatterns } from './AutoReparatorData.js';
import { getAllVariations, syncIfEmpty } from './AutoReparatorStore.js';
import { transpile } from './CES_Transpiler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

/**
 * Auto Reparator Module v4.5 "Persistent Expert Brain"
 * Analyzes and fixes common syntax errors and misspellings in CES scripts using advanced surgery.
 * Now scales to 1500+ logic variations using IndexedDB.
 */
export async function repair(code, fileName, runtimeError = null) {
    // Lazy sync/load from store
    await syncIfEmpty(examples);
    const persistentExamples = await getAllVariations();
    const activeExamples = persistentExamples.length > 0 ? persistentExamples : examples;

    const prefs = getPreferences();
    const isSmartEnabled = prefs.autoCorrectorInteligente !== false; // Default true
    const userLang = (prefs.language || 'es').toLowerCase();

    let repairedCode = code;
    // Safety check for Localization during early boot sequence
    const L = window.Localization || { get: (k, d) => d };

    console.log(`[AutoReparator v4] Iniciando reparación de ${fileName} (Smart: ${isSmartEnabled})...`);

    // --- 1. Top-to-Bottom Analysis: scan declarations first ---
    const cleanCodeForDeclarations = stripCommentsAndStrings(repairedCode);
    const declaredVariables = detectUndeclaredVariables(repairedCode);

    // --- 2. Runtime Error analysis ---
    if (runtimeError && runtimeError.message) {
        console.log("[AutoReparator] Analizando error de ejecución:", runtimeError.message);

        // Check for missing components based on typical crash patterns
        const missingComps = [
            { key: 'velocity', comp: 'Rigidbody2D', name: 'fisica' },
            { key: 'applyImpulse', comp: 'Rigidbody2D', name: 'fisica' },
            { key: 'addForce', comp: 'Rigidbody2D', name: 'fisica' },
            { key: 'fisica', comp: 'Rigidbody2D', name: 'fisica' },
            { key: 'animador', comp: 'Animator', name: 'animador' },
            { key: 'animacion', comp: 'Animator', name: 'animador' },
            { key: 'play', comp: 'Animator', name: 'animador' },
            { key: 'stop', comp: 'Animator', name: 'animador' },
            { key: 'renderizadorDeSprite', comp: 'SpriteRenderer', name: 'renderizadorDeSprite' },
            { key: 'color', comp: 'SpriteRenderer', name: 'renderizadorDeSprite' },
            { key: 'AudioSource', comp: 'AudioSource', name: 'audio' },
            { key: 'fuenteDeAudio', comp: 'AudioSource', name: 'audio' },
            { key: 'reproducir', comp: 'AudioSource', name: 'audio' },
            { key: 'sonido', comp: 'AudioSource', name: 'audio' }
        ];

        for (const check of missingComps) {
            if (runtimeError.message.includes(check.key) || runtimeError.message.includes(`'${check.name}'`)) {
                return {
                    success: true,
                    code: code,
                    message: `⚠️ Falta el componente '${check.comp}' en '${runtimeError.materiaName}'. ¿Quieres que lo añada por ti?`,
                    addComponent: {
                        materiaId: runtimeError.materiaId,
                        componentType: check.comp
                    }
                };
            }
        }

        // Suggest fix for "is not defined"
        if (runtimeError.message.includes('is not defined')) {
            const undefinedVar = runtimeError.message.split(' ')[0];
            const allWords = Array.from(new Set(repairedCode.match(/[a-zA-Z_\u00C0-\u017F][\w\u00C0-\u017F]*/g)));
            const bestMatch = allWords.find(w => {
                if (Math.abs(w.length - undefinedVar.length) > 1) return false;
                let diffs = 0;
                const minLen = Math.min(w.length, undefinedVar.length);
                for(let i=0; i<minLen; i++) if (w[i] !== undefinedVar[i]) diffs++;
                return diffs <= 1;
            });

            if (bestMatch && bestMatch !== undefinedVar) {
                console.log(`[AutoReparator] Corrigiendo probable typo: ${undefinedVar} -> ${bestMatch}`);
                repairedCode = repairedCode.replace(new RegExp(`\\b${undefinedVar}\\b`, 'g'), bestMatch);
            }
        }
    }

    // --- 3. Smart Keyword Substitutions ---
    const substitutions = {
        'funcion': ['funsion', 'fucion', 'funcio', 'function', 'função', 'функция', '函数'],
        'publico': ['public', 'pubico', 'público', 'открытый', '公开'],
        'variable': ['var', 'variabke', 'virable', 'variável'],
        'numero': ['num', 'nmero', 'número', 'число', '数字'],
        'texto': ['string', 'text', 'текст', '文本'],
        'booleano': ['bool', 'boolean', 'булево', '布尔值'],
        'verdadero': ['true', 'verdedero', 'истина', '真'],
        'falso': ['false', 'falsoo', 'ложь', '假'],
        'si': ['if', 'se', 'если', '如果'],
        'sino': ['else', 'senão', 'иначе', '否则'],
        'retornar': ['return', 'vernut', '返回'],
        've motor;': ['ve motor', 'go motor', 'engine', 'import motor', 'motor;', '引擎'],
        'alActualizar': ['actualizar', 'alactualizar', 'onUpdate', 'update', 'atualizar', 'обновить', '更新'],
        'alEmpezar': ['alInicio', 'alempezar', 'onStart', 'start', 'iniciar', 'começar', 'начать', '开始'],
        'materia': ['objeto', 'mtr', 'this', 'matéria', 'материя', '物质'],
        'posicion': ['position', 'pos', 'posição', 'позиция', '位置'],
        'fisica': ['physics', 'rigidbody', 'física', 'физика', '物理'],
        'imprimir': ['log', 'print', 'console.log', 'вывод', '打印']
    };

    for (const [correct, wrongList] of Object.entries(substitutions)) {
        for (const wrong of wrongList) {
            const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
            repairedCode = repairedCode.replace(regex, correct);
        }
    }

    // --- 4. Garbage Cleaner (Advanced) ---
    if (isSmartEnabled) {
        const lines = repairedCode.split('\n');
        const dontTouch = [...structuralRules.allowedGlobalScope, ...structuralRules.lifecycleMethods,
                          'delta', 'deltaTime', 'mtr', 'materia', 'retornar', 'esperar', 'detener', 'verdadero', 'falso'];

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            // Match single word (optional semicolon) on its own line, ignoring comments and declarations
            if (/^[a-z_][a-z0-9_]*;?$/i.test(trimmed)) {
                const word = trimmed.replace(';', '');
                if (!dontTouch.includes(word) && isNaN(word) && word.length > 0) {
                    console.log(`[Creative Code v4] Limpiando identificador basura: ${word}`);
                    lines[i] = lines[i].replace(word, `// [Creative Code REMOVED] ${word}`);
                }
            }
        }
        repairedCode = lines.join('\n');
    }

    // --- 5. Mandatory Header ---
    if (!stripCommentsAndStrings(repairedCode).toLowerCase().includes(structuralRules.mandatoryHeader)) {
        repairedCode = structuralRules.mandatoryHeader + '\n' + repairedCode;
    }

    // --- 6. Smart Intent Detection ---
    console.log("[AutoReparator] Analizando intención semántica...");
    let bestIntent = 'desconocido';
    let maxIntentScore = 0;
    const codeWords = repairedCode.toLowerCase().match(/\w+/g) || [];

    for (const [intent, config] of Object.entries(intentWeights)) {
        let score = 0;
        config.keywords.forEach(k => {
            if (codeWords.includes(k)) score += 2;
        });

        if (intent === 'fisica' && repairedCode.includes('applyImpulse')) score += 10;
        if (intent === 'salud' && repairedCode.includes('danar')) score += 10;
        if (intent === 'ui' && repairedCode.includes('uiBarra')) score += 10;

        if (score > maxIntentScore) {
            maxIntentScore = score;
            bestIntent = intent;
        }
    }

    // --- 7. Smart Auto-Declaration (Top-to-Bottom aware) ---
    if (isSmartEnabled) {
        const undeclared = detectUndeclaredVariables(repairedCode);
        if (undeclared.length > 0) {
            console.log("[AutoReparator] Detectadas variables no declaradas:", undeclared);
            let declarations = "";
            undeclared.forEach(v => {
                const type = inferVariableType(v, repairedCode);
                declarations += `publico ${type} ${v};\n`;
            });
            const cleanCode = stripCommentsAndStrings(repairedCode);
            const headerMatch = cleanCode.toLowerCase().match(new RegExp(structuralRules.mandatoryHeader, 'i'));
            if (headerMatch) {
                const insertPos = headerMatch.index + headerMatch[0].length;
                repairedCode = repairedCode.substring(0, insertPos) + '\n' + declarations + repairedCode.substring(insertPos);
            } else {
                repairedCode = structuralRules.mandatoryHeader + '\n' + declarations + repairedCode;
            }
        }
    }

    // --- 8. Advanced Surgery Pass (Similarity Matcher) ---
    const lines = repairedCode.split('\n');
    let surgeryApplied = false;
    for (let i = 0; i < lines.length; i++) {
        const badLine = lines[i].trim();
        if (!badLine || badLine.startsWith('//') || badLine.includes('{') || badLine.includes('}')) continue;

        // Skip declarations and known keywords
        if (/^(publico|variable|constante|ve|go|alEmpezar|alActualizar|si|sino|retornar)/i.test(badLine)) continue;

        // Check if the line has syntax errors via mini-transpilation
        const miniResult = transpile(`ve motor;\nalActualizar(delta) { ${badLine} }`, 'test.ces');
        if (miniResult.errors && miniResult.errors.length > 0) {
            let bestFix = null;
            let maxSimilarity = 0;

            // Similarity check against all examples' lines
            activeExamples.forEach(ex => {
                // Filter by language to ensure we suggest code in the user's preferred language
                if (ex.lang && ex.lang !== userLang) return;

                const exLines = ex.code.split('\n');
                exLines.forEach(exLine => {
                    const trimmedExLine = exLine.trim();
                    if (trimmedExLine.length < 5 || trimmedExLine.includes('{') || trimmedExLine.startsWith('ve ')) return;

                    const words1 = badLine.toLowerCase().match(/\w+/g) || [];
                    const words2 = trimmedExLine.toLowerCase().match(/\w+/g) || [];
                    const set1 = new Set(words1);
                    const set2 = new Set(words2);
                    const intersection = new Set([...set1].filter(x => set2.has(x)));

                    const similarity = intersection.size / Math.max(set1.size, set2.size);
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        bestFix = trimmedExLine;
                    }
                });
            });

            if (bestFix && maxSimilarity > 0.6) {
                console.log(`[Surgery v4] Corrigiendo línea ${i + 1}: ${badLine} -> ${bestFix}`);
                lines[i] = lines[i].replace(badLine, bestFix);
                surgeryApplied = true;
            }
        }
    }
    if (surgeryApplied) repairedCode = lines.join('\n');

    // --- 9. Logic Pattern Completion & Lifecycle Aware Insertion ---
    if (isSmartEnabled) {
        logicPatterns.forEach(pattern => {
            if (pattern.trigger.test(repairedCode)) {
                const missingElements = pattern.elements.filter(el => !(new RegExp(el, 'i').test(repairedCode)));
                if (missingElements.length > 0 && missingElements.length <= 3) {
                    const targetLifecycle = pattern.preferredLifecycle || 'alActualizar';

                    // Lifecycle aware insertion: find the method body
                    const methodRegex = new RegExp(`${targetLifecycle}\\s*\\([^)]*\\)\\s*{`, 'i');
                    const match = repairedCode.match(methodRegex);

                    if (match) {
                        const startIdx = match.index + match[0].length;
                        // Simple brace counting to find the end of the method
                        let braceCount = 1;
                        let endIdx = -1;
                        for (let j = startIdx; j < repairedCode.length; j++) {
                            if (repairedCode[j] === '{') braceCount++;
                            else if (repairedCode[j] === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    endIdx = j;
                                    break;
                                }
                            }
                        }

                        if (endIdx !== -1) {
                            const snippet = `\n    // [Creative Code] Sugerencia: ${pattern.name}\n    ${pattern.completion}\n`;
                            repairedCode = repairedCode.substring(0, endIdx) + snippet + repairedCode.substring(endIdx);
                        }
                    } else if (repairedCode.length < 500) {
                        // Create method if it doesn't exist and script is small
                        repairedCode += `\n\n${targetLifecycle}(delta) {\n    // [Creative Code] Sugerencia: ${pattern.name}\n    ${pattern.completion}\n}`;
                    }
                }
            }
        });
    }

    // --- 10. Performance Mentor ---
    if (isSmartEnabled) {
        expensivePatterns.forEach(rule => {
            if (rule.pattern.test(repairedCode)) {
                const lines = repairedCode.split('\n');
                let inUpdate = false;
                for (let i=0; i<lines.length; i++) {
                    if (/alActualizar/i.test(lines[i])) inUpdate = true;
                    if (inUpdate && rule.pattern.test(lines[i])) {
                        const msg = typeof rule.message === 'object' ? (rule.message[userLang] || rule.message['es']) : rule.message;
                        lines[i] = `// ${msg}\n${lines[i]}`;
                        break;
                    }
                }
                repairedCode = lines.join('\n');
            }
        });
    }

    // --- 11. Syntax Healer ---
    if (isSmartEnabled) {
        repairedCode = healSyntaxStructure(repairedCode);
    }

    // --- 12. Final Validation ---
    const finalValidation = transpile(repairedCode, fileName);
    const success = !finalValidation.errors || finalValidation.errors.length === 0;

    let finalMessage = success ? L.get('REPARACION_EXITOSA', 'Código reparado con éxito por Expert Brain (v4.5).') : L.get('REPARACION_PARCIAL', 'Se realizaron correcciones, pero el script requiere intervención manual.');

    return {
        success: success,
        code: repairedCode,
        message: finalMessage
    };
}

function stripCommentsAndStrings(code) {
    return code.replace(/(["'])(?:(?=(\\?))\2.)*?\1|\/\/.*|\/\*[\s\S]*?\*\//g, (match) => {
        return " ".repeat(match.length);
    });
}

function detectUndeclaredVariables(code) {
    const cleanCode = stripCommentsAndStrings(code);
    const declared = new Set();
    const declarationRegex = /\b(publico|privado|variable|constante)\s+[\w\u00C0-\u017F]+\s+([\w\u00C0-\u017F]+)/g;
    let match;
    while ((match = declarationRegex.exec(cleanCode)) !== null) {
        declared.add(match[2]);
    }
    const functionRegex = /\b(funcion|alActualizar|alEmpezar|alEntrarEnColision|alHacerClick|alRecibir)\s*([\w\u00C0-\u017F]+)?\s*\(([^)]*)\)/g;
    while ((match = functionRegex.exec(cleanCode)) !== null) {
        if (match[2]) declared.add(match[2]);
        if (match[3]) {
            match[3].split(',').forEach(p => {
                const param = p.trim().split(/\s+/).pop();
                if (param) declared.add(param);
            });
        }
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
        'destroy', 'raycast', 'find', 'loadScene', 'broadcast', 'isKeyPressed', 'isKeyJustPressed', 'getMousePosition'
    ];
    engineKeywords.forEach(k => declared.add(k));

    const potentialVars = new Set();
    const usageRegex = /(?<![.\w])\b([a-zA-Z_\u00C0-\u017F][\w\u00C0-\u017F]*)\b(?!\s*\()/g;
    while ((match = usageRegex.exec(cleanCode)) !== null) {
        const word = match[1];
        if (!declared.has(word) && isNaN(word) && word.length > 1) {
            potentialVars.add(word);
        }
    }
    return Array.from(potentialVars);
}

function inferVariableType(varName, code) {
    const cleanCode = stripCommentsAndStrings(code);
    for (const rule of typeInference) {
        if (rule.regex.test(varName)) return rule.type;
    }
    const assignmentRegex = new RegExp(`\\b${varName}\\b\\s*=\\s*([^;\\n]+)`, 'i');
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
    const openParen = count(result, '(');
    const closeParen = count(result, ')');
    if (openParen > closeParen) {
        result = result.replace(/(\w+\s*\([^)\n]*)$/gm, '$1)');
    }
    let lines = result.split('\n');
    let braceLevel = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceLevel += count(line, '{');
        if (line.includes('}')) braceLevel -= count(line, '}');
    }
    if (braceLevel > 0) {
        result += `\n// [Syntax Healer] Bloque cerrado automáticamente`;
        for (let j = 0; j < braceLevel; j++) result += '\n}';
    } else if (braceLevel < 0) {
        for (let j = 0; j < Math.abs(braceLevel); j++) {
            const lastBraceIdx = result.lastIndexOf('}');
            if (lastBraceIdx !== -1) result = result.substring(0, lastBraceIdx) + result.substring(lastBraceIdx + 1);
        }
    }
    return result;
}
