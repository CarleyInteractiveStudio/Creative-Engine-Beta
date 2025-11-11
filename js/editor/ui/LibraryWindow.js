// js/editor/ui/LibraryWindow.js

let dom = {};
let projectsDirHandle = null;
let exportLibrariesAsPackage = null; // To hold the function from another module

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

                    // Check activation status from .meta file
                    let isActive = true;
                    try {
                        const metaFileHandle = await libDirHandle.getFileHandle(`${entry.name}.meta`);
                        const metaFile = await metaFileHandle.getFile();
                        const metaContent = await metaFile.text();
                        const metaData = JSON.parse(metaContent);
                        if (metaData.active === false) {
                            isActive = false;
                        }
                    } catch (e) {
                        // Meta file not found or invalid, defaults to active
                    }

                    libraries.push({ name: entry.name, data: libData, isActive: isActive });
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
            card.className = `library-card ${lib.isActive ? 'active' : 'inactive'}`;
            card.innerHTML = `
                <input type="checkbox" class="library-select-checkbox" data-lib-name="${lib.name}">
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
                    <button class="btn-toggle-activate ${lib.isActive ? 'state-active' : 'state-inactive'}" data-lib-name="${lib.name}" title="Activar/Desactivar"></button>
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

async function handleImportLibrary() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Creative Engine Library', accept: { 'application/json': ['.celib'] } }],
            multiple: false,
        });

        const file = await fileHandle.getFile();
        const content = await file.text();
        const newLibData = JSON.parse(content);

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

        let finalFileName = fileHandle.name;
        let shouldWriteFile = true;

        // Check for existing file with the same name
        try {
            const existingFileHandle = await libDirHandle.getFileHandle(fileHandle.name);
            const existingFile = await existingFileHandle.getFile();
            const existingContent = await existingFile.text();
            const existingLibData = JSON.parse(existingContent);

            // Compare signature and author for version check
            if (existingLibData.signature === newLibData.signature && existingLibData.author === newLibData.author) {
                // Version comparison logic (simple string comparison for now)
                if (newLibData.version > existingLibData.version) {
                    // Automatically update
                    console.log(`Actualizando librería '${newLibData.name}' de v${existingLibData.version} a v${newLibData.version}.`);
                } else if (newLibData.version < existingLibData.version) {
                    if (!confirm(`Ya tienes una versión más reciente (v${existingLibData.version}) de '${newLibData.name}'. ¿Seguro que quieres instalar esta versión anterior (v${newLibData.version})?`)) {
                        shouldWriteFile = false;
                    }
                } else {
                    alert(`La librería '${newLibData.name}' ya está en la versión ${newLibData.version}. No se requiere ninguna acción.`);
                    shouldWriteFile = false;
                }
            } else {
                // Name conflict, but different library. Rename.
                finalFileName = `${newLibData.name}_${newLibData.author || 'unknown'}.celib`;
                let counter = 1;
                while (true) {
                    try {
                        await libDirHandle.getFileHandle(finalFileName);
                        // if it exists, append number and try again
                        finalFileName = `${newLibData.name}_${newLibData.author || 'unknown'}_${counter}.celib`;
                        counter++;
                    } catch (e) {
                        // File does not exist, we found a free name
                        break;
                    }
                }
            }
        } catch (e) {
            // No existing file found, proceed as normal.
        }

        if (shouldWriteFile) {
            const newFileHandle = await libDirHandle.getFileHandle(finalFileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            alert(`Librería '${newLibData.name}' importada con éxito como '${finalFileName}'.`);
            refreshLibraryList();
        }

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Error al importar la librería:", err);
            alert("Ocurrió un error durante la importación.");
        }
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
 * @param {function} exportFunc The function to call for exporting library packages.
 */
export function initialize(editorDom, handle, exportFunc) {
    dom = editorDom;
    projectsDirHandle = handle;
    exportLibrariesAsPackage = exportFunc;

    // --- Cache specific DOM elements ---
    dom.menubarLibrariesBtn = document.getElementById('menubar-libraries-btn');
    dom.libraryPanel = document.getElementById('library-panel');
    dom.libraryPanelCreateBtn = document.getElementById('library-panel-create-btn');
    dom.libraryPanelImportBtn = document.getElementById('library-panel-import-btn');
    dom.libraryPanelExportBtn = document.getElementById('library-panel-export-btn');
    dom.createLibraryModal = document.getElementById('create-library-modal');

    // API Docs Modal Elements
    dom.libraryApiDocsBtn = document.getElementById('library-api-docs-btn');
    dom.libraryApiDocsModal = document.getElementById('library-api-docs-modal');
    dom.libraryApiDocsCloseBtn = document.getElementById('library-api-docs-close-btn');

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
        dom.libraryPanelImportBtn.addEventListener('click', handleImportLibrary);
    }

    if (dom.libraryPanelExportBtn) {
        dom.libraryPanelExportBtn.addEventListener('click', handleExportSelectedLibraries);
    }

    // --- API Docs Modal Listeners ---
    if (dom.libraryApiDocsBtn) {
        dom.libraryApiDocsBtn.addEventListener('click', () => {
            dom.libraryApiDocsModal.classList.add('is-open');
        });
    }

    if (dom.libraryApiDocsCloseBtn) {
        dom.libraryApiDocsCloseBtn.addEventListener('click', () => {
            dom.libraryApiDocsModal.classList.remove('is-open');
        });
    }

    // Also close the docs modal with the generic close button
    const docsModalCloseButton = dom.libraryApiDocsModal.querySelector('.close-button');
    if (docsModalCloseButton) {
        docsModalCloseButton.addEventListener('click', () => {
            dom.libraryApiDocsModal.classList.remove('is-open');
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

    async function toggleLibraryActivation(libName) {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib');
        const metaFileName = `${libName}.meta`;

        let currentState = true;
        try {
            const metaFileHandle = await libDirHandle.getFileHandle(metaFileName);
            const metaFile = await metaFileHandle.getFile();
            const metaContent = await metaFile.text();
            const metaData = JSON.parse(metaContent);
            if (metaData.active === false) {
                currentState = false;
            }
        } catch (e) {
            // Meta file doesn't exist, so it's considered active.
        }

        const newState = !currentState;
        try {
            const metaFileHandle = await libDirHandle.getFileHandle(metaFileName, { create: true });
            const writable = await metaFileHandle.createWritable();
            await writable.write(JSON.stringify({ active: newState }, null, 2));
            await writable.close();

            alert(`La librería ha sido ${newState ? 'activada' : 'desactivada'}. Por favor, reinicia el editor para aplicar los cambios.`);
            refreshLibraryList();

        } catch (error) {
            console.error(`Error al actualizar el estado de la librería '${libName}':`, error);
            alert("No se pudo actualizar el estado de la librería.");
        }
    }
    async function handleDeleteLibrary(libName) {
        if (!confirm(`¿Estás seguro de que quieres eliminar la librería '${libName}' del proyecto? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const libDirHandle = await projectHandle.getDirectoryHandle('lib');

            // Delete .celib file
            await libDirHandle.removeEntry(libName);
            console.log(`Librería '${libName}' eliminada.`);

            // Try to delete .meta file, ignore if it doesn't exist
            try {
                await libDirHandle.removeEntry(`${libName}.meta`);
                console.log(`Metadatos de '${libName}' eliminados.`);
            } catch (e) {
                // Meta file didn't exist, which is fine.
            }

            alert("Librería eliminada. Reinicia el editor para que los cambios surtan efecto.");
            refreshLibraryList();

        } catch (error) {
            console.error(`Error al eliminar la librería '${libName}':`, error);
            alert("No se pudo eliminar la librería.");
        }
    }

    function handleExportSelectedLibraries() {
        const selectedCheckboxes = document.querySelectorAll('#library-list-container .library-select-checkbox:checked');
        const libraryNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.libName);

        if (libraryNames.length === 0) {
            alert("Por favor, selecciona al menos una librería para exportar.");
            return;
        }

        if (exportLibrariesAsPackage) {
            exportLibrariesAsPackage(libraryNames);
        } else {
            console.error("La función de exportación no está disponible.");
            alert("Error: La funcionalidad de exportación de paquetes no se ha cargado correctamente.");
        }
    }

    // Placeholder for actions on library cards (delegated event listener)
    document.getElementById('library-list-container').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-delete-library')) {
            const libName = target.dataset.libName;
            handleDeleteLibrary(libName);
        }
        if (target.classList.contains('btn-toggle-activate')) {
            const libName = target.dataset.libName;
            toggleLibraryActivation(libName);
        }
    });

    console.log("Módulo de la Ventana de Librerías inicializado.");

    // Return the refresh function so other modules can trigger an update
    return {
        refreshLibraryList
    };
}
