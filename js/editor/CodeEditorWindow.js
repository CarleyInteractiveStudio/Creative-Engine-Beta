// --- Module for the Code Editor Window (Monaco) ---

// --- Module State ---
let dom;
let codeEditor = null;
let monacoInstance = null; // Variable to hold the loaded monaco instance
let currentlyOpenFileHandle = null;
let editorInitializationPromise = null;

// --- Private Helpers ---
function getLanguageForFile(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'js':
        case 'ces': // Treat custom script as JavaScript
            return 'javascript';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        default:
            return 'plaintext';
    }
}

function registerCustomAutocompletion(monaco) {
    const cesKeywords = [
        { label: 'public', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'public' },
        { label: 'private', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'private' },
        { label: 'sprite', kind: monaco.languages.CompletionItemKind.Class, insertText: 'sprite' },
        { label: 'SpriteAnimacion', kind: monaco.languages.CompletionItemKind.Class, insertText: 'SpriteAnimacion' },
        { label: 'crear', kind: monaco.languages.CompletionItemKind.Function, insertText: 'crear()' },
        { label: 'destruir', kind: monaco.languages.CompletionItemKind.Function, insertText: 'destruir()' },
        { label: 'reproducir', kind: monaco.languages.CompletionItemKind.Function, insertText: 'reproducir()' },
        { label: 'obtener', kind: monaco.languages.CompletionItemKind.Function, insertText: 'obtener()' },
        { label: 'si', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'si () {\n\t\n}' },
        { label: 'sino', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'sino' },
        { label: 'para', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'para () {\n\t\n}' },
        { label: 'mientras', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'mientras () {\n\t\n}' },
        { label: 'start', kind: monaco.languages.CompletionItemKind.Method, insertText: 'start() {\n\t\n}' },
        { label: 'update', kind: monaco.languages.CompletionItemKind.Method, insertText: 'update() {\n\t\n}' }
    ];

    monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };
            const suggestions = cesKeywords.map(keyword => ({
                ...keyword,
                range: range
            }));
            return { suggestions: suggestions };
        }
    });
}

function ensureEditorInitialized() {
    if (!editorInitializationPromise) {
        editorInitializationPromise = new Promise((resolve, reject) => {
            require(['vs/editor/editor.main'], function (monaco) {
                monacoInstance = monaco; // Store the loaded instance
                if (!dom || !dom.codemirrorContainer) {
                    return reject(new Error("DOM not ready for Monaco Editor initialization."));
                }

                const editor = monaco.editor.create(dom.codemirrorContainer, {
                    value: '', // Initial content is empty
                    language: 'javascript',
                    theme: 'vs-dark',
                    automaticLayout: true // Ensures the editor resizes correctly
                });

                registerCustomAutocompletion(monaco);

                codeEditor = editor; // Assign to module-level variable
                resolve(editor);
            }, (error) => {
                reject(error);
            });
        });
    }
    return editorInitializationPromise;
}

// --- Public API ---

export async function openScriptInEditor(fileName, dirHandle, scenePanel) {
    try {
        // Ensure the editor is initialized before proceeding
        await ensureEditorInitialized();

        currentlyOpenFileHandle = await dirHandle.getFileHandle(fileName);
        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();
        const language = getLanguageForFile(fileName);

        // Now we are sure codeEditor and monacoInstance exist
        codeEditor.setValue(content);
        monacoInstance.editor.setModelLanguage(codeEditor.getModel(), language);
        codeEditor.focus(); // Set focus to the editor to make it editable immediately

        scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
        console.log(`Abierto ${fileName} en el editor con lenguaje ${language}.`);
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
        await writable.write(codeEditor.getValue());
        await writable.close();
        console.log(`Script '${currentlyOpenFileHandle.name}' guardado.`);
    } catch (error) {
        console.error("Error al guardar el script:", error);
        alert("No se pudo guardar el script.");
    }
}

export function undoLastChange() {
    if (codeEditor) {
        codeEditor.getModel().undo();
    }
}

export function redoLastChange() {
    if (codeEditor) {
        codeEditor.getModel().redo();
    }
}

export function initializeEditorView() {
    // This function is called when the code view is activated.
    // It ensures the editor is created if it hasn't been already.
    ensureEditorInitialized();
}

export function initialize(domCache) {
    dom = domCache;

    // Setup event listeners for toolbar buttons
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());
}
