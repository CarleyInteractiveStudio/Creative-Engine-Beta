// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { transpile } from './CES_Transpiler.js'; // Import transpiler

// --- Module State ---
let dom;
let codeEditor = null;
let currentlyOpenFileHandle = null;
let showConsoleCallback = () => {}; // Placeholder for the callback

// --- Autocomplete Logic ---
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
        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();

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
    if (!currentlyOpenFileHandle || !codeEditor) {
        window.Dialogs.showNotification('Aviso', 'No hay ningún script abierto para guardar.');
        return;
    }
    try {
        const scriptContent = codeEditor.state.doc.toString();
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

export function initialize(domCache, showConsole) {
    dom = domCache;
    showConsoleCallback = showConsole; // Almacena el callback

    // Configura los event listeners para los botones de la barra de herramientas
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());
}
