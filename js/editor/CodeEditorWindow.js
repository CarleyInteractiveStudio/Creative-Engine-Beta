// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";

// --- Module State ---
let dom;
let codeEditor = null;
let currentlyOpenFileHandle = null;

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
        alert(`No se pudo abrir el script. Revisa la consola.`);
    }
}

export async function saveCurrentScript() {
    if (!currentlyOpenFileHandle || !codeEditor) {
        alert("No hay ningún script abierto para guardar.");
        return;
    }
    try {
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(codeEditor.state.doc.toString());
        await writable.close();
        console.log(`Script '${currentlyOpenFileHandle.name}' guardado.`);
    } catch (error) {
        console.error("Error al guardar el script:", error);
        alert("No se pudo guardar el script.");
    }
}

export function undoLastChange() {
    if (codeEditor) undo(codeEditor);
}

export function redoLastChange() {
    if (codeEditor) redo(codeEditor);
}

export function initialize(domCache) {
    dom = domCache;

    // Setup event listeners for toolbar buttons
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());
}
