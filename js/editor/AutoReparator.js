import { examples, intentWeights, structuralRules, typeInference, logicPatterns, expensivePatterns } from './AutoReparatorData.js';
import { transpile } from './CES_Transpiler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

/**
 * Auto Reparator Module v3 "Smart Brain"
 * Analyzes and fixes common syntax errors and misspellings in CES scripts using semantic rules.
 */
export async function repair(code, fileName, runtimeError = null) {
    const prefs = getPreferences();
    const isSmartEnabled = prefs.autoCorrectorInteligente !== false; // Default true

    let repairedCode = code;
    const L = window.Localization;

    console.log(`[AutoReparator] Iniciando reparación de ${fileName} (Smart: ${isSmartEnabled})...`);

    // 0. Runtime Error analysis
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
                    success: true, // Success because we identified the problem
                    code: code,
                    message: `⚠️ Falta el componente '${check.comp}' en '${runtimeError.materiaName}'. ¿Quieres que lo añada por ti?`,
                    addComponent: {
                        materiaId: runtimeError.materiaId,
                        componentType: check.comp
                    }
                };
            }
        }

        // Suggest fix for "is not defined" (likely a typo in a variable name)
        if (runtimeError.message.includes('is not defined')) {
            const undefinedVar = runtimeError.message.split(' ')[0];
            // Try to find a close match in the code
            const allWords = Array.from(new Set(repairedCode.match(/[a-zA-Z_\u00C0-\u017F][\w\u00C0-\u017F]*/g)));
            const bestMatch = allWords.find(w => {
                // Very simple fuzzy: one char difference
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

    // 1. Smart Keyword Substitutions
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
            // Force correct case for keywords to match transpiler expectations
            repairedCode = repairedCode.replace(regex, correct);
        }
    }

    // 1.b Garbage Cleaner (Early Pass) - Remove/Comment illegal solitary identifiers
    if (isSmartEnabled) {
        const lines = repairedCode.split('\n');
        const dontTouch = [...structuralRules.allowedGlobalScope, ...structuralRules.lifecycleMethods,
                          'delta', 'deltaTime', 'mtr', 'materia', 'retornar', 'esperar', 'detener', 'verdadero', 'falso'];

        let inCommentBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Handle multi-line comment status
            if (trimmed.startsWith('/*')) inCommentBlock = true;
            if (inCommentBlock) {
                if (trimmed.includes('*/')) inCommentBlock = false;
                continue;
            }
            if (trimmed.startsWith('//')) continue;

            // Match single word (optional semicolon), allowing indentation
            if (/^[a-z_][a-z0-9_]*;?$/i.test(trimmed)) {
                const word = trimmed.replace(';', '');
                if (!dontTouch.includes(word) && isNaN(word) && word.length > 0) {
                    console.log(`[Creative Code] Limpiando identificador ilegal: ${word}`);
                    // Use a targeted replacement that respects indentation
                    lines[i] = lines[i].replace(word, `// [Creative Code REMOVED] ${word}`);
                }
            }
        }
        repairedCode = lines.join('\n');
    }

    // 2. Ensure mandatory header
    if (!repairedCode.toLowerCase().includes(structuralRules.mandatoryHeader)) {
        repairedCode = structuralRules.mandatoryHeader + '\n' + repairedCode;
    }

    // 3. Smart Intent Detection
    console.log("[AutoReparator] Analizando intención semántica...");
    let bestIntent = 'desconocido';
    let maxIntentScore = 0;
    const codeWords = repairedCode.toLowerCase().match(/\w+/g) || [];

    for (const [intent, config] of Object.entries(intentWeights)) {
        let score = 0;
        config.keywords.forEach(k => {
            if (codeWords.includes(k)) score += 2;
        });

        // Context boost: if the user is using specific engine functions
        if (intent === 'fisica' && repairedCode.includes('applyImpulse')) score += 10;
        if (intent === 'salud' && repairedCode.includes('danar')) score += 10;
        if (intent === 'ui' && repairedCode.includes('uiBarra')) score += 10;

        if (score > maxIntentScore) {
            maxIntentScore = score;
            bestIntent = intent;
        }
    }
    console.log(`[AutoReparator] Intención detectada: ${bestIntent} (Score: ${maxIntentScore})`);

    // 4. Smart Auto-Declaration (if enabled)
    if (isSmartEnabled) {
        const undeclared = detectUndeclaredVariables(repairedCode);
        if (undeclared.length > 0) {
            console.log("[AutoReparator] Detectadas variables no declaradas:", undeclared);
            let declarations = "";
            undeclared.forEach(v => {
                const type = inferVariableType(v, repairedCode);
                declarations += `publico ${type} ${v};\n`;
            });
            // Insert after header
            repairedCode = repairedCode.replace(structuralRules.mandatoryHeader, structuralRules.mandatoryHeader + '\n' + declarations);
        }
    }

    // 5. Advanced Example Matcher (Structural)
    let bestExample = null;
    let maxMatch = 0;

    examples.forEach(ex => {
        const exWords = ex.code.toLowerCase().match(/\w+/g) || [];
        let overlap = exWords.filter(w => codeWords.includes(w)).length;

        // Intent boost
        if (ex.title.toLowerCase().includes(bestIntent)) {
            overlap += intentWeights[bestIntent]?.scoreBoost || 5;
        }

        const score = overlap / exWords.length;
        if (score > maxMatch) {
            maxMatch = score;
            bestExample = ex;
        }
    });

    // Forced replacement if code is still extremely broken
    let forcedTemplate = false;
    const currentValidation = transpile(repairedCode, fileName);
    if (currentValidation.errors && currentValidation.errors.length > 0 && bestExample && maxMatch > 0.3) {
        console.log(`[AutoReparator] Código insalvable. Forzando plantilla: ${bestExample.title}`);
        repairedCode = bestExample.code;
        forcedTemplate = true;
    } else if (bestExample && maxMatch > 0.7) {
        console.log(`[AutoReparator] Coincidencia encontrada con: ${bestExample.title} (Score: ${maxMatch.toFixed(2)})`);
        // If the code is very broken (transpilation fails), we try to merge the user variables with the example's structure
        const validation = transpile(repairedCode, fileName);
        if (validation.errors && validation.errors.length > 0) {
            console.log("[AutoReparator] El código está muy dañado. Intentando reconstrucción estructural...");

            // Extract user variables
            const userVars = repairedCode.match(/publico\s+\w+\s+\w+\s*=\s*[^;]+;/g) || [];
            let structuralBase = bestExample.code;

            // If the example already has the same variable names, we keep user values
            userVars.forEach(v => {
                const nameMatch = v.match(/publico\s+\w+\s+(\w+)\s*=/);
                if (nameMatch) {
                    const varName = nameMatch[1];
                    const regex = new RegExp(`publico\\s+\\w+\\s+${varName}\\s*=\\s*[^;]+;`, 'g');
                    if (structuralBase.match(regex)) {
                        structuralBase = structuralBase.replace(regex, v);
                    } else {
                        // Insert after imports if it's a new variable
                        structuralBase = structuralBase.replace('ve motor;', `ve motor;\n${v}`);
                    }
                }
            });

            repairedCode = structuralBase;
        }
    }

    // 6. Performance Mentor (Brain v3.3)
    if (isSmartEnabled) {
        console.log("[AutoReparator] Ejecutando Performance Mentor...");
        expensivePatterns.forEach(rule => {
            if (rule.pattern.test(repairedCode)) {
                // Determine if it's inside alActualizar
                const lines = repairedCode.split('\n');
                let inUpdate = false;
                for (const line of lines) {
                    if (/alActualizar/i.test(line)) inUpdate = true;
                    if (inUpdate && rule.pattern.test(line)) {
                        console.warn(`[Performance Mentor] ${rule.message}`);
                        repairedCode = repairedCode.replace(line, `// ${rule.message}\n${line}`);
                        break;
                    }
                }
            }
        });
    }

    // 6.b Logic Pattern Completion (New Brain v3.1)
    if (isSmartEnabled) {
        console.log("[AutoReparator] Buscando patrones lógicos incompletos...");
        logicPatterns.forEach(pattern => {
            if (pattern.trigger.test(repairedCode)) {
                // Check if key elements of the pattern are missing
                const missingElements = pattern.elements.filter(el => {
                    const regex = new RegExp(el, 'i');
                    return !regex.test(repairedCode);
                });

                if (missingElements.length > 0 && missingElements.length <= 2) {
                    console.log(`[AutoReparator] Patrón detectado: ${pattern.name}. Sugiriendo completado...`);
                    // If it's a lifecycle trigger and the code is very short, add the completion
                    if (repairedCode.length < 150) {
                        repairedCode += `\n// Sugerencia de ${pattern.name}:\n${pattern.completion}`;
                    }
                }
            }
        });
    }

    // 7. Syntax Healer (Braces and Parentheses balance)
    if (isSmartEnabled) {
        repairedCode = healSyntaxStructure(repairedCode);
    }

    // 8. Structural Repair Logic
    if (isSmartEnabled) {
        // Fix input logic placement (should be in alActualizar)
        const hasInputLogic = /teclaPresionada|teclaRecienPresionada|botonMousePresionado|obtenerPosicionMouse/i.test(repairedCode);
        const hasUpdate = /alActualizar|actualizar|update/i.test(repairedCode);

        if (hasInputLogic && !hasUpdate) {
            console.log("[AutoReparator] Moviendo lógica de entrada a alActualizar...");
            // Extract lines that look like they should be in update (not declarations, not imports)
            const lines = repairedCode.split('\n');
            const declarationKeywords = ['publico', 'privado', 'variable', 'constante', 've', 'go', 'engine', 'motor'];
            let updateBody = "";
            let remainingCode = "";

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const isDeclaration = declarationKeywords.some(k => trimmed.startsWith(k));
                const isFunction = /^(async\s+)?(funcion|alEmpezar|alEntrarEnColision|alRecibir|alHacerClick|alChocar|alClicar|alPulsar)/i.test(trimmed);

                if (!isDeclaration && !isFunction && trimmed.includes('tecla')) {
                    updateBody += `    ${trimmed}\n`;
                } else {
                    remainingCode += `${line}\n`;
                }
            });

            if (updateBody) {
                repairedCode = `${remainingCode.trim()}\n\nalActualizar(delta) {\n${updateBody}}`;
            }
        }

        // Fix missing semicolons on declarations
        repairedCode = repairedCode.replace(/^(publico|variable|constante)\s+[\w\u00C0-\u017F]+\s+[\w\u00C0-\u017F]+\s*=?[^;]*?([^\s;])$/gm, (match, p1, p2) => {
            if (match.includes('{') || match.includes('}')) return match;
            return match + ';';
        });
    }

    // 9. Validate with Transpiler and try to isolate bad lines
    let validation = transpile(repairedCode, fileName);

    if (validation.errors && validation.errors.length > 0) {
        console.warn("[AutoReparator] Errores detectados tras primera pasada. Intentando cirugía...");

        const lines = repairedCode.split('\n');
        const fatalLines = new Set();

        validation.errors.forEach(err => {
            if (err.line && err.line <= lines.length) {
                fatalLines.add(err.line - 1);
            }
        });

        // Strategy: if a line is fatal and we can't fix it, comment it out instead of deleting
        // to let the user see what happened.
        fatalLines.forEach(index => {
            if (lines[index].trim()) {
                lines[index] = `// [AutoReparator FIXED] ${lines[index]}`;
            }
        });

        repairedCode = lines.join('\n');
    }

    // 10. Object Awareness (Brain v3.3)
    let missingComponentSuggestion = null;
    const selected = (typeof window !== 'undefined' && window.getSelectedMateria) ? window.getSelectedMateria() : null;
    if (isSmartEnabled && selected) {
        const required = [
            { key: 'fisica|velocity|applyImpulse', comp: 'Rigidbody2D' },
            { key: 'vida|danar|curar', comp: 'Health' },
            { key: 'reproducir|animador', comp: 'Animator' },
            { key: 'renderizadorDeSprite', comp: 'SpriteRenderer' },
            { key: 'uiBarra', comp: 'ProgressBar' }
        ];

        for (const req of required) {
            const regex = new RegExp(req.key, 'i');
            if (regex.test(repairedCode) && !selected.getComponent(window.Components[req.comp])) {
                missingComponentSuggestion = {
                    materiaId: selected.id,
                    componentType: req.comp
                };
                break;
            }
        }
    }

    // 11. Final validation
    validation = transpile(repairedCode, fileName);
    const success = !validation.errors || validation.errors.length === 0;

    let finalMessage = success ? L.get('REPARACION_EXITOSA', 'Código reparado con éxito.') : L.get('REPARACION_PARCIAL', 'Se realizaron correcciones, pero aún quedan errores complejos.');

    if (repairedCode.includes('[Creative Code REMOVED]')) {
        finalMessage += `\n🧹 He limpiado identificadores inválidos o "basura" detectados.`;
    }

    if (repairedCode.includes('Syntax Healer')) {
        finalMessage += `\n🩹 He reparado la estructura de llaves o paréntesis.`;
    }

    if (bestIntent !== 'desconocido' && !success) {
        finalMessage += `\n🤖 Parece que intentas hacer algo de '${bestIntent}'. He intentado ajustar el código a esa lógica.`;
    }

    // Add component suggestion to message if present
    if (missingComponentSuggestion) {
        finalMessage += `\n⚠️ He detectado que usas lógica de '${missingComponentSuggestion.componentType}', pero el objeto no tiene ese componente. ¿Deseas añadirlo?`;
    }

    // Notify if we replaced the script with a pre-made template
    if (bestExample && (repairedCode.includes(bestExample.code.substring(0, 20)) || forcedTemplate)) {
        finalMessage = `🤖 He detectado que intentabas crear un script de '${bestExample.title}'.\nHe reemplazado tu código por una versión pre-hecha y funcional para ayudarte. ¡Puedes editarla a tu gusto!`;
    }

    return {
        success: success,
        code: repairedCode,
        message: finalMessage,
        addComponent: missingComponentSuggestion
    };
}

/**
 * Detects variables that are used but not declared.
 */
function detectUndeclaredVariables(code) {
    const declared = new Set();
    const declarationRegex = /\b(publico|privado|variable|constante)\s+[\w\u00C0-\u017F]+\s+([\w\u00C0-\u017F]+)/g;
    let match;
    while ((match = declarationRegex.exec(code)) !== null) {
        declared.add(match[2]);
    }

    const functionRegex = /\b(funcion|alActualizar|alEmpezar|alEntrarEnColision|alHacerClick|alRecibir)\s*([\w\u00C0-\u017F]+)?\s*\(([^)]*)\)/g;
    while ((match = functionRegex.exec(code)) !== null) {
        if (match[2]) declared.add(match[2]);
        if (match[3]) {
            match[3].split(',').forEach(p => {
                const param = p.trim().split(/\s+/).pop();
                if (param) declared.add(param);
            });
        }
    }

    // Common engine keywords and built-ins to ignore
    const engineKeywords = [
        'posicion', 'fisica', 'materia', 'mtr', 'delta', 'otro', 'datos', 'reproducir', 'imprimir', 'esperar', 'cada',
        'nuevo', 'Vector2', 'azar', 'si', 'sino', 'retornar', 'verdadero', 'falso', 'rotacion', 'escala', 'renderizadorDeSprite',
        'fuenteDeAudio', 'animador', 'lienzo', 'uiBarra', 'tiempoDelta', 'absoluto', 'seno', 'coseno', 'distancia', 'instanciar',
        'destruir', 'lanzarRayo', 'buscar', 'cargarEscena', 'difundir', 'teclaPresionada', 'teclaRecienPresionada', 'obtenerPosicionMouse'
    ];
    engineKeywords.forEach(k => declared.add(k));

    const potentialVars = new Set();
    // Matches words that look like variables (not starting with . and not followed by ()
    const usageRegex = /(?<![.\w])\b([a-zA-Z_\u00C0-\u017F][\w\u00C0-\u017F]*)\b(?!\s*\()/g;
    while ((match = usageRegex.exec(code)) !== null) {
        const word = match[1];
        if (!declared.has(word) && isNaN(word) && word.length > 1) {
            potentialVars.add(word);
        }
    }
    return Array.from(potentialVars);
}

/**
 * Infers type based on variable name and usage.
 */
function inferVariableType(varName, code) {
    for (const rule of typeInference) {
        if (rule.regex.test(varName)) return rule.type;
    }

    // Check usage in code
    const assignmentRegex = new RegExp(`\\b${varName}\\b\\s*=\\s*([^;\\n]+)`, 'i');
    const match = code.match(assignmentRegex);
    if (match) {
        const value = match[1].trim();
        if (value.startsWith('"') || value.startsWith("'")) return 'texto';
        if (value === 'verdadero' || value === 'falso' || value === 'true' || value === 'false') return 'booleano';
        if (!isNaN(parseFloat(value))) return 'numero';
    }

    return 'numero'; // Default
}

/**
 * Smart Healer for Braces and Parentheses.
 * Tries to balance characters and close blocks logically.
 */
function healSyntaxStructure(code) {
    let result = code;

    // Helper to count occurrences
    const count = (str, char) => (str.split(char).length - 1);

    // 1. Balance Parentheses ()
    const openParen = count(result, '(');
    const closeParen = count(result, ')');
    if (openParen > closeParen) {
        // Find lines that end with a word and likely need a closing paren (e.g. function calls)
        result = result.replace(/(\w+\s*\([^)\n]*)$/gm, '$1)');
    }

    // 2. Balance Braces {}
    let lines = result.split('\n');
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceLevel += count(line, '{');
        if (line.includes('}')) braceLevel -= count(line, '}');
    }

    if (braceLevel > 0) {
        console.log(`[Syntax Healer] Cerrando ${braceLevel} llaves pendientes...`);
        result += `\n// [Syntax Healer] Bloque cerrado automáticamente`;
        for (let j = 0; j < braceLevel; j++) {
            result += '\n}';
        }
    } else if (braceLevel < 0) {
        console.log(`[Syntax Healer] Detectadas llaves de cierre excesivas (${Math.abs(braceLevel)}). Intentando corrección...`);
        // If we have more closures than openings, they are usually at the end.
        for (let j = 0; j < Math.abs(braceLevel); j++) {
            const lastBraceIdx = result.lastIndexOf('}');
            if (lastBraceIdx !== -1) {
                result = result.substring(0, lastBraceIdx) + result.substring(lastBraceIdx + 1);
            }
        }
    }

    return result;
}
