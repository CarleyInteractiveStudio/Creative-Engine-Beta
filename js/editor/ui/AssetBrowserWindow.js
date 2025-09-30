import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { createNewPalette } from './TilePaletteWindow.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let currentDirectoryHandle = { handle: null, path: '' };
let exportContext;

// Callbacks to other modules/editor.js
let onAssetSelected;
let onAssetOpened;
let onShowContextMenu;
let onExportPackage;
let createUiSystemFile;
let updateAssetBrowserCallback;

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

    // Setup event listeners
    dom.assetGridView.addEventListener('click', handleGridClick);
    dom.assetGridView.addEventListener('dblclick', handleGridDblClick);
    dom.assetGridView.addEventListener('contextmenu', handleGridContextMenu);
    dom.assetGridView.addEventListener('dragstart', handleGridDragStart);

    dom.assetsContent.addEventListener('dragover', handleExternalFileDragOver);
    dom.assetsContent.addEventListener('dragleave', handleExternalFileDragLeave);
    dom.assetsContent.addEventListener('drop', handleExternalFileDrop);

    dom.contextMenu.addEventListener('click', handleContextMenuClick);
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
            alert("No se pudo mover el archivo.");
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
            } else if (entry.name.endsWith('.cep')) {
                imgIcon.src = 'image/Paquete.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cmel')) {
                iconContainer.textContent = '🎨';
            } else if (entry.name.endsWith('.ceScene')) {
                iconContainer.textContent = '🎬';
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
        await populateFolderTree(assetsHandle, 'Assets', folderTreeContainer);
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
        onAssetSelected(item.dataset.name, item.dataset.path, item.dataset.kind);

        exportOption.style.display = item.dataset.kind === 'directory' ? 'block' : 'none';
        exportDivider.style.display = item.dataset.kind === 'directory' ? 'block' : 'none';
    } else {
        // Right-clicked on empty space, deselect all
        dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
        onAssetSelected(null, null, null);
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
        const allowedExtensions = ['.png', '.jpeg', '.jpg', '.mp3', '.cea', '.ces', '.ceScene', '.ceanim'];
        let filesImported = 0;

        for (const file of e.dataTransfer.files) {
            const extension = `.${file.name.split('.').pop().toLowerCase()}`;
            if (allowedExtensions.includes(extension)) {
                try {
                    const fileHandle = await currentDirectoryHandle.handle.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    filesImported++;
                } catch (err) {
                    console.error(`Error al importar el archivo '${file.name}':`, err);
                    alert(`No se pudo importar el archivo '${file.name}'.`);
                }
            } else {
                console.warn(`Archivo omitido: '${file.name}'. Tipo de archivo no soportado.`);
            }
        }

        if (filesImported > 0) {
            console.log(`${filesImported} archivo(s) importados con éxito.`);
            await updateAssetBrowserCallback();
        }
    }
}

async function handleContextMenuClick(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    // The context menu is global, so we hide it from here
    dom.contextMenu.style.display = 'none';

    const selectedAssetEl = dom.assetGridView.querySelector('.grid-item.active');
    const selectedAsset = selectedAssetEl ? { name: selectedAssetEl.dataset.name, kind: selectedAssetEl.dataset.kind } : null;

    switch(action) {
        case 'create-folder': {
            const folderName = prompt("Nombre de la nueva carpeta:");
            if (folderName) {
                try {
                    await currentDirectoryHandle.handle.getDirectoryHandle(folderName, { create: true });
                    await updateAssetBrowserCallback();
                } catch (err) {
                    console.error("Error al crear la carpeta:", err);
                    alert("No se pudo crear la carpeta.");
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
                    alert("No se pudo crear el script.");
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
                if (confirm(`¿Estás seguro de que quieres borrar '${selectedAsset.name}'? Esta acción no se puede deshacer.`)) {
                    try {
                        await currentDirectoryHandle.handle.removeEntry(selectedAsset.name, { recursive: true });
                        console.log(`'${selectedAsset.name}' borrado.`);
                        await updateAssetBrowserCallback();
                    } catch (err) {
                        console.error(`Error al borrar '${selectedAsset.name}':`, err);
                        alert(`No se pudo borrar el asset.`);
                    }
                }
            } else {
                alert("Por favor, selecciona un archivo o carpeta para borrar.");
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
                            alert("El renombrado de carpetas aún no está implementado.");
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
                        alert(`No se pudo renombrar el asset.`);
                    }
                }
            } else {
                alert("Por favor, selecciona un archivo para renombrar.");
            }
            break;
        }
        case 'export-package': {
             if (selectedAsset && selectedAsset.kind === 'directory') {
                onExportPackage(selectedAsset.name);
             } else {
                alert("Por favor, selecciona una carpeta para exportar.");
             }
            break;
        }
    }
}

export function getCurrentDirectoryHandle() {
    return currentDirectoryHandle.handle;
}
