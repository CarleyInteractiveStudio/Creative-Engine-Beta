import { examples } from './AutoReparatorData.js';
import { transpile } from './CES_Transpiler.js';

/**
 * Auto Reparator Module
 * Analyzes and fixes common syntax errors and misspellings in CES scripts.
 */
export async function repair(code, fileName) {
    let repairedCode = code;
    const L = window.Localization;

    console.log(`[AutoReparator] Iniciando reparación de ${fileName}...`);

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
        'alActualizar': ['actualizar', 'onUpdate', 'update'],
        'alEmpezar': ['alInicio', 'onStart', 'start', 'iniciar'],
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

    // 2. Ensure 've motor;' exists
    if (!repairedCode.trim().startsWith('ve motor;')) {
        repairedCode = 've motor;\n' + repairedCode;
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

    return {
        success: success,
        code: repairedCode,
        message: success ? L.get('REPARACION_EXITOSA', 'Código reparado con éxito.') : L.get('REPARACION_PARCIAL', 'Se realizaron correcciones, pero aún quedan errores complejos.')
    };
}
