// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo, indentWithTab } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion, acceptCompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { keymap } from "https://esm.sh/@codemirror/view@6.26.3";
import { transpile } from './CES_Transpiler.js';
import * as AIHandler from './AIHandler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

// --- Module State ---
let dom;
let codeEditor = null;
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
    let word = context.matchBefore(/\w*/);
    if (word.from == word.to && !context.explicit) {
        return null;
    }
    return {
        from: word.from,
        options: cesKeywords
    };
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
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(scriptContent);
        await writable.close();
        window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_SCRIPT_GUARDADO', "Script guardado correctamente")}: '${currentlyOpenFileHandle.name}'.`);

        // Ahora, transpila y comprueba si hay errores
        console.clear(); // Limpia la consola antes de mostrar nuevos errores
        const result = transpile(scriptContent, currentlyOpenFileHandle.name);
        if (result.errors && result.errors.length > 0) {
            console.error(`${L.get('ERROR_COMPILACION', 'Errores de compilación en')} ${currentlyOpenFileHandle.name}:`);
            result.errors.forEach(error => console.error(`- ${error}`));
            showConsoleCallback(); // Muestra la consola al usuario
        } else {
            console.log(`${currentlyOpenFileHandle.name}: ${L.get('EXITO_COMPILACION', 'Script compilado exitosamente.')}`);
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
1. IDIOMA: ¡Usa SIEMPRE el español! (si, sino, mientras, para, retornar, verdadero, falso, variable, constante, materia, mtr, numero, texto, booleano).
2. ESTRUCTURA DE VARIABLES:
   - 'publico numero velocidad = 5;'
   - 'publico texto nombre = "Héroe";'
   - 'publico mtr objetivo;'
   - 'publico Sprite icono;'
   - 'publico Audio sonido;'
   - 'publico Prefab enemigo;'
   - 'publico Scene siguienteNivel;'
3. ACCESO (¡IMPORTANTE! No uses 'this.'):
   - nombre, tag, posicion, fisica, renderizadorDeSprite, controladorAnimacion, fuenteDeAudio, camara, rejilla, mapaDeAzulejos, iaBasica, lienzo.
   - Atajos: reproducir.Estado(), voltearH, voltearV.
4. EVENTOS: 'iniciar()', 'actualizar(delta)', 'alEntrarEnColision(otro)', 'alPermanecerEnColision(otro)', 'alRecibir(mensaje, datos)', 'alHacerClick()'.
5. TIEMPO Y FLUJO:
   - 'esperar(segundos)' (usa await internamente, pero el usuario escribe esperar(1)).
   - 'cada(segundos) { ... }' (Timers simplificados).
6. ACCIONES COMUNES:
   - lanzarRayo(origen, direccion, dist, tag), buscar(nombre), find(nombre).
   - crear miPrefab; o instanciar(miPrefab, posicion);
   - destruir(materia), destroy(materia).
   - difundir("mensaje", datos), broadcast("mensaje", datos).
   - entrada.teclaPresionada("W"), entrada.ratonBajo(0).
7. REGLA DE ORO: Devuelve ÚNICAMENTE el código .ces. Sin explicaciones, sin markdown, sin bloques de código.

EJEMPLO 1 (Movimiento):
ENTRADA: "Mover a la derecha con D y saltar con Espacio."
SALIDA:
publico numero velocidad = 5;
publico numero salto = 10;
actualizar(delta) {
    si (entrada.teclaPresionada("d")) {
        posicion.x += velocidad;
    }
    si (entrada.teclaBaja("Space")) {
        fisica.applyImpulse(nuevo Vector2(0, -salto));
    }
}

EJEMPLO 2 (Combate):
ENTRADA: "Al chocar con tag 'Enemigo', imprimir 'Auch' y esperar 2 segundos para destruir este objeto."
SALIDA:
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
iniciar() {
    cada(3) {
        renderizadorDeSprite.color = "#ff0000";
    }
}

ENTRADA DEL USUARIO:
"${humanText}"`;

    try {
        // Find a working model
        let modelToUse = prefs.ai?.model;

        // Si el proveedor es Hugging Face y no hay modelo/URL específica, usamos la oficial por defecto
        if (provider === 'huggingface' && !modelToUse) {
            modelToUse = 'https://carley1234-chc.hf.space';
        }

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

            let result;
            const maxRetries = 20;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                result = await AIHandler.callGenerativeAI(provider, modelToUse, apiKey, currentPrompt);
                if (result.success) break;
                if (result.code === 'BUSY') {
                    if (dom.chcLoadingText) dom.chcLoadingText.textContent = result.error;
                    await new Promise(r => setTimeout(r, 3000));
                    retryCount++;
                } else {
                    throw new Error(result.error);
                }
            }

            if (!result || !result.success) {
                throw new Error(L.get('ERROR_CARL_FAILED', "Carl IA no pudo generar un código libre de errores tras varios intentos."));
            }

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

export function initialize(domCache, showConsole, hotReload) {
    dom = domCache;
    showConsoleCallback = showConsole; // Almacena el callback
    hotReloadCallback = hotReload;

    // Configura los event listeners para los botones de la barra de herramientas
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());

    // CHC specific
    if (dom.chcRunBtn) {
        dom.chcRunBtn.addEventListener('click', () => runChc());
    }
}
