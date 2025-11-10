// js/editor/ui/LibraryWindow.js

let dom = {};
let projectsDirHandle = null;

// --- Helper Functions ---

/**
 * Reads an image file from a file input and returns its Base64 representation.
 * @param {File} file The image file.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Reads a text file (like a JS script) and returns its Base64 representation.
 * @param {File} file The text file.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
function scriptToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            // reader.result contains the file's text content.
            // We need to encode it to Base64.
            const base64Content = btoa(unescape(encodeURIComponent(reader.result)));
            resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}


// --- Core Module Functions ---

/**
 * Scans the project's 'lib' directory for .celib files and renders them.
 */
async function refreshLibraryList() {
    const container = document.getElementById('library-list-container');
    container.innerHTML = ''; // Clear current list

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

        const libraries = [];
        for await (const entry of libDirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
                try {
                    const file = await entry.getFile();
                    const content = await file.text();
                    const libData = JSON.parse(content);
                    libraries.push({ name: entry.name, data: libData });
                } catch (e) {
                    console.error(`Error parsing library file ${entry.name}:`, e);
                }
            }
        }

        if (libraries.length === 0) {
            container.innerHTML = `
                <div class="panel-overlay-message">
                    <p>No se encontraron librerías en la carpeta /lib del proyecto.</p>
                    <p>Usa 'Crear' para empezar una nueva o 'Importar' para añadir un archivo .celib existente.</p>
                </div>`;
            return;
        }

        // Render library cards
        libraries.forEach(lib => {
            const card = document.createElement('div');
            card.className = 'library-card';
            card.innerHTML = `
                <img src="${lib.data.library_icon_base64 || 'image/Paquete.png'}" class="library-icon">
                <div class="library-info">
                    <div class="library-header">
                        <h3 class="library-name">${lib.data.name || 'Sin Nombre'}</h3>
                        <span class="library-version">v${lib.data.version || '0.0.0'}</span>
                    </div>
                    <div class="library-author">
                        <img src="${lib.data.author_icon_base64 || 'image/Paquete.png'}" class="author-icon">
                        <span>${lib.data.author || 'Anónimo'}</span>
                    </div>
                </div>
                <div class="library-actions">
                    <button class="btn-toggle-activate" data-lib-name="${lib.name}" title="Activar/Desactivar">🔘</button>
                    <button class="btn-delete-library" data-lib-name="${lib.name}" title="Eliminar del Proyecto">🗑️</button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar la lista de librerías:", error);
        container.innerHTML = `<div class="panel-overlay-message"><p>Error al acceder al directorio 'lib'.</p></div>`;
    }
}

/**
 * Handles the logic to create and save a new .celib file.
 */
async function handleCreateLibrary() {
    // 1. Get all data from the modal form
    const libName = dom.libCreateName.value.trim();
    if (!libName) {
        alert("El nombre de la librería es obligatorio.");
        return;
    }

    const libData = {
        name: libName,
        author: dom.libCreateAuthor.value.trim(),
        version: dom.libCreateVersion.value.trim() || '1.0.0',
        signature: dom.libCreateSignature.value.trim(),
        description: dom.libCreateDescription.value,
        api_access: {
            can_create_windows: dom.libCreateReqWindows.checked,
            runtime_accessible: dom.libCreateRuntimeAccess.checked,
            is_engine_tool: dom.libCreateIsTool.checked,
        },
        library_icon_base64: null,
        author_icon_base64: null,
        script_base64: null,
    };

    // 2. Convert images and script to Base64
    const iconFile = dom.libCreateIconInput.files[0];
    const authorIconFile = dom.libCreateAuthorIconInput.files[0];
    const scriptFile = dom.libCreateScriptInput.files[0];

    if (!scriptFile) {
        alert("Debes seleccionar un archivo de script (.js).");
        return;
    }

    try {
        libData.library_icon_base64 = await imageToBase64(iconFile);
        libData.author_icon_base64 = await imageToBase64(authorIconFile);
        libData.script_base64 = await scriptToBase64(scriptFile);
    } catch (error) {
        console.error("Error al procesar los archivos:", error);
        alert("Hubo un error al leer uno de los archivos seleccionados.");
        return;
    }

    // 3. Save the .celib file
    const fileName = `${libName.replace(/\s+/g, '_')}.celib`;
    const fileContent = JSON.stringify(libData, null, 2);

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });
        const fileHandle = await libDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();

        alert(`Librería '${libName}' creada con éxito.`);
        dom.createLibraryModal.classList.remove('is-open');
        refreshLibraryList(); // Update the view

    } catch (error) {
        console.error("Error al guardar el archivo de la librería:", error);
        alert("No se pudo guardar el archivo .celib.");
    }
}


/**
 * Initializes the Library Window module.
 * @param {object} editorDom The cached DOM elements from editor.js
 * @param {FileSystemDirectoryHandle} handle The handle to the projects directory.
 */
export function initialize(editorDom, handle) {
    dom = editorDom;
    projectsDirHandle = handle;

    // --- Cache specific DOM elements ---
    dom.menubarLibrariesBtn = document.getElementById('menubar-libraries-btn');
    dom.libraryPanel = document.getElementById('library-panel');
    dom.libraryPanelCreateBtn = document.getElementById('library-panel-create-btn');
    dom.libraryPanelImportBtn = document.getElementById('library-panel-import-btn');
    dom.libraryPanelExportBtn = document.getElementById('library-panel-export-btn');
    dom.createLibraryModal = document.getElementById('create-library-modal');

    // Form inputs
    dom.libCreateName = document.getElementById('lib-create-name');
    dom.libCreateAuthor = document.getElementById('lib-create-author');
    dom.libCreateVersion = document.getElementById('lib-create-version');
    dom.libCreateSignature = document.getElementById('lib-create-signature');
    dom.libCreateDescription = document.getElementById('lib-create-description');
    dom.libCreateReqWindows = document.getElementById('lib-create-req-windows');
    dom.libCreateRuntimeAccess = document.getElementById('lib-create-runtime-access');
    dom.libCreateIsTool = document.getElementById('lib-create-is-tool');

    // File pickers and previews
    dom.libCreateIconPreview = document.getElementById('lib-create-icon-preview');
    dom.libCreateIconPickerBtn = document.getElementById('lib-create-icon-picker-btn');
    dom.libCreateIconInput = document.getElementById('lib-create-icon-input');
    dom.libCreateAuthorIconPreview = document.getElementById('lib-create-author-icon-preview');
    dom.libCreateAuthorIconPickerBtn = document.getElementById('lib-create-author-icon-picker-btn');
    dom.libCreateAuthorIconInput = document.getElementById('lib-create-author-icon-input');
    dom.libCreateScriptPath = document.getElementById('lib-create-script-path');
    dom.libCreateScriptPickerBtn = document.getElementById('lib-create-script-picker-btn');
    dom.libCreateScriptInput = document.getElementById('lib-create-script-input');

    // Modal buttons
    dom.libCreateConfirmBtn = document.getElementById('lib-create-confirm-btn');
    dom.libCreateCancelBtn = document.getElementById('lib-create-cancel-btn');


    // --- Event Listeners ---
    if (dom.menubarLibrariesBtn) {
        dom.menubarLibrariesBtn.addEventListener('click', () => {
            dom.libraryPanel.classList.toggle('hidden');
            if (!dom.libraryPanel.classList.contains('hidden')) {
                refreshLibraryList();
            }
        });
    }

    if (dom.libraryPanelCreateBtn) {
        dom.libraryPanelCreateBtn.addEventListener('click', () => {
            // Reset form before showing
            dom.createLibraryModal.querySelector('.settings-form').reset();
            dom.libCreateIconPreview.src = 'image/Paquete.png';
            dom.libCreateAuthorIconPreview.src = 'image/Paquete.png';
            dom.libCreateScriptPath.value = 'Ningún script seleccionado';
            dom.createLibraryModal.classList.add('is-open');
        });
    }

    if (dom.libraryPanelImportBtn) {
        dom.libraryPanelImportBtn.addEventListener('click', () => {
            alert("La funcionalidad de importar librerías aún no está implementada.");
        });
    }

    if (dom.libraryPanelExportBtn) {
        dom.libraryPanelExportBtn.addEventListener('click', () => {
            alert("La funcionalidad de exportar librerías aún no está implementada.");
        });
    }

    if (dom.libCreateCancelBtn) {
        dom.libCreateCancelBtn.addEventListener('click', () => {
             dom.createLibraryModal.classList.remove('is-open');
        });
    }

    // File Picker Button Handlers
    dom.libCreateIconPickerBtn.addEventListener('click', () => dom.libCreateIconInput.click());
    dom.libCreateAuthorIconPickerBtn.addEventListener('click', () => dom.libCreateAuthorIconInput.click());
    dom.libCreateScriptPickerBtn.addEventListener('click', () => dom.libCreateScriptInput.click());

    // File Input Change Handlers
    dom.libCreateIconInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            dom.libCreateIconPreview.src = URL.createObjectURL(e.target.files[0]);
        }
    });
    dom.libCreateAuthorIconInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            dom.libCreateAuthorIconPreview.src = URL.createObjectURL(e.target.files[0]);
        }
    });
    dom.libCreateScriptInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            dom.libCreateScriptPath.value = e.target.files[0].name;
        }
    });

    // Confirmation button
    dom.libCreateConfirmBtn.addEventListener('click', handleCreateLibrary);

    // Placeholder for actions on library cards (delegated event listener)
    document.getElementById('library-list-container').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-delete-library')) {
            const libName = target.dataset.libName;
            if (confirm(`¿Estás seguro de que quieres eliminar la librería '${libName}' del proyecto? Esta acción no se puede deshacer.`)) {
                // To-do: Implement file deletion logic
                console.log(`Solicitado eliminar: ${libName}`);
                alert("La funcionalidad de eliminación aún no está implementada.");
            }
        }
        if (target.classList.contains('btn-toggle-activate')) {
            // To-do: Implement activation/deactivation logic
            console.log(`Toggle activate for: ${target.dataset.libName}`);
            alert("La funcionalidad de activar/desactivar aún no está implementada.");
        }
    });

    console.log("Módulo de la Ventana de Librerías inicializado.");
}
