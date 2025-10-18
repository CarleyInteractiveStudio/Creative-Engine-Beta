// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import * as FCodeEditor from './FCodeEditor.js';
import * as HybridEditor from './HybridEditor.js';
import { blockWidgetsPlugin } from './HybridEditor.js';
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";

// --- Module State ---
let dom;
let codeEditor = null;
let currentlyOpenFileHandle = null;
let currentFileDirHandle = null;
let activeEditorMode = 'pc'; // 'pc', 'pfc', or 'ambos'
let blockDataMap = new Map(); // Stores data for visual blocks in hybrid mode

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
        currentFileDirHandle = dirHandle; // Store the directory handle
        blockDataMap.clear(); // Clear data from previous file

        // 1. Load .ces file content
        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();

        if (!codeEditor) {
            // --- Custom Extension for Drop Events ---
            const dropHandler = EditorView.domEventHandlers({
                drop(event, view) {
                    if (activeEditorMode !== 'ambos') return;

                    const blockInfo = HybridEditor.getDraggedBlockCode();
                    if (blockInfo && blockInfo.id && blockInfo.type) {
                        event.preventDefault();
                        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
                        const placeholder = `[[BLOCK::${blockInfo.id}::${blockInfo.type}]]`;

                        // Add block data to our map
                        blockDataMap.set(blockInfo.id, { type: blockInfo.type, xml: blockInfo.xml });

                        view.dispatch({
                            changes: { from: pos, to: pos, insert: placeholder }
                        });
                    }
                },
            });

            codeEditor = new EditorView({
                doc: content,
                extensions: [
                    basicSetup,
                    javascript(),
                    oneDark,
                    autocompletion({ override: [cesCompletions] }),
                    dropHandler, // Add our custom drop handler
                    blockWidgetsPlugin // Add the plugin to render blocks
                ],
                parent: dom.codemirrorContainer
            });
        } else {
            codeEditor.dispatch({
                changes: { from: 0, to: codeEditor.state.doc.length, insert: content }
            });
        }

        // 2. Load .meta file content
        try {
            const metaFileHandle = await dirHandle.getFileHandle(`${fileName}.meta`);
            const metaFile = await metaFileHandle.getFile();
            const metaContent = await metaFile.text();
            const metaData = JSON.parse(metaContent);

            if (metaData.blocklyXml) {
                FCodeEditor.loadWorkspaceFromXml(metaData.blocklyXml);
            }
            if (metaData.blockDataMap) {
                // Convert the saved object back to a Map
                blockDataMap = new Map(Object.entries(metaData.blockDataMap));
            }
            if (metaData.editorMode) {
                switchEditorMode(metaData.editorMode);
            }
        } catch (metaError) {
            console.log(`No se encontró o no se pudo leer el archivo .meta para ${fileName}. Se usará el modo por defecto.`);
            FCodeEditor.loadWorkspaceFromXml(''); // Clear blockly workspace
            switchEditorMode('pc'); // Default to PC mode
        }

        scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
        console.log(`Abierto ${fileName} en el editor.`);
    } catch (error) {
        console.error(`Error al abrir el script '${fileName}':`, error);
        alert(`No se pudo abrir el script. Revisa la consola.`);
    }
}

export async function saveCurrentScript() {
    if (!currentlyOpenFileHandle || !codeEditor || !currentFileDirHandle) {
        alert("No hay ningún script abierto para guardar.");
        return;
    }

    try {
        // 1. Save the text content to the .ces file
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(codeEditor.state.doc.toString());
        await writable.close();

        // 2. Prepare the metadata
        const blocklyXml = FCodeEditor.getWorkspaceAsXml();
        const metaData = {
            editorMode: activeEditorMode,
            blocklyXml: blocklyXml,
            blockDataMap: Object.fromEntries(blockDataMap) // Convert Map to object for JSON serialization
        };

        // 3. Save the metadata to the .meta file
        const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
        const metaFileHandle = await currentFileDirHandle.getFileHandle(metaFileName, { create: true });
        const metaWritable = await metaFileHandle.createWritable();
        await metaWritable.write(JSON.stringify(metaData, null, 2));
        await metaWritable.close();

        console.log(`Script '${currentlyOpenFileHandle.name}' y sus metadatos guardados.`);

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

function switchEditorMode(mode) {
    activeEditorMode = mode;
    // Hide all panes
    dom.codemirrorContainer.style.display = 'none';
    dom.fcodeEditorContainer.style.display = 'none';
    dom.hybridEditorContainer.style.display = 'none';

    // Deactivate all buttons
    dom.btnPcMode.classList.remove('active');
    dom.btnPfcMode.classList.remove('active');
    dom.btnAmbosMode.classList.remove('active');

    // Show the selected pane and activate the button
    if (mode === 'pc') {
        dom.codemirrorContainer.style.display = 'block';
        dom.btnPcMode.classList.add('active');
        // Move CodeMirror DOM back to its original container if it exists
        if (codeEditor) {
            dom.codemirrorContainer.appendChild(codeEditor.dom);
        }
    } else if (mode === 'pfc') {
        dom.fcodeEditorContainer.style.display = 'block';
        dom.btnPfcMode.classList.add('active');
        // Initialize Blockly workspace on first click and then resize
        FCodeEditor.initWorkspace();
        setTimeout(() => FCodeEditor.resizeWorkspace(), 0);
    } else if (mode === 'ambos') {
        dom.hybridEditorContainer.style.display = 'flex'; // Use flex for the two-column layout
        dom.btnAmbosMode.classList.add('active');
        HybridEditor.initWorkspace(); // Initialize toolbox on first click
        // Move CodeMirror DOM to the hybrid container
        if (codeEditor) {
            dom.hybridCodemirrorContainer.appendChild(codeEditor.dom);
        }
    }
}

export function initialize(domCache) {
    dom = domCache;

    // Setup event listeners for toolbar buttons
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());

    // Setup event listeners for mode switching buttons
    dom.btnPcMode.addEventListener('click', () => switchEditorMode('pc'));
    dom.btnPfcMode.addEventListener('click', () => switchEditorMode('pfc'));
    dom.btnAmbosMode.addEventListener('click', () => switchEditorMode('ambos'));

    // Set initial mode
    switchEditorMode('pc');
}
