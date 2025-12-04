import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { createNewPalette } from './TilePaletteWindow.js';
import { showNotification, showConfirmation } from './DialogWindow.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let currentDirectoryHandle = { handle: null, path: '' };
let exportContext;
let contextAsset = null; // Asset under the right-click context menu

// Callbacks to other modules/editor.js
let onAssetSelected;
let onAssetOpened;
let onShowContextMenu;
let onExportPackage;
let createUiSystemFile;
let updateAssetBrowserCallback;
let refreshLibraryListCallback;
let openLibraryDetailsCallback; // New callback for double-click

// --- Initialization ---
export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    onAssetSelected = dependencies.onAssetSelected;
    onAssetOpened = dependencies.onAssetOpened;
    onShowContextMenu = dependencies.onShowContextMenu;
    onExportPackage = dependencies.onExportPackage;
    exportContext = dependencies.exportContext; // Share the context object
    createUiSystemFile = dependencies.createUiSystemFile;
    updateAssetBrowserCallback = dependencies.updateAssetBrowser;
    refreshLibraryListCallback = dependencies.refreshLibraryList;
    openLibraryDetailsCallback = dependencies.openLibraryDetails; // Store the new callback

    // Setup event listeners
    dom.assetGridView.addEventListener('click', handleGridClick);
    dom.assetGridView.addEventListener('dblclick', handleGridDblClick);
    dom.assetGridView.addEventListener('contextmenu', handleGridContextMenu);
    dom.assetGridView.addEventListener('dragstart', handleGridDragStart);

    dom.assetsContent.addEventListener('dragover', handleExternalFileDragOver);
    dom.assetsContent.addEventListener('dragleave', handleExternalFileDragLeave);
    dom.assetsContent.addEventListener('drop', handleExternalFileDrop);

    dom.contextMenu.addEventListener('click', handleContextMenuClick);
    console.log("CHIVATO INIT: Event listener para el menú contextual del Asset Browser añadido.");
}

// --- Core Functions ---
export async function updateAssetBrowser() {
    if (!projectsDirHandle || !dom.assetFolderTree || !dom.assetGridView) return;

    const folderTreeContainer = dom.assetFolderTree;
    const gridViewContainer = dom.assetGridView;
    folderTreeContainer.innerHTML = '';

    const projectName = new URLSearchParams(window.location.search).get('project');
    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    if (!currentDirectoryHandle.handle) {
         currentDirectoryHandle = { handle: assetsHandle, path: 'Assets' };
    }

    async function handleDropOnFolder(targetFolderHandle, targetPath, droppedData) {
        console.log(`Soltado ${droppedData.path} en ${targetPath}`);
        try {
            const sourcePath = droppedData.path;
            const sourceParts = sourcePath.split('/').filter(p => p);
            const sourceFileName = sourceParts.pop();

            let sourceDirHandle = projectHandle;
            for(const part of sourceParts) {
                if(part) sourceDirHandle = await sourceDirHandle.getDirectoryHandle(part);
            }

            const sourceFileHandle = await sourceDirHandle.getFileHandle(sourceFileName);
            const file = await sourceFileHandle.getFile();

            const newFileHandle = await targetFolderHandle.getFileHandle(sourceFileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();

            await sourceDirHandle.removeEntry(sourceFileName);

            console.log(`Movido ${sourceFileName} a ${targetPath}`);
            await updateAssetBrowserCallback();

        } catch (error) {
            console.error("Error al mover el archivo:", error);
            showNotification('Error', 'No se pudo mover el archivo.');
        }
    }

    async function populateGridView(dirHandle, dirPath) {
        gridViewContainer.innerHTML = '';
        gridViewContainer.directoryHandle = dirHandle;
        gridViewContainer.dataset.path = dirPath;

        const entries = [];
        for await (const entry of dirHandle.values()) {
            entries.push(entry);
        }

        if (entries.length === 0) {
            gridViewContainer.innerHTML = '<p class="empty-folder-message">La carpeta está vacía</p>';
            return;
        }

        for (const entry of entries) {
            // Ocultar archivos .meta
            if (entry.name.endsWith('.meta')) {
                continue;
            }

            const item = document.createElement('div');
            item.className = 'grid-item';
            item.draggable = true;
            item.dataset.name = entry.name;
            item.dataset.kind = entry.kind;
            const fullPath = `${dirPath}/${entry.name}`;
            item.dataset.path = fullPath;

            const iconContainer = document.createElement('div');
            iconContainer.className = 'icon';

            const imgIcon = document.createElement('img');
            imgIcon.className = 'icon-preview';

            if (entry.kind === 'directory') {
                iconContainer.textContent = '📁';
                item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; item.classList.add('drag-over'); });
                item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                item.addEventListener('drop', async (e) => {
                    item.classList.remove('drag-over');
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const targetFolderHandle = await dirHandle.getDirectoryHandle(entry.name);
                    await handleDropOnFolder(targetFolderHandle, `${dirPath}/${entry.name}`, droppedData);
                });
            } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg')) {
                getURLForAssetPath(fullPath, projectsDirHandle).then(url => {
                    if (url) {
                        imgIcon.src = url;
                        iconContainer.appendChild(imgIcon);
                    } else {
                        iconContainer.textContent = '🖼️';
                    }
                });
            } else if (entry.name.endsWith('.mp3')) {
                iconContainer.textContent = '🎵';
            } else if (entry.name.endsWith('.ces')) {
                imgIcon.src = 'image/Script.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cea')) {
                imgIcon.src = 'image/cea.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.ceanim')) {
                imgIcon.src = 'image/animacion_controler.svg';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.ceSprite')) {
                getURLForAssetPath(fullPath, projectsDirHandle).then(url => {
                    if (url) {
                        imgIcon.src = url;
                        iconContainer.appendChild(imgIcon);
                    } else {
                        iconContainer.textContent = '🖼️'; // Fallback icon
                    }
                });
            } else if (entry.name.endsWith('.cep')) {
                imgIcon.src = 'image/Paquete.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cmel')) {
                iconContainer.textContent = '🎨';
            } else if (entry.name.endsWith('.ceScene')) {
                iconContainer.textContent = '🎬';
            } else if (entry.name.endsWith('.celib')) {
                // Asynchronously read the library file to get the custom icon
                (async () => {
                    try {
                        const file = await entry.getFile();
                        const content = await file.text();
                        const libData = JSON.parse(content);
                        if (libData.library_icon_base64) {
                            imgIcon.src = libData.library_icon_base64;
                            iconContainer.appendChild(imgIcon);
                        } else {
                            // Fallback icon if no custom one is provided
                            imgIcon.src = 'image/Paquete.png';
                            iconContainer.appendChild(imgIcon);
                        }
                    } catch (e) {
                        console.error(`Error reading .celib file for icon: ${entry.name}`, e);
                        // Fallback icon on error
                        imgIcon.src = 'image/Paquete.png';
                        iconContainer.appendChild(imgIcon);
                    }
                })();
            } else {
                iconContainer.textContent = '📄';
            }

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = entry.name;

            item.appendChild(iconContainer);
            item.appendChild(name);
            gridViewContainer.appendChild(item);
        }
    }

    async function populateFolderTree(dirHandle, currentPath, container, depth = 0) {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.textContent = dirHandle.name;
        folderItem.style.paddingLeft = `${depth * 15 + 5}px`;
        folderItem.dataset.path = currentPath;

        if (dirHandle.isSameEntry(currentDirectoryHandle.handle)) {
            folderItem.classList.add('active');
        }

        folderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDirectoryHandle = { handle: dirHandle, path: currentPath };
            updateAssetBrowserCallback();
        });

        folderItem.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; folderItem.classList.add('drag-over'); });
        folderItem.addEventListener('dragleave', () => folderItem.classList.remove('drag-over'));
        folderItem.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            folderItem.classList.remove('drag-over');
            const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
            await handleDropOnFolder(dirHandle, currentPath, droppedData);
        });

        container.appendChild(folderItem);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'folder-children';
        folderItem.appendChild(childrenContainer);

        try {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    await populateFolderTree(entry, `${currentPath}/${entry.name}`, childrenContainer, depth + 1);
                }
            }
        } catch(e) {
            console.warn(`Could not iterate directory ${dirHandle.name}. Permissions issue?`, e);
        }
    }

    try {
        const libHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

        await populateFolderTree(assetsHandle, 'Assets', folderTreeContainer);
        await populateFolderTree(libHandle, 'lib', folderTreeContainer);

        await populateGridView(currentDirectoryHandle.handle, currentDirectoryHandle.path);
    } catch (error) {
        console.error("Error updating asset browser:", error);
        gridViewContainer.innerHTML = '<p class="error-message">Could not load project assets.</p>';
    }
}

// --- Event Handlers ---
function handleGridClick(e) {
    const item = e.target.closest('.grid-item');

    // De-select all others first
    dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));

    if (item) {
        item.classList.add('active');
        onAssetSelected(item.dataset.name, item.dataset.path, item.dataset.kind);
    } else {
        onAssetSelected(null, null, null);
    }
}

async function handleGridDblClick(e) {
    const item = e.target.closest('.grid-item');
    if (!item) return;

    const name = item.dataset.name;
    const kind = item.dataset.kind;
    const path = item.dataset.path;

    if (kind === 'directory') {
        currentDirectoryHandle = { handle: await currentDirectoryHandle.handle.getDirectoryHandle(name), path: path };
        updateAssetBrowserCallback();
    } else if (name.endsWith('.celib')) {
        if (openLibraryDetailsCallback) {
            // Ensure the library panel is visible before opening details
            const libraryPanel = document.getElementById('library-panel');
            if (libraryPanel && libraryPanel.classList.contains('hidden')) {
                libraryPanel.classList.remove('hidden');
            }
            openLibraryDetailsCallback(name);
        } else {
            console.warn("La funcionalidad de doble clic para librerías no está conectada.");
        }
    } else if (name.endsWith('.ceSprite')) {
        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(name);
        // Special case to open .ceSprite files in the Sprite Slicer for editing
        onAssetOpened(name, fileHandle, currentDirectoryHandle.handle, { openIn: 'SpriteSlicer' });
    } else {
        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(name);
        onAssetOpened(name, fileHandle, currentDirectoryHandle.handle);
    }
}

async function handleGridContextMenu(e) {
    e.preventDefault();
    const item = e.target.closest('.grid-item');
    const exportOption = dom.contextMenu.querySelector('[data-action="export-package"]');
    const exportDivider = dom.contextMenu.querySelector('.folder-only-divider');

    if (item) {
        // Select the item that was right-clicked
        dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const assetName = item.dataset.name;
        const assetKind = item.dataset.kind;
        onAssetSelected(assetName, item.dataset.path, assetKind);

        contextAsset = { name: assetName, kind: assetKind }; // Store asset for context action

        exportOption.style.display = assetKind === 'directory' ? 'block' : 'none';
        exportDivider.style.display = assetKind === 'directory' ? 'block' : 'none';
    } else {
        // Right-clicked on empty space, deselect all
        dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
        onAssetSelected(null, null, null);
        contextAsset = null; // Clear context asset
        exportOption.style.display = 'none';
        exportDivider.style.display = 'none';
    }

    onShowContextMenu(dom.contextMenu, e);
}

function handleGridDragStart(e) {
    const item = e.target.closest('.grid-item');
    if (item) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            name: item.dataset.name,
            kind: item.dataset.kind,
            path: item.dataset.path
        }));
        e.dataTransfer.effectAllowed = 'copyMove';
    }
}

function handleExternalFileDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dom.assetsContent.classList.add('drag-over-fs');
}

function handleExternalFileDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dom.assetsContent.classList.remove('drag-over-fs');
}

async function handleExternalFileDrop(e) {
    dom.assetsContent.classList.remove('drag-over-fs');
    e.preventDefault();
    e.stopPropagation();

    // This handles files from the user's OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        console.log(`Importando ${e.dataTransfer.files.length} archivo(s)...`);
        let filesImported = 0;
        let librariesImported = 0;

        for (const file of e.dataTransfer.files) {
            if (file.name.toLowerCase().endsWith('.celib')) {
                // Special handling for library files
                try {
                    const projectName = new URLSearchParams(window.location.search).get('project');
                    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                    const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

                    const fileHandle = await libDirHandle.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    librariesImported++;
                } catch (err) {
                    console.error(`Error al importar la librería '${file.name}':`, err);
                    showNotification('Error de Importación', `No se pudo importar la librería '${file.name}'.`);
                }
            } else {
                // Normal file handling
                try {
                    const fileHandle = await currentDirectoryHandle.handle.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    filesImported++;
                } catch (err) {
                    console.error(`Error al importar el archivo '${file.name}':`, err);
                    showNotification('Error de Importación', `No se pudo importar el archivo '${file.name}'.`);
                }
            }
        }

        if (filesImported > 0) {
            console.log(`${filesImported} archivo(s) importados con éxito a la carpeta de Assets.`);
            await updateAssetBrowserCallback();
        }
        if (librariesImported > 0) {
            console.log(`${librariesImported} librería(s) importada(s) con éxito a la carpeta /lib.`);
            if (refreshLibraryListCallback) {
                refreshLibraryListCallback();
            }
        }
    }
}

async function handleContextMenuClick(e) {
    e.stopPropagation(); // Stop the event from bubbling up to the window listener
    const action = e.target.dataset.action;
    if (!action) return;

    // The context menu is global, so we hide it from here
    dom.contextMenu.style.display = 'none';

    // Use the asset stored at the time the context menu was opened
    const selectedAsset = contextAsset;

    switch(action) {
        case 'create-folder': {
            const folderName = prompt("Nombre de la nueva carpeta:");
            if (folderName) {
                try {
                    await currentDirectoryHandle.handle.getDirectoryHandle(folderName, { create: true });
                    await updateAssetBrowserCallback();
                } catch (err) {
                    console.error("Error al crear la carpeta:", err);
                    showNotification('Error', 'No se pudo crear la carpeta.');
                }
            }
            break;
        }
        case 'create-script': {
            const scriptName = prompt("Nombre del nuevo script (.ces):");
            if (scriptName) {
                const fileName = scriptName.endsWith('.ces') ? scriptName : `${scriptName}.ces`;
                const defaultContent = `// Nuevo script de Creative Engine\n\npublic star() {\n    \n}\n\npublic update(deltaTime) {\n    \n}\n`;
                try {
                    const fileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(defaultContent);
                    await writable.close();
                    await updateAssetBrowserCallback();
                } catch (err) {
                    console.error("Error al crear el script:", err);
                    showNotification('Error', 'No se pudo crear el script.');
                }
            }
            break;
        }
        case 'create-ui-system': {
            if (createUiSystemFile) {
                createUiSystemFile(currentDirectoryHandle.handle, updateAssetBrowserCallback);
            }
            break;
        }
        case 'create-tile-palette': {
            const paletteName = prompt("Nombre de la nueva paleta (.cepalette):");
            if (paletteName) {
                const fileName = paletteName.endsWith('.cepalette') ? paletteName : `${paletteName}.cepalette`;
                await createNewPalette(fileName, currentDirectoryHandle.handle);
                await updateAssetBrowserCallback();
            }
            break;
        }
        // Add other cases for create-scene, create-animation, etc.
        case 'delete': {
            if (selectedAsset) {
                showConfirmation(
                    'Confirmar Borrado',
                    `¿Estás seguro de que quieres borrar '${selectedAsset.name}'? Esta acción no se puede deshacer.`,
                    async () => {
                        try {
                            // Delete the main asset
                            await currentDirectoryHandle.handle.removeEntry(selectedAsset.name, { recursive: true });

                            // Also try to delete a corresponding .meta file, if one exists
                            if (selectedAsset.kind === 'file') {
                                const metaName = `${selectedAsset.name}.meta`;
                                try {
                                    await currentDirectoryHandle.handle.removeEntry(metaName);
                                } catch (metaErr) {
                                    // This is not a critical error, the meta file might not exist.
                                }
                            }

                            await updateAssetBrowserCallback();
                        } catch (err) {
                            console.error(`Error al borrar '${selectedAsset.name}':`, err);
                            showNotification('Error', 'No se pudo borrar el asset.');
                        }
                    }
                );
            } else {
                showNotification('Error', 'Por favor, selecciona un archivo o carpeta para borrar.');
            }
            break;
        }
        case 'rename': {
            if (selectedAsset) {
                const oldName = selectedAsset.name;
                const newName = prompt(`Renombrar '${oldName}':`, oldName);

                if (newName && newName !== oldName) {
                    try {
                        if (selectedAsset.kind === 'directory') {
                            showNotification('No Implementado', 'El renombrado de carpetas aún no está implementado.');
                            return;
                        }
                        const oldFileHandle = await currentDirectoryHandle.handle.getFileHandle(oldName);
                        const content = await (await oldFileHandle.getFile()).text();

                        const newFileHandle = await currentDirectoryHandle.handle.getFileHandle(newName, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(content);
                        await writable.close();

                        await currentDirectoryHandle.handle.removeEntry(oldName);

                        console.log(`'${oldName}' renombrado a '${newName}'.`);
                        await updateAssetBrowserCallback();
                    } catch (err) {
                        console.error(`Error al renombrar '${oldName}':`, err);
                        showNotification('Error', 'No se pudo renombrar el asset.');
                    }
                }
            } else {
                showNotification('Error', 'Por favor, selecciona un archivo para renombrar.');
            }
            break;
        }
        case 'export-package': {
             if (selectedAsset && selectedAsset.kind === 'directory') {
                onExportPackage(selectedAsset.name);
             } else {
                showNotification('Error', 'Por favor, selecciona una carpeta para exportar.');
             }
            break;
        }
    }
}

export function getCurrentDirectoryHandle() {
    return currentDirectoryHandle.handle;
}
