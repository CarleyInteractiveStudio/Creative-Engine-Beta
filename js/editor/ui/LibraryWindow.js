// js/editor/ui/LibraryWindow.js

import { showNotification, showConfirmation } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let exportLibrariesAsPackage = null; // To hold the function from another module
let openAssetSelector = null; // To hold the callback from editor.js
let libraryFiles = []; // To store files for the new library
let mainScriptFile = null; // To store the name of the main script

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
            // Use the new main class for the bubble card
            card.className = `library-card ${lib.isActive ? '' : 'inactive'}`;
            card.dataset.libraryName = lib.data.name;
            card.dataset.fileName = lib.name;

            const authorIconSrc = lib.data.author_icon_base64 || 'image/Paquete.png';
            const libraryIconSrc = lib.data.library_icon_base64 || 'image/Paquete.png';

            card.innerHTML = `
                <!-- 1. Square library icon -->
                <img src="${libraryIconSrc}" class="library-icon">

                <!-- This div groups the text content -->
                <div class="library-info">
                    <!-- 2. Library Name -->
                    <h4 class="library-name">${lib.data.name || 'Sin Nombre'}</h4>

                    <!-- 3. Author Info (Icon + Name) -->
                    <div class="library-author">
                        <img src="${authorIconSrc}" class="author-icon">
                        <span class="author-name">${lib.data.author || 'Anónimo'}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar la lista de librerías:", error);
        container.innerHTML = `<div class="panel-overlay-message"><p>Error al acceder al directorio 'lib'.</p></div>`;
    }
}

async function handleImportLibrary(fileHandleToImport = null) {
    const processFile = async (fileHandle) => {
        try {
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
                    shouldWriteFile = await new Promise(resolve => {
                        showConfirmation(
                            'Versión Anterior',
                            `Ya tienes una versión más reciente (v${existingLibData.version}) de '${newLibData.name}'. ¿Seguro que quieres instalar esta versión anterior (v${newLibData.version})?`,
                            () => resolve(true) // Continue if confirmed
                        );
                        // If not confirmed, the dialog closes and this promise never resolves, effectively stopping the process.
                        // A more robust implementation might handle the 'cancel' case explicitly.
                    });
                } else {
                    showNotification('Sin Cambios', `La librería '${newLibData.name}' ya está en la versión ${newLibData.version}. No se requiere ninguna acción.`);
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
            // --- NEW PERMISSION GRANTING LOGIC ---
            const permissionDescriptions = {
                can_create_windows: "Crear ventanas y paneles en el editor.",
                runtime_accessible: "Ser accedida desde scripts de juego (.ces).",
                is_engine_tool: "Funcionar como una herramienta interna del motor.",
                allow_custom_components: "Registrar nuevos componentes de Materia.",
                allow_asset_modification: "Crear o modificar archivos del proyecto (assets)."
            };

            const requestedPermissions = newLibData.api_access ? Object.entries(newLibData.api_access)
                .filter(([key, value]) => value === true)
                .map(([key]) => permissionDescriptions[key] || `${key} (desconocido)`) : [];

            let userApproved = true;
            if (requestedPermissions.length > 0) {
                const permissionListHTML = `<ul>${requestedPermissions.map(p => `<li>${p}</li>`).join('')}</ul>`;
                const confirmationMessage = `La librería '${newLibData.name}' solicita los siguientes permisos para funcionar correctamente:
                                             ${permissionListHTML}
                                             ¿Confías en el autor y quieres conceder estos permisos?`;

                userApproved = await new Promise(resolve => {
                    showConfirmation(
                        'Permisos de la Librería',
                        confirmationMessage,
                        () => resolve(true),  // On 'Yes'
                        () => resolve(false), // On 'No'
                        () => resolve(false)  // On 'Cancel'
                    );
                });
            }

            if (!userApproved) {
                showNotification('Importación Cancelada', 'No se concedieron los permisos necesarios.');
                return; // Stop the import process
            }
            // --- END NEW LOGIC ---


            const newFileHandle = await libDirHandle.getFileHandle(finalFileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            // After successful write, create the .meta file with permissions
            const metaFileName = `${finalFileName}.meta`;
            const metaFileHandle = await libDirHandle.getFileHandle(metaFileName, { create: true });
            const metaWritable = await metaFileHandle.createWritable();
            const metaData = {
                active: true,
                permissions: newLibData.api_access || {}
            };
            await metaWritable.write(JSON.stringify(metaData, null, 2));
            await metaWritable.close();


            showNotification('Importación Exitosa', `Librería '${newLibData.name}' importada y activada con éxito como '${finalFileName}'.`);
            refreshLibraryList();
        }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Error al procesar el archivo de la librería:", err);
                showNotification('Error', 'Ocurrió un error durante el procesamiento del archivo.');
            }
        }
    };

    if (fileHandleToImport) {
        processFile(fileHandleToImport);
    } else {
        openAssetSelector(processFile, { filter: ['.celib'], title: 'Importar Librería' });
    }
}

/**
 * Core logic to create a library file from data. Can be called from UI or tests.
 * @param {object} libData - The manifest data for the library.
 * @param {File[]} filesToProcess - An array of File objects to be included.
 * @param {File|null} iconFile - The library icon file.
 * @param {File|null} authorIconFile - The author icon file.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export async function createLibraryFile(libData, filesToProcess, iconFile, authorIconFile) {
    if (!projectsDirHandle) {
        showNotification('Error de Entorno', 'La función de creación de librerías no está disponible porque no se pudo acceder al directorio de proyectos.');
        console.error("createLibraryFile falló porque projectsDirHandle es nulo.");
        return false;
    }
    if (!libData.name) {
        showNotification('Error Interno', 'El nombre de la librería es requerido en createLibraryFile.');
        return false;
    }
     if (filesToProcess.length === 0) {
        showNotification('Campo Obligatorio', 'Se debe añadir al menos un archivo de script (.js o .ces).');
        return false;
    }
    if (libData.api_access?.can_create_windows && !filesToProcess.some(f => f.name.endsWith('.js'))) {
        showNotification('Archivo Requerido', 'Para crear ventanas, se necesita un archivo .js como punto de entrada.');
        return false;
    }

    try {
        libData.library_icon_base64 = await imageToBase64(iconFile);
        libData.author_icon_base64 = await imageToBase64(authorIconFile);

        libData.files = {};
        for (const file of filesToProcess) {
            libData.files[file.name] = await scriptToBase64(file);
        }
    } catch (error) {
        console.error("Error processing files for library creation:", error);
        showNotification('Error', 'Hubo un error al leer uno de los archivos seleccionados.');
        return false;
    }

    const fileName = `${libData.name.replace(/\s+/g, '_')}.celib`;
    const fileContent = JSON.stringify(libData, null, 2);

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });
        const fileHandle = await libDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        return true;
    } catch (error) {
        console.error("Error saving the library file:", error);
        showNotification('Error', 'No se pudo guardar el archivo .celib.');
        return false;
    }
}


/**
 * Handles the UI logic for creating a library by gathering data from the modal.
 */
async function handleCreateLibrary() {
    const libName = dom.libCreateName.value.trim();
    if (!libName) {
        showNotification('Campo Obligatorio', 'El nombre de la librería es obligatorio.');
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
            allow_custom_components: dom.libCreateCustomComponents.checked,
            allow_asset_modification: dom.libCreateModifyAssets.checked,
        },
        mainScript: mainScriptFile,
    };

    const iconFile = dom.libCreateIconInput.files[0];
    const authorIconFile = dom.libCreateAuthorIconInput.files[0];

    const success = await createLibraryFile(libData, libraryFiles, iconFile, authorIconFile);

    if (success) {
        showNotification('Éxito', `Librería '${libName}' creada con éxito.`);
        dom.createLibraryModal.classList.remove('is-open');
        refreshLibraryList(); // Update the view
    }
}


/**
 * Initializes the Library Window module.
 * @param {object} editorDom The cached DOM elements from editor.js
 * @param {FileSystemDirectoryHandle} handle The handle to the projects directory.
 * @param {function} exportFunc The function to call for exporting library packages.
 * @param {function} openAssetSelectorCallback The callback to open the asset selector.
 */
export function initialize(editorDom, handle, exportFunc, openAssetSelectorCallback) {
    dom = editorDom; // Use the dom object passed from editor.js
    projectsDirHandle = handle;
    exportLibrariesAsPackage = exportFunc;
    openAssetSelector = openAssetSelectorCallback;

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

            // Reset the new file handling logic
            libraryFiles = [];
            mainScriptFile = null;
            if (dom.libCreateFileList) dom.libCreateFileList.innerHTML = '';
            if (dom.libCreateDropZone) dom.libCreateDropZone.querySelector('p').textContent = 'Arrastra y suelta los archivos aquí, o haz clic para seleccionar.';

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

    // Confirmation button
    dom.libCreateConfirmBtn.addEventListener('click', handleCreateLibrary);

    setupDragAndDrop(); // Initialize the new drag-and-drop functionality

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

            showNotification('Estado Cambiado', `La librería ha sido ${newState ? 'activada' : 'desactivada'}. Por favor, reinicia el editor para aplicar los cambios.`);
            refreshLibraryList();

        } catch (error) {
            console.error(`Error al actualizar el estado de la librería '${libName}':`, error);
            showNotification('Error', 'No se pudo actualizar el estado de la librería.');
        }
    }
    async function handleDeleteLibrary(libName) {
        showConfirmation(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar la librería '${libName}' del proyecto? Esta acción no se puede deshacer.`,
            async () => {
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

                    showNotification('Librería Eliminada', 'Librería eliminada. Reinicia el editor para que los cambios surtan efecto.');
                    refreshLibraryList();

                } catch (error) {
                    console.error(`Error al eliminar la librería '${libName}':`, error);
                    showNotification('Error', 'No se pudo eliminar la librería.');
                }
            }
        );
    }

    function handleExportSelectedLibraries() {
        const selectedCheckboxes = document.querySelectorAll('#library-list-container .library-select-checkbox:checked');
        const libraryNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.libName);

        if (libraryNames.length === 0) {
            showNotification('Error', 'Por favor, selecciona al menos una librería para exportar.');
            return;
        }

        if (exportLibrariesAsPackage) {
            exportLibrariesAsPackage(libraryNames);
        } else {
            console.error("La función de exportación no está disponible.");
            showNotification('Error', 'La funcionalidad de exportación de paquetes no se ha cargado correctamente.');
        }
    }

    let selectedLibraryForContextMenu = null;

    document.getElementById('library-list-container').addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.library-card');
        if (card) {
            e.preventDefault();
            selectedLibraryForContextMenu = card.dataset.fileName;
            const menu = document.getElementById('library-context-menu');
            menu.style.display = 'block';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
        }
    });

    document.getElementById('library-context-menu').addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (selectedLibraryForContextMenu) {
            if (action === 'toggle-library-activation') {
                toggleLibraryActivation(selectedLibraryForContextMenu);
            } else if (action === 'delete-library') {
                handleDeleteLibrary(selectedLibraryForContextMenu);
            }
        }
        document.getElementById('library-context-menu').style.display = 'none';
    });

    // Hide context menu on left-click
    window.addEventListener('click', () => {
        document.getElementById('library-context-menu').style.display = 'none';
    });

    let selectedLibraryForDetails = null;

    document.getElementById('library-list-container').addEventListener('click', async (e) => {
        const card = e.target.closest('.library-card');
        if (card) {
            selectedLibraryForDetails = card.dataset.fileName;
            await openLibraryDetails(selectedLibraryForDetails);
        }
    });

    async function openLibraryDetails(fileName) {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const libDirHandle = await projectHandle.getDirectoryHandle('lib');
            const fileHandle = await libDirHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            const libData = JSON.parse(content);

            // --- Populate Top Bubble ---
            document.getElementById('details-lib-icon').src = libData.library_icon_base64 || 'image/Paquete.png';
            document.getElementById('details-lib-name').textContent = libData.name || 'Sin Nombre';
            document.getElementById('details-lib-version').textContent = `v${libData.version || '0.0.0'}`;
            document.getElementById('details-author-icon').src = libData.author_icon_base64 || 'image/Paquete.png';
            document.getElementById('details-author-name').textContent = libData.author || 'Anónimo';

            // --- Populate Description Bubble ---
            document.getElementById('details-lib-description').textContent = libData.description || 'Sin descripción.';

            // --- Populate Status & Permissions Bubble ---
            const statusToggle = document.getElementById('details-status-toggle');
            const statusText = document.getElementById('details-status-text');

            let isActive = true;
            try {
                const metaFileHandle = await libDirHandle.getFileHandle(`${fileName}.meta`);
                const metaFile = await metaFileHandle.getFile();
                const metaContent = await metaFile.text();
                isActive = JSON.parse(metaContent).active !== false;
            } catch (e) { /* Defaults to active */ }

            statusToggle.checked = isActive;
            statusText.textContent = isActive ? 'Activo' : 'Inactivo';

            const permissionsContent = document.getElementById('details-permissions-content');
            document.getElementById('lib-details-req-windows').checked = libData.api_access?.can_create_windows || false;
            document.getElementById('lib-details-runtime-access').checked = libData.api_access?.runtime_accessible || false;
            document.getElementById('lib-details-is-tool').checked = libData.api_access?.is_engine_tool || false;
            document.getElementById('lib-details-custom-components').checked = libData.api_access?.allow_custom_components || false;
            document.getElementById('lib-details-modify-assets').checked = libData.api_access?.allow_asset_modification || false;

            document.getElementById('library-details-modal').classList.add('is-open');

        } catch (error) {
            console.error(`Error al abrir los detalles de la librería '${fileName}':`, error);
            showNotification('Error', 'No se pudieron cargar los detalles de la librería.');
        }
    }

    document.getElementById('lib-details-save-btn').addEventListener('click', async () => {
        if (!selectedLibraryForDetails) return;

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const libDirHandle = await projectHandle.getDirectoryHandle('lib');

            // --- Save .celib file (permissions) ---
            const fileHandle = await libDirHandle.getFileHandle(selectedLibraryForDetails);
            const file = await fileHandle.getFile();
            const content = await file.text();
            const libData = JSON.parse(content);

            libData.api_access = {
                can_create_windows: document.getElementById('lib-details-req-windows').checked,
                runtime_accessible: document.getElementById('lib-details-runtime-access').checked,
                is_engine_tool: document.getElementById('lib-details-is-tool').checked,
                allow_custom_components: document.getElementById('lib-details-custom-components').checked,
                allow_asset_modification: document.getElementById('lib-details-modify-assets').checked,
            };

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(libData, null, 2));
            await writable.close();

            // --- Save .meta file (activation status) ---
            const isActive = document.getElementById('details-status-toggle').checked;
            const metaFileName = `${selectedLibraryForDetails}.meta`;
            const metaFileHandle = await libDirHandle.getFileHandle(metaFileName, { create: true });
            const metaWritable = await metaFileHandle.createWritable();
            await metaWritable.write(JSON.stringify({ active: isActive }, null, 2));
            await metaWritable.close();


            document.getElementById('library-details-modal').classList.remove('is-open');
            showNotification('Cambios Guardados', 'Cambios guardados. Por favor, reinicia el editor para aplicar todos los cambios.');
            refreshLibraryList(); // Refresh the main view to show active/inactive state

        } catch (error) {
            console.error(`Error al guardar los cambios de la librería '${selectedLibraryForDetails}':`, error);
            showNotification('Error', 'No se pudieron guardar los cambios.');
        }
    });

    document.getElementById('library-details-modal').querySelector('.close-button').addEventListener('click', () => {
        document.getElementById('library-details-modal').classList.remove('is-open');
    });

    console.log("Módulo de la Ventana de Librerías inicializado.");

    // Return the refresh function so other modules can trigger an update
    return {
        refreshLibraryList,
        openLibraryDetails, // Export the function
        handleImportLibrary
    };
}

function setupDragAndDrop() {
    const dropZone = dom.libCreateDropZone;
    const fileInput = dom.libCreateFileInput;
    const fileList = dom.libCreateFileList;

    if (!dropZone || !fileInput || !fileList) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileList.addEventListener('click', (e) => {
        const fileName = e.target.parentElement.dataset.fileName;
        if (e.target.classList.contains('remove-file')) {
            libraryFiles = libraryFiles.filter(f => f.name !== fileName);
            // If the removed file was the main script, reset it
            if (mainScriptFile === fileName) {
                mainScriptFile = null;
                // Auto-select a new .js file if available
                const newMain = libraryFiles.find(f => f.name.endsWith('.js'));
                if (newMain) mainScriptFile = newMain.name;
            }
            updateFileList();
        } else if (e.target.classList.contains('main-script-star')) {
            mainScriptFile = fileName;
            updateFileList();
        }
    });

    function handleFiles(files) {
        let firstJsAdded = false;
        for (const file of files) {
            if (!libraryFiles.some(f => f.name === file.name)) {
                if (file.name.endsWith('.js') || file.name.endsWith('.ces')) {
                    libraryFiles.push(file);
                    // If this is the first .js file and no main script is set, make it the main one.
                    if (file.name.endsWith('.js') && !mainScriptFile && !firstJsAdded) {
                        mainScriptFile = file.name;
                        firstJsAdded = true;
                    }
                } else {
                    showNotification('Archivo no válido', `Solo se permiten archivos .js y .ces. ${file.name} fue ignorado.`);
                }
            }
        }
        updateFileList();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        if (libraryFiles.length === 0) {
            dropZone.querySelector('p').textContent = 'Arrastra y suelta los archivos aquí, o haz clic para seleccionar.';
        } else {
            dropZone.querySelector('p').textContent = `${libraryFiles.length} archivo(s) añadidos. Añade más si lo necesitas.`;
        }

        libraryFiles.forEach(file => {
            const li = document.createElement('li');
            li.dataset.fileName = file.name;

            const starSpan = document.createElement('span');
            starSpan.className = 'main-script-star';
            starSpan.textContent = '★';
            starSpan.title = 'Marcar como script principal';
            if (file.name === mainScriptFile) {
                starSpan.classList.add('selected');
                starSpan.title = 'Este es el script principal';
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = file.name;

            const removeSpan = document.createElement('span');
            removeSpan.className = 'remove-file';
            removeSpan.textContent = '✖';
            removeSpan.title = 'Eliminar archivo';

            li.appendChild(starSpan);
            li.appendChild(nameSpan);
            li.appendChild(removeSpan);
            fileList.appendChild(li);
        });
    }
}
