// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo, indentWithTab } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion, acceptCompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { linter } from "https://esm.sh/@codemirror/lint@6.4.2";
import { keymap, Decoration } from "https://esm.sh/@codemirror/view@6.26.3";
import { StateField, StateEffect } from "https://esm.sh/@codemirror/state@6.4.1";
import { transpile } from './CES_Transpiler.js';
import * as AutoReparator from './AutoReparator.js';
import { intentWeights } from './AutoReparatorData.js';
import * as AIHandler from './AIHandler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

// --- Module State ---
let dom;
let codeEditor = null;

const addErrorHighlight = StateEffect.define();
const errorHighlightField = StateField.define({
    create() { return Decoration.none },
    update(underlines, tr) {
        underlines = underlines.map(tr.changes);
        for (let e of tr.effects) if (e.is(addErrorHighlight)) {
            underlines = underlines.update({
                add: [errorHighlightMark.range(e.value.from, e.value.to)]
            });
        }
        return underlines;
    },
    provide: f => EditorView.decorations.from(f)
});

const errorHighlightMark = Decoration.line({
    attributes: { style: "background-color: rgba(255, 0, 0, 0.2); border-left: 3px solid red;" }
});
let currentlyOpenFileHandle = null;
let currentlyOpenDirHandle = null;
let showConsoleCallback = () => {}; // Placeholder for the callback
let hotReloadCallback = () => {}; // Placeholder for hot reload

const cesKeywords = [
    // Spanish Keywords
    { label: "si", type: "keyword" },
    { label: "sino", type: "keyword" },
    { label: "mientras", type: "keyword" },
    { label: "para", type: "keyword" },
    { label: "cada", type: "keyword" },
    { label: "esperar", type: "keyword" },
    { label: "retornar", type: "keyword" },
    { label: "nuevo", type: "keyword" },
    { label: "funcion", type: "keyword" },
    { label: "variable", type: "keyword" },
    { label: "constante", type: "keyword" },
    { label: "verdadero", type: "keyword" },
    { label: "falso", type: "keyword" },
    { label: "materia", type: "type" },
    { label: "mtr", type: "type" },
    { label: "publico", type: "keyword" },
    { label: "privado", type: "keyword" },
    { label: "ve", type: "keyword" },
    { label: "go", type: "keyword" },
    { label: "imprimir", type: "function" },
    { label: "log", type: "function" },

    // English Keywords
    { label: "public", type: "keyword" },
    { label: "private", type: "keyword" },
    { label: "async", type: "keyword" },
    { label: "await", type: "keyword" },

    // Types
    { label: "number", type: "type" },
    { label: "numero", type: "type" },
    { label: "text", type: "type" },
    { label: "texto", type: "type" },
    { label: "boolean", type: "type" },
    { label: "booleano", type: "type" },
    { label: "Vector2", type: "type" },
    { label: "Color", type: "type" },
    { label: "Materia", type: "type" },
    { label: "materia", type: "type" },
    { label: "mtr", type: "type" },
    { label: "Prefab", type: "type" },
    { label: "prefab", type: "type" },
    { label: "Scene", type: "type" },
    { label: "escena", type: "type" },
    { label: "Audio", type: "type" },
    { label: "audio", type: "type" },
    { label: "Sprite", type: "type" },
    { label: "sprite", type: "type" },

    // Component Shortcuts & Functions
    { label: "transform", type: "property" },
    { label: "transformacion", type: "property" },
    { label: "posicion", type: "property" },
    { label: "rigidbody2D", type: "property" },
    { label: "fisica", type: "property" },
    { label: "animatorController", type: "property" },
    { label: "controladorAnimacion", type: "property" },
    { label: "spriteRenderer", type: "property" },
    { label: "renderizadorDeSprite", type: "property" },
    { label: "audioSource", type: "property" },
    { label: "fuenteDeAudio", type: "property" },
    { label: "boxCollider2D", type: "property" },
    { label: "colisionadorCaja2D", type: "property" },
    { label: "capsuleCollider2D", type: "property" },
    { label: "colisionadorCapsula2D", type: "property" },
    { label: "camera", type: "property" },
    { label: "camara", type: "property" },
    { label: "animator", type: "property" },
    { label: "animador", type: "property" },
    { label: "pointLight2D", type: "property" },
    { label: "spotLight2D", type: "property" },
    { label: "freeformLight2D", type: "property" },
    { label: "spriteLight2D", type: "property" },
    { label: "tilemap", type: "property" },
    { label: "grid", type: "property" },
    { label: "rejilla", type: "property" },
    { label: "raycastSource", type: "property" },
    { label: "rallo", type: "property" },
    { label: "basicAI", type: "property" },
    { label: "iaBasica", type: "property" },
    { label: "canvas", type: "property" },
    { label: "lienzo", type: "property" },
    { label: "ui", type: "property" },
    { label: "boton", type: "property" },
    { label: "imagen", type: "property" },
    { label: "textoUI", type: "property" },

    // Lifecycle
    { label: "iniciar", type: "function" },
    { label: "alEmpezar", type: "function" },
    { label: "start", type: "function" },
    { label: "actualizar", type: "function" },
    { label: "alActualizar", type: "function" },
    { label: "update", type: "function" },

    // Actions
    { label: "reproducir", type: "function" },
    { label: "play", type: "function" },
    { label: "detener", type: "function" },
    { label: "stop", type: "function" },
    { label: "crear", type: "function" },
    { label: "create", type: "function" },
    { label: "destruir", type: "function" },
    { label: "destroy", type: "function" },
    { label: "instanciar", type: "function" },
    { label: "instantiate", type: "function" },
    { label: "buscar", type: "function" },
    { label: "find", type: "function" },
    { label: "obtenerScript", type: "function" },
    { label: "getScript", type: "function" },
    { label: "obtenerComponente", type: "function" },
    { label: "getComponent", type: "function" },

    // Physics & Collisions
    { label: "alEntrarEnColision", type: "function" },
    { label: "getCollisionEnter", type: "function" },
    { label: "estaTocandoTag", type: "function" },
    { label: "isTouchingTag", type: "function" },

    // Utils
    { label: "azar", type: "function" },
    { label: "random", type: "function" },
    { label: "distancia", type: "function" },
    { label: "distance", type: "function" },
    { label: "redondear", type: "function" },
    { label: "round", type: "function" },
    { label: "limitar", type: "function" },
    { label: "clamp", type: "function" }
];

function cesCompletions(context) {
    let word = context.matchBefore(/\w+/);
    const code = context.state.doc.toString();
    const prefs = getPreferences();

    let options = [...cesKeywords];

    // Smart context-aware suggestions
    if (prefs.autoCorrectorInteligente !== false) {
        const codeLower = code.toLowerCase();
        for (const [intent, config] of Object.entries(intentWeights)) {
            const hasKeyword = config.keywords.some(k => codeLower.includes(k));
            if (hasKeyword) {
                // Boost relevant keywords or add specific snippets
                options = options.map(opt => {
                    if (config.keywords.includes(opt.label)) {
                        return { ...opt, boost: 10 };
                    }
                    return opt;
                });
            }
        }

        // Logic placement suggestions
        if (codeLower.includes('alactualizar') && !codeLower.includes('teclapresionada')) {
            options.push({ label: 'teclaPresionada("w")', type: 'function', info: 'Detecta si una tecla está siendo pulsada' });
        }
    }

    if (!word) return context.explicit ? { from: context.pos, options: options } : null;
    return {
        from: word.from,
        options: options,
        validFor: /^\w*$/
    };
}

const cesLinter = linter(view => {
    const code = view.state.doc.toString();
    const fileName = currentlyOpenFileHandle ? currentlyOpenFileHandle.name : "temp.ces";

    // Solo linting para archivos .ces
    if (!fileName.endsWith('.ces')) return [];

    const result = transpile(code, fileName);
    let diagnostics = [];

    if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
            try {
                const lineNum = Math.max(1, Math.min(err.line || 1, view.state.doc.lines));
                const line = view.state.doc.line(lineNum);

                diagnostics.push({
                    from: line.from,
                    to: line.to,
                    severity: "error",
                    message: err.message,
                    actions: [{
                        name: "Auto Reparar",
                        apply(view, from, to) {
                            runAutoReparator(fileName);
                        }
                    }]
                });
            } catch (e) {
                console.warn("Error rendering diagnostic:", e);
            }
        });
    }

    return diagnostics;
});


// --- Public API ---

export async function openScriptInEditor(fileName, dirHandle, scenePanel) {
    try {
        currentlyOpenFileHandle = await dirHandle.getFileHandle(fileName);
        currentlyOpenDirHandle = dirHandle;
        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();

        if (fileName.endsWith('.chc')) {
            console.log(`[CHC] Abriendo editor integrado para ${fileName}`);
            openChcEditor(content);
            const toggleBtn = scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]');
            if (toggleBtn) toggleBtn.click();
            return;
        }

        // Switch to Code Editor View
        if (dom.chcIntegratedEditor) dom.chcIntegratedEditor.classList.add('hidden');
        dom.codeEditorToolbar.classList.remove('hidden');
        dom.codemirrorContainer.style.display = 'block';

        if (!codeEditor) {
            codeEditor = new EditorView({
                doc: content,
                extensions: [
                    basicSetup,
                    javascript(),
                    oneDark,
                    errorHighlightField,
                    cesLinter,
                    autocompletion({ override: [cesCompletions] }),
                    keymap.of([
                        { key: "Tab", run: acceptCompletion },
                        indentWithTab
                    ])
                ],
                parent: dom.codemirrorContainer
            });
        } else {
            codeEditor.dispatch({
                changes: { from: 0, to: codeEditor.state.doc.length, insert: content }
            });
        }

        // Fix: Ensure the editor is visible and focused to avoid the typing bug
        scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();

        setTimeout(() => {
            if (codeEditor) {
                codeEditor.focus();
                // Scroll to top
                codeEditor.dispatch({ effects: EditorView.scrollIntoView(0) });
            }
        }, 50);

        console.log(`Abierto ${fileName} en el editor.`);
    } catch (error) {
        console.error(`Error al abrir el script '${fileName}':`, error);
        const L = window.Localization;
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), `${L.get('ERROR_ABRIR_SCRIPT', "No se pudo abrir el script")}: '${fileName}'.`);
    }
}

export async function saveCurrentScript() {
    const L = window.Localization;
    if (!currentlyOpenFileHandle) {
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_SIN_SCRIPT_ABIERTO', 'No hay ningún script abierto para guardar.'));
        return;
    }

    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
    if (!isChc && !codeEditor) {
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_SIN_SCRIPT_ABIERTO', 'No hay ningún script abierto para guardar.'));
        return;
    }

    try {
        const scriptContent = isChc ? dom.chcHumanText.value : codeEditor.state.doc.toString();

        // --- Backup Logic ---
        try {
            const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
            let metaHandle;
            try {
                metaHandle = await currentlyOpenDirHandle.getFileHandle(metaFileName, { create: true });
            } catch (e) {
                // If it fails, maybe directory not reachable, ignore backup for now
            }

            if (metaHandle) {
                const metaFile = await metaHandle.getFile();
                const metaContentText = await metaFile.text();
                let metaData = {};
                try { metaData = JSON.parse(metaContentText); } catch(e) {}

                if (!metaData.history) metaData.history = [];

                // Read current file content to save as backup before overwriting
                const currentFile = await currentlyOpenFileHandle.getFile();
                const currentContent = await currentFile.text();

                // Only add to history if content changed
                if (currentContent !== scriptContent) {
                    metaData.history.unshift({
                        content: currentContent,
                        timestamp: Date.now()
                    });

                    // Keep only last 10 versions
                    if (metaData.history.length > 10) {
                        metaData.history = metaData.history.slice(0, 10);
                    }

                    const metaWritable = await metaHandle.createWritable();
                    await metaWritable.write(JSON.stringify(metaData, null, 2));
                    await metaWritable.close();
                }
            }
        } catch (backupError) {
            console.warn("Backup error (non-fatal):", backupError);
        }

        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(scriptContent);
        await writable.close();

        // window.Dialogs.showNotification removed here, will show specialized one below

        // Ahora, transpila y comprueba si hay errores
        console.clear(); // Limpia la consola antes de mostrar nuevos errores
        const result = transpile(scriptContent, currentlyOpenFileHandle.name);
        if (result.errors && result.errors.length > 0) {
            console.error(`${L.get('ERROR_COMPILACION', 'Errores de compilación en')} ${currentlyOpenFileHandle.name}:`);
            result.errors.forEach(error => window.logToUIConsole(error, 'error', false));

            window.Dialogs.showNotification(
                L.get('AVISO', 'Aviso'),
                `${L.get('EXITO_SCRIPT_GUARDADO', "Script guardado")} pero tiene ERRORES DE SINTAXIS. Revisa la consola.`,
                'warning'
            );
            showConsoleCallback(); // Muestra la consola al usuario
        } else {
            console.log(`${currentlyOpenFileHandle.name}: ${L.get('EXITO_COMPILACION', 'Script compilado exitosamente.')}`);
            window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_SCRIPT_GUARDADO', "Script guardado correctamente")}: '${currentlyOpenFileHandle.name}'.`);
        }

    } catch (error) {
        console.error("Error al guardar el script:", error);
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_GUARDAR_SCRIPT', 'No se pudo guardar el script.'));
    }
}

export function undoLastChange() {
    if (codeEditor) undo(codeEditor);
}

export function redoLastChange() {
    if (codeEditor) redo(codeEditor);
}

export function openChcEditor(content) {
    if (!dom.chcIntegratedEditor) return;

    dom.codemirrorContainer.style.display = 'none';
    dom.codeEditorToolbar.classList.add('hidden');
    dom.chcIntegratedEditor.classList.remove('hidden');
    dom.chcHumanText.value = content;
}

async function runChc() {
    if (!currentlyOpenFileHandle || !currentlyOpenFileHandle.name.endsWith('.chc')) return;
    const L = window.Localization;

    const humanText = dom.chcHumanText.value.trim();
    if (!humanText) {
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('AVISO_ESCRIBE_SCRIPT', 'Por favor, escribe algo antes de correr el script.'));
        return;
    }

    const prefs = getPreferences();
    const provider = prefs.ai?.provider;
    const apiKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

    if (!provider || provider === 'none' || !apiKey) {
        window.Dialogs.showNotification(L.get('TITULO_CONFIG_REQUERIDA', 'Configuración Requerida'), L.get('ERROR_CONFIG_CARL', 'Para usar CHC, debes configurar Carl IA en las Preferencias del motor.'));
        return;
    }

    dom.chcLoadingOverlay.classList.remove('hidden');
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_LLAMANDO_CARL', 'Llamando a Carl IA...');
    dom.chcRunBtn.classList.add('compiling');
    dom.chcRunBtn.innerHTML = `<img src="icons/bot.svg" class="ce-icon" style="filter: brightness(0) invert(1);"> ${L.get('MSG_CARL_PENSANDO', 'Carl está pensando...')}`;

    // Simulate analysis phase for better UX
    await new Promise(r => setTimeout(r, 800));
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_CARL_ANALIZANDO', 'Carl está analizando tu lógica creativa...');

    const prompt = `Actúa como el traductor de Creative H-Code (CHC) para Creative Engine.
Tu tarea es traducir la descripción humana del comportamiento de un objeto en un script válido de Creative Engine (.ces).

REGLAS TÉCNICAS (Sintaxis CES):
1. IMPORTACIONES: ¡OBLIGATORIO! Empieza siempre con 've motor;'.
2. IDIOMA: ¡Usa SIEMPRE el español! (si, sino, mientras, para, retornar, verdadero, falso, variable, constante, materia, mtr, numero, texto, booleano).
3. ESTRUCTURA DE VARIABLES:
   - 'publico numero velocidad = 5;'
   - 'publico texto nombre = "Héroe";'
   - 'publico mtr objetivo;'
   - 'publico Sprite icono;'
   - 'publico Audio sonido;'
   - 'publico Prefab enemigo;'
   - 'publico Scene siguienteNivel;'
4. ACCESO DIRECTO (¡IMPORTANTE! No uses 'this.', 'entrada.' ni 'motor.'):
   - nombre, tag, posicion, fisica, renderizadorDeSprite, controladorAnimacion, fuenteDeAudio, camara, rejilla, lienzo.
   - Atajos: reproducir.Estado(), voltearH, voltearV.
   - Entrada: teclaPresionada("W"), teclaRecienPresionada("Space"), botonMousePresionado(0), obtenerPosicionMouse().
5. EVENTOS: 'alEmpezar()', 'alActualizar(delta)', 'actualizarFijo(delta)', 'alEntrarEnColision(otro)', 'alRecibir(mensaje, datos)', 'alHacerClick()'.
6. TIEMPO Y FLUJO:
   - 'esperar(segundos)' (usa await internamente, pero el usuario escribe esperar(1)).
   - 'cada(segundos) { ... }' (Timers simplificados).
7. ACCIONES COMUNES:
   - lanzarRayo(origen, direccion, dist, tag), buscar(nombre), estaTocandoTag(tag).
   - crear miPrefab; o instanciar(miPrefab, posicion);
   - destruir(materia), destroy(materia).
   - difundir("mensaje", datos), broadcast("mensaje", datos).
8. REGLA DE ORO: Devuelve ÚNICAMENTE el código .ces. Sin explicaciones, sin markdown, sin bloques de código.

EJEMPLO 1 (Movimiento):
ENTRADA: "Mover a la derecha con D y saltar con Espacio."
SALIDA:
ve motor;
publico numero velocidad = 5;
publico numero salto = 10;
alActualizar(delta) {
    si (teclaPresionada("d")) {
        posicion.x += velocidad;
    }
    si (teclaRecienPresionada("Space")) {
        fisica.applyImpulse(nuevo Vector2(0, -salto));
    }
}

EJEMPLO 2 (Combate):
ENTRADA: "Al chocar con tag 'Enemigo', imprimir 'Auch' y esperar 2 segundos para destruir este objeto."
SALIDA:
ve motor;
alEntrarEnColision(otro) {
    si (otro.tieneTag("Enemigo")) {
        imprimir("Auch");
        esperar(2);
        destruir(materia);
    }
}

EJEMPLO 3 (Loop):
ENTRADA: "Cada 3 segundos cambiar color a rojo."
SALIDA:
ve motor;
alEmpezar() {
    cada(3) {
        renderizadorDeSprite.color = "#ff0000";
    }
}

ENTRADA DEL USUARIO:
"${humanText}"`;

    try {
        // Find a working model
        let modelToUse = prefs.ai?.model;
        if (!modelToUse) {
            // Fallback defaults if no model selected
            if (provider === 'gemini') modelToUse = 'models/gemini-1.5-flash';
            else if (provider === 'openai') modelToUse = 'gpt-3.5-turbo';
            else if (provider === 'anthropic') modelToUse = 'claude-3-haiku-20240307';
        }

        let currentPrompt = prompt;
        let attempts = 0;
        const maxAttempts = 3;
        let finalGeneratedCode = null;

        while (attempts < maxAttempts) {
            attempts++;
            const result = await AIHandler.callGenerativeAI(provider, modelToUse, apiKey, currentPrompt);

            if (!result.success) throw new Error(result.error);

            let generatedCode = result.text.trim();

            // Clean markdown blocks and conversational filler
            const codeBlockRegex = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;
            const matches = [...generatedCode.matchAll(codeBlockRegex)];
            if (matches.length > 0) {
                generatedCode = matches.map(m => m[1]).join('\n');
            } else {
                // If no code blocks, try to strip leading text before the first known keyword
                const firstKeyword = generatedCode.search(/\b(public|publico|private|privado|variable|constante|numero|texto|booleano|go|alEmpezar|alActualizar)\b/i);
                if (firstKeyword !== -1) {
                    generatedCode = generatedCode.substring(firstKeyword);
                }
                // Also remove trailing conversational filler if it seems to follow the last semicolon or brace
                const lastStructuralChar = Math.max(generatedCode.lastIndexOf(';'), generatedCode.lastIndexOf('}'));
                if (lastStructuralChar !== -1) {
                    generatedCode = generatedCode.substring(0, lastStructuralChar + 1);
                }
            }

            // Validar código generado
            const validation = transpile(generatedCode, currentlyOpenFileHandle.name);
            if (!validation.errors || validation.errors.length === 0) {
                finalGeneratedCode = generatedCode;
                console.log(`CHC Traducido con éxito para ${currentlyOpenFileHandle.name} (Intento ${attempts})`);
                break;
            }

            console.warn(`[CHC] Intento ${attempts} fallido con errores de sintaxis:`, validation.errors);
            if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_CARL_CORRIGIENDO', 'Carl está corrigiendo errores ({attempts})...').replace('{attempts}', attempts);

            currentPrompt = `El código que generaste tiene ERRORES DE SINTAXIS. Por favor, corrígelo.
Asegúrate de:
- Definir las variables correctamente (ej: variable x = 1;)
- Definir los métodos correctamente (ej: alActualizar() { ... })
- NO incluir NINGUNA explicación ni texto fuera del código.

CÓDIGO CON ERRORES:
${generatedCode}

ERRORES ENCONTRADOS:
${validation.errors.join('\n')}

Por favor, devuelve solo el código corregido y funcional.`;
        }

        if (!finalGeneratedCode) {
            throw new Error(L.get('ERROR_CARL_FAILED', "Carl IA no pudo generar un código libre de errores tras varios intentos."));
        }

        if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_GUARDANDO_LOGICA', 'Guardando lógica traducida...');

        // Save Human text to .chc
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(humanText);
        await writable.close();

        // Save Generated code to .chc.meta (used by the engine at runtime)
        const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
        const metaHandle = await currentlyOpenDirHandle.getFileHandle(metaFileName, { create: true });
        const metaWritable = await metaHandle.createWritable();

        const metaData = {
            generatedCode: finalGeneratedCode,
            lastGenerated: Date.now()
        };

        await metaWritable.write(JSON.stringify(metaData, null, 2));
        await metaWritable.close();

        // Notify engine to reload transpilation maps
        transpile(finalGeneratedCode, currentlyOpenFileHandle.name);

        if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_SINCRONIZANDO_MOTOR', 'Sincronizando con el motor...');
        // Hot reload in engine
        await hotReloadCallback(currentlyOpenFileHandle.name);
        await new Promise(r => setTimeout(r, 500));

        window.Dialogs.showNotification(L.get('TITULO_CARL_IA', 'Carl IA'), L.get('MSG_CARL_EXITO', '¡Listo! He traducido tu idea. ¡Mira cómo cobra vida!'));

    } catch (error) {
        console.error("CHC Error:", error);
        window.Dialogs.showNotification(L.get('ERROR_CARL_PROCESO', 'Error de Carl IA'), `${L.get('ERROR_CARL_PROCESO', "Vaya, algo salió mal al procesar tu lógica")}: ${error.message}`);
    } finally {
        dom.chcLoadingOverlay.classList.add('hidden');
        dom.chcRunBtn.classList.remove('compiling');
        dom.chcRunBtn.innerHTML = `<img src="icons/rocket.svg" class="ce-icon" style="filter: brightness(0) invert(1);"> ${L.get('BOTON_CORRER', 'Correr')}`;
    }
}

let lastRuntimeError = null;

export function setLastRuntimeError(error) {
    lastRuntimeError = error;
}

export async function runAutoReparator(targetFileName = null) {
    const L = window.Localization;

    // If a specific file is requested and it's not the current one, try to open it
    if (targetFileName && (!currentlyOpenFileHandle || currentlyOpenFileHandle.name !== targetFileName)) {
        await openScriptAtLine(targetFileName, 1);
    }

    if (!currentlyOpenFileHandle) return;

    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
    const content = isChc ? dom.chcHumanText.value : codeEditor.state.doc.toString();

    // Only pass runtime error if it belongs to the current file
    const errorToPass = (lastRuntimeError && lastRuntimeError.scriptName === currentlyOpenFileHandle.name) ? lastRuntimeError : null;

    try {
        const result = await AutoReparator.repair(content, currentlyOpenFileHandle.name, errorToPass);

        if (result.code !== content) {
            if (isChc) {
                dom.chcHumanText.value = result.code;
            } else if (codeEditor) {
                codeEditor.dispatch({
                    changes: { from: 0, to: codeEditor.state.doc.length, insert: result.code }
                });
            }

            if (result.addComponent && window.SceneManager) {
                window.Dialogs.showConfirmation(
                    L.get('AUTOCORRECTOR', 'Auto Corrector'),
                    result.message,
                    async () => {
                        const mtr = window.SceneManager.currentScene.findMateriaById(result.addComponent.materiaId);
                        if (mtr) {
                            const CompClass = window.Components[result.addComponent.componentType];
                            if (CompClass) {
                                mtr.addComponent(new CompClass(mtr));
                                window.Dialogs.showNotification(L.get('EXITO'), `Componente ${result.addComponent.componentType} añadido con éxito.`);
                                if (window.updateInspector) window.updateInspector();
                            }
                        }
                    }
                );
            } else {
                window.Dialogs.showNotification(
                    result.success ? L.get('EXITO', 'Éxito') : L.get('AVISO', 'Aviso'),
                    result.message
                );
            }
        } else if (result.addComponent && window.SceneManager) {
            // Case where code didn't change but we need to add a component
            window.Dialogs.showConfirmation(
                L.get('AUTOCORRECTOR', 'Auto Corrector'),
                result.message,
                async () => {
                    const mtr = window.SceneManager.currentScene.findMateriaById(result.addComponent.materiaId);
                    if (mtr) {
                        const CompClass = window.Components[result.addComponent.componentType];
                        if (CompClass) {
                            mtr.addComponent(new CompClass(mtr));
                            window.Dialogs.showNotification(L.get('EXITO'), `Componente ${result.addComponent.componentType} añadido con éxito.`);
                            if (window.updateInspector) window.updateInspector();
                        }
                    }
                }
            );
        } else {
            window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('NADA_QUE_REPARAR', 'No se encontraron errores obvios que reparar.'));
        }
    } catch (e) {
        console.error("AutoReparator Error:", e);
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), "Fallo al ejecutar el Auto Reparator.");
    }
}

export async function openScriptAtLine(fileName, lineNumber) {
    if (!lineNumber) lineNumber = 1;
    console.log(`[CodeEditor] Abriendo ${fileName} en la línea ${lineNumber}`);

    // Switch to assets tab and find the file (approximate)
    // Actually, we can just use the dirHandle if we have it or find it.
    // Let's assume the file is in 'Assets/'

    const projectName = new URLSearchParams(window.location.search).get('project');
    const projectHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    // We need to find which subfolder the file is in.
    // For simplicity, let's try Assets directly first, then subfolders if needed.
    // Better: use the AssetBrowser to find it or a recursive search.

    async function findFile(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name === fileName) return dirHandle;
            if (entry.kind === 'directory') {
                const found = await findFile(entry);
                if (found) return found;
            }
        }
        return null;
    }

    const dirHandle = await findFile(assetsHandle) || assetsHandle;

    await openScriptInEditor(fileName, dirHandle, dom.scenePanel);

    // Highlight line
    setTimeout(() => {
        if (codeEditor) {
            const line = codeEditor.state.doc.line(Math.min(lineNumber, codeEditor.state.doc.lines));
            codeEditor.dispatch({
                selection: { anchor: line.from },
                effects: [
                    EditorView.scrollIntoView(line.from, { y: "center" }),
                    addErrorHighlight.of({ from: line.from, to: line.to })
                ]
            });
        }
    }, 100);
}

export async function showScriptHistory() {
    if (!currentlyOpenFileHandle) return;
    const L = window.Localization;

    try {
        const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
        const metaHandle = await currentlyOpenDirHandle.getFileHandle(metaFileName);
        const metaFile = await metaHandle.getFile();
        const metaData = JSON.parse(await metaFile.text());

        const history = metaData.history || [];
        const historyList = document.getElementById('script-history-list');
        const modal = document.getElementById('script-history-modal');

        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = `<div class="empty-list-msg">${L.get('SIN_HISTORIAL', 'No hay versiones anteriores guardadas.')}</div>`;
        } else {
            history.forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'dialog-selection-item';
                const date = new Date(entry.timestamp).toLocaleString();
                item.innerHTML = `
                    <div class="item-info">
                        <span class="item-name">${L.get('VERSION', 'Versión')} ${history.length - index}</span>
                        <span class="item-details">${date}</span>
                    </div>
                    <button class="restore-btn primary-btn" style="padding: 4px 8px; font-size: 0.8em;">${L.get('RESTAURAR', 'Restaurar')}</button>
                `;

                item.querySelector('.restore-btn').onclick = () => {
                    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
                    if (isChc) {
                        dom.chcHumanText.value = entry.content;
                    } else if (codeEditor) {
                        codeEditor.dispatch({
                            changes: { from: 0, to: codeEditor.state.doc.length, insert: entry.content }
                        });
                    }
                    modal.classList.add('hidden');
                    window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), L.get('VERSION_RESTAURADA', 'Versión restaurada en el editor. Recuerda guardar para aplicar los cambios.'));
                };

                historyList.appendChild(item);
            });
        }

        modal.classList.remove('hidden');
        window.bringToFront(modal);

    } catch (e) {
        console.error("Error al cargar historial:", e);
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('SIN_HISTORIAL', 'No hay versiones anteriores guardadas para este archivo.'));
    }
}

export function initialize(domCache, showConsole, hotReload) {
    dom = domCache;
    showConsoleCallback = showConsole; // Almacena el callback
    hotReloadCallback = hotReload;

    // Register global access for Console actions
    window._CodeEditor = {
        openScriptAtLine,
        runAutoReparator,
        setLastRuntimeError
    };

    // Configura los event listeners para los botones de la barra de herramientas
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());

    const historyBtn = document.getElementById('code-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => showScriptHistory());
    }

    const repairBtn = document.getElementById('code-reparar-btn');
    if (repairBtn) {
        repairBtn.addEventListener('click', () => runAutoReparator());
    }

    // CHC specific
    if (dom.chcRunBtn) {
        dom.chcRunBtn.addEventListener('click', () => runChc());
    }
}
