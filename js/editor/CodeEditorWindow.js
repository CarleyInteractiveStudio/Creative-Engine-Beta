// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, keymap, highlightActiveLine, dropCursor, highlightSpecialChars, drawSelection, indentOnInput } from "https://esm.sh/@codemirror/view@6.26.3";
import { EditorState } from "https://esm.sh/@codemirror/state@6.4.1";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentUnit } from "https://esm.sh/@codemirror/language@6.10.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo, history, standardKeymap } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";

// --- Module State ---
let dom;
let codeEditor = null;
let currentlyOpenFileHandle = null;
let currentDirHandle = null;
let getEditorMode = () => 'PC'; // Default implementation
let saveAssetMeta = async () => { console.warn('saveAssetMeta callback not implemented.'); }; // Default implementation
let setEditorMode = () => { console.warn('setEditorMode callback not implemented.'); }; // Default implementation

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
        currentDirHandle = dirHandle; // Store for saving meta file later

        // --- Load Metadata ---
        let initialMode = 'PC'; // Default for old scripts
        try {
            const metaFileHandle = await dirHandle.getFileHandle(`${fileName}.meta`);
            const metaFile = await metaFileHandle.getFile();
            const metaContent = await metaFile.text();
            const metaData = JSON.parse(metaContent);
            if (metaData && metaData.editorMode) {
                initialMode = metaData.editorMode;
            }
        } catch (error) {
            console.log(`No .meta file found for ${fileName}, defaulting to PC mode.`);
        }

        // Update the main editor's state and UI via callback
        setEditorMode(initialMode);

        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();

        if (!codeEditor) {
            const customSetup = [
                history(),
                drawSelection(),
                dropCursor(),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                highlightActiveLine(),
                keymap.of([
                    ...standardKeymap,
                ])
            ];

            codeEditor = new EditorView({
                doc: content,
                extensions: [
                    customSetup,
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
    if (!currentlyOpenFileHandle || !codeEditor || !currentDirHandle) {
        alert("No hay ningún script abierto para guardar.");
        return;
    }
    try {
        // 1. Save the code content
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(codeEditor.state.doc.toString());
        await writable.close();
        console.log(`Script '${currentlyOpenFileHandle.name}' guardado.`);

        // 2. Save the metadata using the callback
        const metaData = {
            editorMode: getEditorMode()
        };
        await saveAssetMeta(currentlyOpenFileHandle.name, metaData, currentDirHandle);

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

export function getEditor() {
    return codeEditor;
}

export function insertCodeAtCursor(text) {
    if (!codeEditor) return;
    const { from, to } = codeEditor.state.selection.main;
    codeEditor.dispatch({
        changes: { from, to, insert: text }
    });
}

export function initialize(domCache, { getEditorModeCallback, saveAssetMetaCallback, setEditorModeCallback }) {
    dom = domCache;
    getEditorMode = getEditorModeCallback;
    saveAssetMeta = saveAssetMetaCallback;
    setEditorMode = setEditorModeCallback;

    // Setup event listeners for toolbar buttons
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());
}
