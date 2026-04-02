import { examples } from './AutoReparatorData.js';
import { transpile } from './CES_Transpiler.js';

/**
 * Auto Reparator Module
 * Analyzes and fixes common syntax errors and misspellings in CES scripts.
 */
export async function repair(code, fileName, runtimeError = null) {
    let repairedCode = code;
    const L = window.Localization;

    console.log(`[AutoReparator] Iniciando reparación de ${fileName}...`);

    // 0. Runtime Error analysis (NEW)
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

    // 1. Common Keyword Misspellings (Fuzzy matching simplified)
    const substitutions = {
        'funcion': ['funsion', 'fucion', 'funcio', 'function'],
        'publico': ['public', 'pubico', 'público'],
        'variable': ['var', 'variabke', 'virable'],
        'numero': ['num', 'nmero', 'número'],
        'verdadero': ['true', 'verdedero'],
        'falso': ['false', 'falsoo'],
        'si': ['if'],
        'sino': ['else'],
        've motor;': ['ve motor', 'go motor', 'engine', 'import motor'],
        'alActualizar': ['actualizar', 'alactualizar', 'onUpdate', 'update'],
        'alEmpezar': ['alInicio', 'alempezar', 'onStart', 'start', 'iniciar'],
        'materia': ['objeto', 'mtr', 'this'],
        'posicion': ['position', 'pos'],
        'fisica': ['physics', 'rigidbody', 'física'],
        'imprimir': ['log', 'print', 'console.log']
    };

    for (const [correct, wrongList] of Object.entries(substitutions)) {
        for (const wrong of wrongList) {
            // Regex to match whole words only, case insensitive
            const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
            repairedCode = repairedCode.replace(regex, correct);
        }
    }

    // 2. Ensure 've motor;' exists (avoid duplicates)
    if (!repairedCode.toLowerCase().includes('ve motor;')) {
        repairedCode = 've motor;\n' + repairedCode;
    }

    // 2.b: Structural Analysis with Examples (Advanced Matcher)
    console.log("[AutoReparator] Buscando coincidencias en la base de datos de ejemplos...");
    let bestExample = null;
    let maxMatch = 0;

    // Map common user intents to keywords
    const intentKeywords = {
        'movimiento': ['mober', 'moverse', 'camina', 'correr', 'andando', 'tecla', 'w', 'a', 's', 'd', 'velocidad', 'vel'],
        'ataque': ['pegar', 'golpe', 'daño', 'danar', 'espada', 'bala', 'proyectil', 'lanzar', 'fire', 'disparar'],
        'salud': ['vida', 'curar', 'muerte', 'morir', 'health', 'daño'],
        'seguimiento': ['seguir', 'objetivo', 'jugador', 'perseguir', 'distancia'],
        'ui': ['botón', 'barra', 'texto', 'imagen', 'pantalla', 'progreso'],
        'física': ['saltar', 'gravedad', 'choque', 'colision', 'rb', 'fisica', 'caer'],
        'jefe': ['vida', 'jefe', 'fase', 'proyectil', 'instanciar'],
        'inventario': ['item', 'recogido', 'oro', 'nombre', 'destruir']
    };

    examples.forEach(ex => {
        // Simple word-overlap score
        const exWords = ex.code.toLowerCase().match(/\w+/g) || [];
        const codeWords = repairedCode.toLowerCase().match(/\w+/g) || [];

        let overlap = exWords.filter(w => codeWords.includes(w)).length;

        // Boost score if user code contains intent keywords matching example title
        for (const [intent, keywords] of Object.entries(intentKeywords)) {
            if (ex.title.toLowerCase().includes(intent)) {
                if (keywords.some(k => codeWords.includes(k))) {
                    overlap += 10; // Increased intent boost
                }
            }
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

    // 3. Simple Brackets & Semicolons pattern fixing
    // Fix missing semicolons on declarations
    repairedCode = repairedCode.replace(/^(publico|variable|constante)\s+[\w\u00C0-\u017F]+\s+[\w\u00C0-\u017F]+\s*=?[^;]*?([^\s;])$/gm, (match, p1, p2) => {
        if (match.includes('{') || match.includes('}')) return match;
        return match + ';';
    });

    // 4. Validate with Transpiler and try to isolate bad lines
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

    // 5. Final validation
    validation = transpile(repairedCode, fileName);
    const success = !validation.errors || validation.errors.length === 0;

    let finalMessage = success ? L.get('REPARACION_EXITOSA', 'Código reparado con éxito.') : L.get('REPARACION_PARCIAL', 'Se realizaron correcciones, pero aún quedan errores complejos.');

    // Notify if we replaced the script with a pre-made template
    if (bestExample && (repairedCode.includes(bestExample.code.substring(0, 20)) || forcedTemplate)) {
        finalMessage = `🤖 He detectado que intentabas crear un script de '${bestExample.title}'.\nHe reemplazado tu código por una versión pre-hecha y funcional para ayudarte. ¡Puedes editarla a tu gusto!`;
    }

    return {
        success: success,
        code: repairedCode,
        message: finalMessage
    };
}
