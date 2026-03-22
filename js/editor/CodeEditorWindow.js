// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo, indentWithTab } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion, acceptCompletion, completionKeymap } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { keymap, Decoration } from "https://esm.sh/@codemirror/view@6.26.3";
import { StateField, StateEffect } from "https://esm.sh/@codemirror/state@6.4.1";
import { transpile } from './CES_Transpiler.js';
import * as AutoReparator from './AutoReparator.js';
import * as AIHandler from './AIHandler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

// --- Module State ---
let dom;
let codeEditor = null;

const addErrorHighlight = StateEffect.define();
const clearErrorHighlights = StateEffect.define();
const errorHighlightField = StateField.define({
    create() { return Decoration.none },
    update(underlines, tr) {
        underlines = underlines.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(addErrorHighlight)) {
                underlines = underlines.update({
                    add: [errorHighlightMark.range(e.value.from, e.value.to)]
                });
            } else if (e.is(clearErrorHighlights)) {
                underlines = Decoration.none;
            }
        }
        return underlines;
    },
    provide: f => EditorView.decorations.from(f)
});

const errorHighlightMark = Decoration.line({
    attributes: { style: "background-color: rgba(255, 0, 0, 0.15); border-left: 5px solid #ff4444; box-shadow: inset 10px 0 10px -10px rgba(255,0,0,0.5);" }
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
    { label: "clamp", type: "function" },

    // Gamepad
    { label: "mandoBotonPresionado", type: "function" },
    { label: "mandoBotonRecienPresionado", type: "function" },
    { label: "mandoBotonLiberado", type: "function" },
    { label: "mandoEje", type: "function" },
    { label: "isGamepadConnected", type: "function" },

    // Rigidbody2D Shortcuts
    { label: "velocidadX", type: "property" },
    { label: "velocidadY", type: "property" },
    { label: "masa", type: "property" },
    { label: "escalaGravedad", type: "property" },

    // Lifecycle Aliases
    { label: "alChocar", type: "function" },
    { label: "alClicar", type: "function" },
    { label: "alPulsar", type: "function" }
];

function cesCompletions(context) {
    let word = context.matchBefore(/\w+/);
    if (!word) return context.explicit ? { from: context.pos, options: cesKeywords } : null;
    return {
        from: word.from,
        options: cesKeywords,
        validFor: /^\w*$/
    };
}

let lintTimeout = null;
function scheduleLint(view) {
    if (lintTimeout) clearTimeout(lintTimeout);
    lintTimeout = setTimeout(() => {
        if (!currentlyOpenFileHandle || !view || !view.state) return;

        // Performance optimization: skip linting for very large files if needed
        if (view.state.doc.length > 100000) return;

        const code = view.state.doc.toString();
        const result = transpile(code, currentlyOpenFileHandle.name);

        const effects = [clearErrorHighlights.of()];

        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(err => {
                if (err.line) {
                    try {
                        const linesCount = view.state.doc.lines;
                        const targetLine = Math.max(1, Math.min(err.line, linesCount));
                        const line = view.state.doc.line(targetLine);
                        effects.push(addErrorHighlight.of({ from: line.from, to: line.to }));
                    } catch(e) {}
                }
            });
        }

        // Dispatch all changes in a single transaction for efficiency and to avoid focus loops
        // Use requestAnimationFrame to ensure we don't block the UI thread during heavy typing
        requestAnimationFrame(() => {
            if (view && view.dispatch && view.state) {
                view.dispatch({ effects });
            }
        });
    }, 1500); // Increased debounce to 1.5s for smoother typing experience
}


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
                    autocompletion({ override: [cesCompletions] }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            scheduleLint(update.view);
                        }
                    }),
                    keymap.of([
                        { key: "Tab", run: acceptCompletion },
                        indentWithTab,
                        ...completionKeymap
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
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_SIN_SCRIPT_ABIERTO', 'No hay ningun script abierto para guardar.'));
        return;
    }

    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
    if (!isChc && !codeEditor) {
        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_SIN_SCRIPT_ABIERTO', 'No hay ningun script abierto para guardar.'));
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
            console.error(`${L.get('ERROR_COMPILACION', 'Errores de compilacion en')} ${currentlyOpenFileHandle.name}:`);
            result.errors.forEach(error => window.logToUIConsole(error, 'error', false));

            window.Dialogs.showNotification(
                L.get('AVISO', 'Aviso'),
                `${L.get('EXITO_SCRIPT_GUARDADO', "Script guardado")} pero tiene ERRORES DE SINTAXIS. Revisa la consola.`,
                'warning'
            );
            showConsoleCallback(); // Muestra la consola al usuario
        } else {
            console.log(`${currentlyOpenFileHandle.name}: ${L.get('EXITO_COMPILACION', 'Script compilado exitosamente.')}`);
            window.Dialogs.showNotification(L.get('EXITO', 'Exito'), `${L.get('EXITO_SCRIPT_GUARDADO', "Script guardado correctamente")}: '${currentlyOpenFileHandle.name}'.`);
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
        window.Dialogs.showNotification(L.get('TITULO_CONFIG_REQUERIDA', 'Configuracion Requerida'), L.get('ERROR_CONFIG_CARL', 'Para usar CHC, debes configurar Carl IA en las Preferencias del motor.'));
        return;
    }

    dom.chcLoadingOverlay.classList.remove('hidden');
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_LLAMANDO_CARL', 'Llamando a Carl IA...');
    dom.chcRunBtn.classList.add('compiling');
    dom.chcRunBtn.innerHTML = `<img src="icons/bot.svg" class="ce-icon" style="filter: brightness(0) invert(1);"> ${L.get('MSG_CARL_PENSANDO', 'Carl esta pensando...')}`;

    // Simulate analysis phase for better UX
    await new Promise(r => setTimeout(r, 800));
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_CARL_ANALIZANDO', 'Carl esta analizando tu logica creativa...');

    const prompt = `Actua como el traductor de Creative H-Code (CHC) para Creative Engine.
Tu tarea es traducir la descripcion humana del comportamiento de un objeto en un script valido de Creative Engine (.ces).

REGLAS TECNICAS (Sintaxis CES):
1. IMPORTACIONES: OBLIGATORIO! Empieza siempre con 've motor;'.
2. IDIOMA: Usa SIEMPRE el espanol! (si, sino, mientras, para, retornar, verdadero, falso, variable, constante, materia, mtr, numero, texto, booleano).
3. ESTRUCTURA DE VARIABLES:
   - 'publico numero velocidad = 5;'
   - 'publico texto nombre = "Heroe";'
   - 'publico mtr objetivo;'
   - 'publico Sprite icono;'
   - 'publico Audio sonido;'
   - 'publico Prefab enemigo;'
   - 'publico Scene siguienteNivel;'
4. ACCESO DIRECTO (IMPORTANTE! No uses 'this.', 'entrada.' ni 'motor.'):
   - nombre, tag, posicion, fisica, renderizadorDeSprite, controladorAnimacion, fuenteDeAudio, camara, rejilla, lienzo.
   - Atajos: reproducir.Estado(), voltearH, voltearV.
   - Entrada: teclaPresionada("W"), mandoBotonPresionado("A"), mandoEje("IzquierdaX"), botonMousePresionado(0), obtenerPosicionMouse().
5. EVENTOS: 'alEmpezar()', 'alActualizar(delta)', 'actualizarFijo(delta)', 'alEntrarEnColision(otro)', 'alRecibir(mensaje, datos)', 'alHacerClick()'.
6. TIEMPO Y FLUJO:
   - 'esperar(segundos)' (usa await internamente, pero el usuario escribe esperar(1)).
   - 'cada(segundos) { ... }' (Timers simplificados).
7. ACCIONES COMUNES:
   - lanzarRayo(origen, direccion, dist, tag), buscar(nombre), estaTocandoTag(tag).
   - crear miPrefab; o instanciar(miPrefab, posicion);
   - destruir(materia), destroy(materia).
   - difundir("mensaje", datos), broadcast("mensaje", datos).
8. REGLA DE ORO: Devuelve UNICAMENTE el codigo .ces. Sin explicaciones, sin markdown, sin bloques de codigo.

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

            // Validar codigo generado
            const validation = transpile(generatedCode, currentlyOpenFileHandle.name);
            if (!validation.errors || validation.errors.length === 0) {
                finalGeneratedCode = generatedCode;
                console.log(`CHC Traducido con exito para ${currentlyOpenFileHandle.name} (Intento ${attempts})`);
                break;
            }

            console.warn(`[CHC] Intento ${attempts} fallido con errores de sintaxis:`, validation.errors);
            if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_CARL_CORRIGIENDO', 'Carl esta corrigiendo errores ({attempts})...').replace('{attempts}', attempts);

            currentPrompt = `El codigo que generaste tiene ERRORES DE SINTAXIS. Por favor, corrigelo.
Asegurate de:
- Definir las variables correctamente (ej: variable x = 1;)
- Definir los metodos correctamente (ej: alActualizar() { ... })
- NO incluir NINGUNA explicacion ni texto fuera del codigo.

CODIGO CON ERRORES:
${generatedCode}

ERRORES ENCONTRADOS:
${validation.errors.join('\n')}

Por favor, devuelve solo el codigo corregido y funcional.`;
        }

        if (!finalGeneratedCode) {
            throw new Error(L.get('ERROR_CARL_FAILED', "Carl IA no pudo generar un codigo libre de errores tras varios intentos."));
        }

        if (dom.chcLoadingText) dom.chcLoadingText.textContent = L.get('MSG_GUARDANDO_LOGICA', 'Guardando logica traducida...');

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

        window.Dialogs.showNotification(L.get('TITULO_CARL_IA', 'Carl IA'), L.get('MSG_CARL_EXITO', 'Listo! He traducido tu idea. Mira como cobra vida!'));

    } catch (error) {
        console.error("CHC Error:", error);
        window.Dialogs.showNotification(L.get('ERROR_CARL_PROCESO', 'Error de Carl IA'), `${L.get('ERROR_CARL_PROCESO', "Vaya, algo salio mal al procesar tu logica")}: ${error.message}`);
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
                                window.Dialogs.showNotification(L.get('EXITO'), `Componente ${result.addComponent.componentType} anadido con exito.`);
                                if (window.updateInspector) window.updateInspector();
                            }
                        }
                    }
                );
            } else {
                window.Dialogs.showNotification(
                    result.success ? L.get('EXITO', 'Exito') : L.get('AVISO', 'Aviso'),
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
                            window.Dialogs.showNotification(L.get('EXITO'), `Componente ${result.addComponent.componentType} anadido con exito.`);
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
    console.log(`[CodeEditor] Abriendo ${fileName} en la linea ${lineNumber}`);

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
                selection: { anchor: line.from, head: line.to },
                effects: [
                    clearErrorHighlights.of(),
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
                        <span class="item-name">${L.get('VERSION', 'Version')} ${history.length - index}</span>
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
                    window.Dialogs.showNotification(L.get('EXITO', 'Exito'), L.get('VERSION_RESTAURADA', 'Version restaurada en el editor. Recuerda guardar para aplicar los cambios.'));
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
