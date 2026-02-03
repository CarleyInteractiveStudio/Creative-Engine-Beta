// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
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
    { label: "public", type: "keyword" },
    { label: "private", type: "keyword" },
    { label: "sprite", type: "type" },
    { label: "SpriteAnimacion", type: "type" },
    { label: "crear", type: "function" },
    { label: "destruir", type: "function" },
    { label: "reproducir", type: "function" },
    { label: "obtener", type: "function" },
    { label: "si", type: "keyword" },
    { label: "sino", type: "keyword" },
    { label: "para", type: "keyword" },
    { label: "mientras", type: "keyword" },
    { label: "start", type: "function" },
    { label: "update", type: "function" }
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
                    autocompletion({ override: [cesCompletions] })
                ],
                parent: dom.codemirrorContainer
            });
        } else {
            codeEditor.dispatch({
                changes: { from: 0, to: codeEditor.state.doc.length, insert: content }
            });
        }

        scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
        console.log(`Abierto ${fileName} en el editor.`);
    } catch (error) {
        console.error(`Error al abrir el script '${fileName}':`, error);
        window.Dialogs.showNotification('Error', `No se pudo abrir el script '${fileName}'. Revisa la consola.`);
    }
}

export async function saveCurrentScript() {
    if (!currentlyOpenFileHandle) {
        window.Dialogs.showNotification('Aviso', 'No hay ningún script abierto para guardar.');
        return;
    }

    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
    if (!isChc && !codeEditor) {
        window.Dialogs.showNotification('Aviso', 'No hay ningún script abierto para guardar.');
        return;
    }

    try {
        const scriptContent = isChc ? dom.chcHumanText.value : codeEditor.state.doc.toString();
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(scriptContent);
        await writable.close();
        window.Dialogs.showNotification('Éxito', `Script '${currentlyOpenFileHandle.name}' guardado.`);

        // Ahora, transpila y comprueba si hay errores
        console.clear(); // Limpia la consola antes de mostrar nuevos errores
        const result = transpile(scriptContent, currentlyOpenFileHandle.name);
        if (result.errors && result.errors.length > 0) {
            console.error(`Errores de compilación en ${currentlyOpenFileHandle.name}:`);
            result.errors.forEach(error => console.error(`- ${error}`));
            showConsoleCallback(); // Muestra la consola al usuario
        } else {
            console.log(`Script ${currentlyOpenFileHandle.name} compilado exitosamente.`);
        }

    } catch (error) {
        console.error("Error al guardar el script:", error);
        window.Dialogs.showNotification('Error', 'No se pudo guardar el script.');
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

    const humanText = dom.chcHumanText.value.trim();
    if (!humanText) {
        window.Dialogs.showNotification('Aviso', 'Por favor, escribe algo antes de correr el script.');
        return;
    }

    const prefs = getPreferences();
    const provider = prefs.ai?.provider;
    const apiKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

    if (!provider || provider === 'none' || !apiKey) {
        window.Dialogs.showNotification('Configuración Requerida', 'Para usar CHC, debes configurar Carl IA en las Preferencias del motor.');
        return;
    }

    dom.chcLoadingOverlay.classList.remove('hidden');
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Llamando a Carl IA...';
    dom.chcRunBtn.classList.add('compiling');
    dom.chcRunBtn.textContent = '🤖 Carl está pensando...';

    // Simulate analysis phase for better UX
    await new Promise(r => setTimeout(r, 800));
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Carl está analizando tu lógica creativa...';

    const prompt = `Actúa como el traductor de Creative H-Code (CHC) para Creative Engine.
Tu tarea es traducir la descripción humana del comportamiento de un objeto en un script válido de Creative Engine (.ces).

REGLAS ESTRICTAS:
1. Usa sintaxis de .ces (ej: public number speed = 5;, public star() { ... }, public update(deltaTime) { ... }).
2. Solo implementa EXACTAMENTE lo que el usuario describe. No añadas funcionalidades extra. Si el usuario no menciona una acción, NO la inventes.
3. El script DEBE ser independiente y funcional por sí solo.
4. Las variables de configuración deben ser 'public' para aparecer en el Inspector.
5. Usa 'consola.imprimir()' para depuración.
6. El motor usa un sistema de coordenadas Y hacia abajo (Y aumenta al bajar).
7. Para detectar teclas usa: Entrada.tecla("nombre_tecla").
8. Devuelve ÚNICAMENTE el código .ces, sin explicaciones ni bloques de markdown.

EJEMPLOS DE TRADUCCIÓN:

Usuario: "Si se presiona la tecla W que se mueva arriba. Si se presiona D que se mueva a la derecha."
IA:
public number velocidad = 5;
public update(deltaTime) {
    si (Entrada.tecla("w")) {
        transform.y -= velocidad;
    }
    si (Entrada.tecla("d")) {
        transform.x += velocidad;
    }
}

Usuario: "Al iniciar, imprime 'Hola'. Rota el objeto constantemente."
IA:
public number velocidadGiro = 2;
public star() {
    consola.imprimir("Hola");
}
public update(deltaTime) {
    transform.rotation += velocidadGiro;
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

        const result = await AIHandler.callGenerativeAI(provider, modelToUse, apiKey, prompt);

        if (result.success) {
            if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Traducción completada. Generando código del motor...';
            let generatedCode = result.text.trim();
            // Clean markdown if AI included it
            generatedCode = generatedCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');

            console.log(`CHC Traducido con éxito para ${currentlyOpenFileHandle.name}`);

            // Save Human text to .chc
            const writable = await currentlyOpenFileHandle.createWritable();
            await writable.write(humanText);
            await writable.close();

            // Save Generated code to .chc.meta (used by the engine at runtime)
            const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
            const metaHandle = await currentlyOpenDirHandle.getFileHandle(metaFileName, { create: true });
            const metaWritable = await metaHandle.createWritable();

            const metaData = {
                generatedCode: generatedCode,
                lastGenerated: Date.now()
            };

            await metaWritable.write(JSON.stringify(metaData, null, 2));
            await metaWritable.close();

            // Notify engine to reload transpilation maps
            transpile(generatedCode, currentlyOpenFileHandle.name);

            if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Sincronizando con el motor...';
            // Hot reload in engine
            await hotReloadCallback(currentlyOpenFileHandle.name);
            await new Promise(r => setTimeout(r, 500));

            window.Dialogs.showNotification('Carl IA', '¡Listo! He traducido tu idea. ¡Mira cómo cobra vida!');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("CHC Error:", error);
        window.Dialogs.showNotification('Error de Carl IA', `Vaya, algo salió mal al procesar tu lógica: ${error.message}`);
    } finally {
        dom.chcLoadingOverlay.classList.add('hidden');
        dom.chcRunBtn.classList.remove('compiling');
        dom.chcRunBtn.textContent = '🚀 Correr';
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
