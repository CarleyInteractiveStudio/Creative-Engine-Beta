import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { createNewPalette } from './TilePaletteWindow.js';
import { showNotification, showConfirmation, showPrompt } from './DialogWindow.js';
import * as SceneManager from '../../engine/SceneManager.js';
import * as SkeletonImporter from '../SkeletonImporter.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let projectHandle, assetsHandle;
let currentDirectoryHandle = { handle: null, path: '' };
let lastProjectName = null;
let exportContext;
let contextAsset = null; // Asset under the right-click context menu
let dragCounter = 0; // For robust drag-over UI
let collapsedFolders = new Set(); // Conjunto de rutas de carpetas contraídas

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
    window.getSelectedMateria = dependencies.getSelectedMateria;
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

    // Global dragover for the whole panel to allow internal drops
    dom.assetsContent.addEventListener('dragover', (e) => {
        // Use types to detect if there's data being dragged (getData is restricted in dragover)
        if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            // Default to move for internal, copy for external (handled below)
            e.dataTransfer.dropEffect = 'move';
        }
    });

    dom.assetsContent.addEventListener('dragenter', handleExternalFileDragEnter);
    dom.assetsContent.addEventListener('dragover', handleExternalFileDragOver);
    dom.assetsContent.addEventListener('dragleave', handleExternalFileDragLeave);
    dom.assetsContent.addEventListener('drop', handleExternalFileDrop);

    // Global dragover to prevent default blue state stuck
    window.addEventListener('dragover', (e) => {
        if (!e.dataTransfer.types.includes('Files')) {
            dom.assetsContent.classList.remove('drag-over-fs');
        }
    });

    // The event listener is now centralized in editor.js
}

function handleExternalFileDragEnter(e) {
    // Solo mostrar el highlight si se arrastran archivos externos
    if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        dom.assetsContent.classList.add('drag-over-fs');
    }
}

export async function handleContextMenuAction(action) {
    // This function is now called from editor.js
    const L = window.Localization;
    const selectedAsset = contextAsset;

    // Determine the target directory for "create" actions
    let targetHandle = currentDirectoryHandle.handle;
    let targetPathDisplay = currentDirectoryHandle.path;

    // If we right-clicked on a directory item, create inside it
    if (selectedAsset && selectedAsset.kind === 'directory' && action.startsWith('create-')) {
        try {
            targetHandle = await currentDirectoryHandle.handle.getDirectoryHandle(selectedAsset.name);
            targetPathDisplay = `${currentDirectoryHandle.path}/${selectedAsset.name}`;
            console.log(`[AssetBrowser] Acción '${action}' dirigida a subcarpeta: ${targetPathDisplay}`);
        } catch (e) {
            console.warn("[AssetBrowser] No se pudo obtener el handle de la subcarpeta, usando carpeta actual.");
        }
    }

    if (!targetHandle) {
        console.error("[AssetBrowser] No hay una carpeta de destino válida para la acción:", action);
        return;
    }

    switch(action) {
        case 'create-folder': {
            showPrompt(
                L.get('CREAR_CARPETA', 'Crear Carpeta'),
                L.get('NOMBRE_CARPETA_PROMPT', 'Introduce el nombre de la nueva carpeta:'),
                async (folderName) => {
                    if (folderName) {
                        try {
                            await targetHandle.getDirectoryHandle(folderName, { create: true });
                            await updateAssetBrowserCallback();
                        } catch (err) {
                            console.error("Error al crear la carpeta:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_CARPETA', 'No se pudo crear la carpeta.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-animator-controller': {
            showPrompt(
                L.get('CREAR_CONTROLADOR_ANIMACION', 'Crear Controlador de Animación'),
                L.get('NOMBRE_CONTROLADOR_PROMPT', 'Introduce el nombre del nuevo controlador (.ceanim):'),
                async (ctrlName) => {
                    if (ctrlName) {
                        const fileName = ctrlName.endsWith('.ceanim') ? ctrlName : `${ctrlName}.ceanim`;
                        const defaultContent = JSON.stringify({
                            name: ctrlName,
                            entryState: L.get('PARADO', "Parado"),
                            smartMode: true,
                            states: [
                                { name: L.get('PARADO', "Parado"), animationClip: "", speed: 10.0, position: { x: 300, y: 200 } },
                                { name: L.get('ARRIBA', "Arriba"), animationClip: "", speed: 10.0, position: { x: 300, y: 50 } },
                                { name: L.get('ABAJO', "Abajo"), animationClip: "", speed: 10.0, position: { x: 300, y: 350 } },
                                { name: L.get('IZQUIERDA', "Izquierda"), animationClip: "", speed: 10.0, position: { x: 100, y: 200 } },
                                { name: L.get('DERECHA', "Derecha"), animationClip: "", speed: 10.0, position: { x: 500, y: 200 } }
                            ],
                            transitions: []
                        }, null, 2);
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el controlador de animación:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_CONTROLADOR', 'No se pudo crear el controlador.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-prefab': {
            showPrompt(
                L.get('CREAR_PREFAB', 'Crear Prefab'),
                L.get('NOMBRE_PREFAB_PROMPT', 'Introduce el nombre del nuevo prefab (.ceprefab):'),
                async (prefabName) => {
                    if (prefabName) {
                        const fileName = prefabName.endsWith('.ceprefab') ? prefabName : `${prefabName}.ceprefab`;
                        // Default empty prefab content (one Materia named after the prefab)
                        const defaultContent = JSON.stringify({
                            "name": prefabName.replace('.ceprefab', ''),
                            "tag": "Untagged",
                            "leyes": [
                                {
                                    "type": "Transform",
                                    "properties": {
                                        "localPosition": { "x": 0, "y": 0 },
                                        "localRotation": 0,
                                        "localScale": { "x": 1, "y": 1 }
                                    }
                                }
                            ],
                            "children": []
                        }, null, 2);
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el prefab:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_PREFAB', 'No se pudo crear el prefab.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-chc-script': {
            showPrompt(
                L.get('CREAR_SCRIPT_CHC', 'Crear Script H-Code'),
                L.get('NOMBRE_SCRIPT_PROMPT', 'Introduce el nombre del nuevo script:'),
                async (scriptName) => {
                    if (scriptName) {
                        const fileName = scriptName.endsWith('.chc') ? scriptName : `${scriptName}.chc`;
                        const defaultContent = `# Mi Script Humano\n\nCuando se presione la tecla W, mover arriba.\nSi hay colisión con un enemigo, destruir este objeto.`;
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el script CHC:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_SCRIPT', 'No se pudo crear el script.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-script': {
            showPrompt(
                L.get('CREAR_SCRIPT', 'Crear Script'),
                L.get('NOMBRE_SCRIPT_PROMPT', 'Introduce el nombre del nuevo script:'),
                async (scriptName) => {
                    if (scriptName) {
                        const fileName = scriptName.endsWith('.ces') ? scriptName : `${scriptName}.ces`;
                        const defaultContent = `// Nuevo script de Creative Engine\n\npublic start() {\n    \n}\n\npublic update(deltaTime) {\n    \n}\n`;
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el script:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_SCRIPT', 'No se pudo crear el script.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-scene': {
            showPrompt(
                L.get('CREAR_ESCENA', 'Crear Escena'),
                L.get('NOMBRE_ESCENA_PROMPT', 'Introduce el nombre de la nueva escena (.ceScene):'),
                async (sceneName) => {
                    console.log(`[AssetBrowser] Callback de showPrompt para 'create-scene' ejecutado. Nombre recibido: '${sceneName}'`);
                    if (sceneName) {
                        const fileName = sceneName.endsWith('.ceScene') ? sceneName : `${sceneName}.ceScene`;
                        console.log(`[AssetBrowser] Creando archivo de escena con nombre: '${fileName}'`);
                        // Default empty scene content
                        const defaultContent = JSON.stringify({
                            materias: [],
                            ambiente: {
                                nocheDiaColor: "#1a1a2a",
                                hora: 6,
                                cicloAutomatico: false,
                                duracionDia: 60,
                                mascaraTipo: "none"
                            }
                        }, null, 2);
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            console.log(`[AssetBrowser] Archivo de escena '${fileName}' creado con éxito.`);
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear la escena:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_ESCENA', 'No se pudo crear la escena.'));
                        }
                    } else {
                        console.log("[AssetBrowser] La creación de la escena fue cancelada o el nombre estaba vacío.");
                    }
                }
            );
            break;
        }
        case 'create-animation': {
            showPrompt(
                L.get('CREAR_ANIMACION', 'Crear Asset de Animación'),
                L.get('NOMBRE_ANIMACION_PROMPT', 'Introduce el nombre del nuevo asset (.cea):'),
                async (animName) => {
                    if (animName) {
                        const fileName = animName.endsWith('.cea') ? animName : `${animName}.cea`;
                        // Default empty animation content
                        const defaultContent = JSON.stringify({
                            name: animName.replace('.cea', ''),
                            animations: [{
                                name: "default",
                                speed: 10,
                                loop: true,
                                frames: []
                            }]
                        }, null, 2);
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el asset de animación:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_ANIMACION', 'No se pudo crear el asset de animación.'));
                        }
                    }
                }
            );
            break;
        }
        case 'create-readme': {
            showPrompt(
                L.get('CREAR_README', 'Crear Archivo Léame'),
                L.get('NOMBRE_ARCHIVO_PROMPT', 'Introduce el nombre del archivo:'),
                async (readmeName) => {
                    if (readmeName) {
                        const fileName = readmeName.endsWith('.md') ? readmeName : `${readmeName}.md`;
                        const defaultContent = '# Nuevo Archivo Léame\n\nEscribe aquí la documentación...';
                        try {
                            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(defaultContent);
                            await writable.close();
                            await updateAssetBrowserCallback();

                            // Auto-open
                            const freshHandle = await targetHandle.getFileHandle(fileName);
                            onAssetOpened(fileName, freshHandle, targetHandle, { path: `${targetPathDisplay}/${fileName}` });
                        } catch (err) {
                            console.error("Error al crear el archivo Léame:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_ARCHIVO', 'No se pudo crear el archivo.'));
                        }
                    }
                },
                'README.md' // Default value
            );
            break;
        }
        case 'create-tile-palette': {
            showPrompt(
                L.get('CREAR_PALETA_TILES', 'Crear Paleta de Tiles'),
                L.get('NOMBRE_PALETA_PROMPT', 'Introduce el nombre de la nueva paleta (.cepalette):'),
                async (paletteName) => {
                    if (paletteName) {
                        const fileName = paletteName.endsWith('.cepalette') ? paletteName : `${paletteName}.cepalette`;
                        try {
                            await createNewPalette(fileName, targetHandle);
                            await updateAssetBrowserCallback();
                        } catch (err) {
                            console.error("Error al crear la paleta:", err);
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CREAR_PALETA', 'No se pudo crear la paleta.'));
                        }
                    }
                }
            );
            break;
        }
        // Add other cases for create-scene, create-animation, etc.
        case 'delete': {
            if (selectedAsset) {
                showConfirmation(
                    L.get('CONFIRMAR_BORRADO', 'Confirmar Borrado'),
                    `${L.get('BORRAR_ASSET_CONFIRM', '¿Estás seguro de que quieres borrar')} '${selectedAsset.name}'? ${L.get('ACCION_IRREVERSIBLE', 'Esta acción no se puede deshacer.')}`,
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
                            showNotification(L.get('ERROR', 'Error'), L.get('ERROR_BORRAR_ASSET', 'No se pudo borrar el asset.'));
                        }
                    }
                );
            } else {
                showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SELECCION_BORRAR', 'Por favor, selecciona un archivo o carpeta para borrar.'));
            }
            break;
        }
        case 'rename': {
            if (selectedAsset) {
                const oldName = selectedAsset.name;
                showPrompt(
                    L.get('RENOMBRAR_ASSET', 'Renombrar Asset'),
                    `${L.get('INTRODUCE_NUEVO_NOMBRE', 'Introduce el nuevo nombre para')} '${oldName}':`,
                    async (newName) => {
                        if (newName && newName !== oldName) {
                            try {
                                if (selectedAsset.kind === 'directory') {
                                    showNotification(L.get('NO_IMPLEMENTADO', 'No Implementado'), L.get('ERROR_RENOMBRAR_CARPETA', 'El renombrado de carpetas aún no está implementado.'));
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
                                showNotification(L.get('ERROR', 'Error'), L.get('ERROR_RENOMBRAR_ASSET', 'No se pudo renombrar el asset.'));
                            }
                        }
                    },
                    oldName
                );
            } else {
                showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SELECCION_RENOMBRAR', 'Por favor, selecciona un archivo para renombrar.'));
            }
            break;
        }
        case 'export-package': {
             if (selectedAsset && selectedAsset.kind === 'directory') {
                onExportPackage(selectedAsset.name);
             } else {
                showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SELECCION_EXPORTAR', 'Por favor, selecciona una carpeta para exportar.'));
             }
            break;
        }
        case 'import-spine': {
            if (selectedAsset && selectedAsset.name.endsWith('.json')) {
                await handleImportSpine(selectedAsset);
            }
            break;
        }
    }
}

async function handleImportSpine(item) {
    const L = window.Localization;
    const selectedMateria = window.getSelectedMateria ? window.getSelectedMateria() : null;
    if (!selectedMateria) {
        showNotification(L.get('AVISO'), "Selecciona una Materia en la jerarquía para ser la raíz del esqueleto.");
        return;
    }

    try {
        const file = await currentDirectoryHandle.handle.getFileHandle(item.name);
        const fileObj = await file.getFile();
        const content = await fileObj.text();
        const result = await SkeletonImporter.importSpineJSON(content, selectedMateria, projectsDirHandle);

        showNotification(L.get('EXITO'), `Esqueleto importado con ${result.boneMap.size} huesos.`);

        if (result.animations.length > 0) {
            for (const anim of result.animations) {
                const fileName = `${anim.name}.cea`;
                try {
                    const fileH = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                    const writable = await fileH.createWritable();
                    await writable.write(JSON.stringify(anim, null, 2));
                    await writable.close();
                } catch (e) {
                    console.warn(`No se pudo guardar la animación ${fileName}`, e);
                }
            }
        }

        if (window.updateHierarchy) window.updateHierarchy();
        if (updateAssetBrowserCallback) await updateAssetBrowserCallback();
    } catch (e) {
        console.error("Error importando Spine:", e);
        showNotification(L.get('ERROR'), "No se pudo importar el archivo como Spine JSON.");
    }
}

// --- Core Functions ---
export async function updateAssetBrowser() {
    const L = window.Localization;
    const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
    if (!currentDirHandle || !dom.assetFolderTree || !dom.assetGridView) return;

    const folderTreeContainer = dom.assetFolderTree;
    const gridViewContainer = dom.assetGridView;

    const projectName = new URLSearchParams(window.location.search).get('project') || 'TestProject';
    console.log(`[AssetBrowser] Actualizando para el proyecto: ${projectName}`);

    try {
        projectHandle = await currentDirHandle.getDirectoryHandle(projectName, { create: true });
        assetsHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });

        // If project changed or we have no handle, reset to Assets root
        if (projectName !== lastProjectName || !currentDirectoryHandle.handle) {
             currentDirectoryHandle = { handle: assetsHandle, path: 'Assets' };
             lastProjectName = projectName;
             console.log(`[AssetBrowser] Navegación reseteada a /Assets para el proyecto '${projectName}'`);
        }
    } catch (err) {
        console.error(`[AssetBrowser] Error al acceder a la carpeta del proyecto '${projectName}':`, err);
        folderTreeContainer.innerHTML = '';
        gridViewContainer.innerHTML = `<p class="error-message">${L.get('ERROR_CARGA_ASSETS', 'Error al cargar los assets del proyecto.')}</p>`;
        return;
    }

    folderTreeContainer.innerHTML = '';

    async function handleDropOnFolder(targetFolderHandle, targetPath, droppedData) {
        if (!targetFolderHandle) return;

        if (droppedData.type === 'Materia') {
            const materiaId = parseInt(droppedData.id, 10);
            // Try to find the materia in the module's currentScene, fallback to global window.SceneManager
            let materia = SceneManager.currentScene ? SceneManager.currentScene.findMateriaById(materiaId) : null;
            if (!materia && window.SceneManager && window.SceneManager.currentScene) {
                materia = window.SceneManager.currentScene.findMateriaById(materiaId);
            }

            if (materia) {
                try {
                    // Sanitize filename: remove invalid characters
                    const sanitizedName = materia.name.replace(/[\\/:*?"<>|]/g, '_');
                    const prefabName = `${sanitizedName}.ceprefab`;
                    const prefabData = SceneManager.serializeMateria(materia, true);
                    const fileHandle = await targetFolderHandle.getFileHandle(prefabName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(prefabData, null, 2));
                    await writable.close();
                    console.log(`[AssetBrowser] Prefab creado con éxito: ${prefabName} en ${targetPath}`);

                    if (updateAssetBrowserCallback) {
                        await updateAssetBrowserCallback();
                    }
                    showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_CREAR_PREFAB', "Prefab creado correctamente")}: ${materia.name}`);
                } catch (err) {
                    console.error("[AssetBrowser] Error crítico al crear el prefab:", err);
                    showNotification(L.get('ERROR', 'Error'), `${L.get('ERROR_CREAR_PREFAB', "No se pudo crear el prefab")}: ${err.message}`);
                }
            } else {
                console.warn(`[AssetBrowser] No se encontró la materia con ID ${materiaId} en la escena.`);
            }
            return;
        }

        if (droppedData.type === 'Asset') {
            console.log(`[AssetBrowser] Intentando mover ${droppedData.path} a ${targetPath}`);
            try {
                const sourcePath = droppedData.path;
                const sourceParts = sourcePath.split('/').filter(p => p);
                const sourceFileName = sourceParts.pop();

                // Check if target is same as source directory
                const targetPathClean = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;
                const sourceDirPath = sourceParts.join('/');

                if (targetPathClean === sourceDirPath) {
                    console.log("[AssetBrowser] El destino es igual al origen. Ignorando movimiento.");
                    return;
                }

                let sourceDirHandle = projectHandle;
                for(const part of sourceParts) {
                    if(part) sourceDirHandle = await sourceDirHandle.getDirectoryHandle(part);
                }

                const sourceFileHandle = await sourceDirHandle.getFileHandle(sourceFileName);
                const file = await sourceFileHandle.getFile();

                // Create new file
                const newFileHandle = await targetFolderHandle.getFileHandle(sourceFileName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();

                // IMPORTANT: Delete original ONLY if it was successfully copied to a DIFFERENT location
                await sourceDirHandle.removeEntry(sourceFileName);

                console.log(`[AssetBrowser] Movido ${sourceFileName} a ${targetPath}`);
                await updateAssetBrowserCallback();

            } catch (error) {
                console.error("[AssetBrowser] Error al mover el archivo:", error);
                showNotification(L.get('ERROR', 'Error'), L.get('ERROR_MOVER_ARCHIVO', 'No se pudo mover el archivo.'));
            }
        }
    }

    async function populateGridView(dirHandle, dirPath) {
        gridViewContainer.innerHTML = '';
        gridViewContainer.directoryHandle = dirHandle;
        gridViewContainer.dataset.path = dirPath;

        // Unified drop handler for the grid view background
        gridViewContainer.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            gridViewContainer.classList.add('drag-over');
        };
        gridViewContainer.ondragleave = () => gridViewContainer.classList.remove('drag-over');
        gridViewContainer.ondrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            gridViewContainer.classList.remove('drag-over');
            // Cleanup parent blue state if drop handled here
            dom.assetsContent.classList.remove('drag-over-fs');

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                currentDirectoryHandle = { handle: dirHandle, path: dirPath };
                await handleExternalFileDrop(e);
                return;
            }

            try {
                const dataText = e.dataTransfer.getData('text/plain');
                if (dataText) {
                    const droppedData = JSON.parse(dataText);
                    await handleDropOnFolder(dirHandle, dirPath, droppedData);
                }
            } catch (err) {
                console.warn("[AssetBrowser] Error procesando drop en grid:", err);
            }
        };

        const entries = [];
        for await (const entry of dirHandle.values()) {
            entries.push(entry);
        }

        if (entries.length === 0) {
            gridViewContainer.innerHTML = `<p class="empty-folder-message" data-i18n="CARPETA_VACIA">${L.get('CARPETA_VACIA', 'La carpeta está vacía')}</p>`;
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

            const lowerName = entry.name.toLowerCase();

            if (entry.kind === 'directory') {
                iconContainer.innerHTML = `<img src="icons/folder.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
                item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; item.classList.add('drag-over'); });
                item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                item.addEventListener('drop', async (e) => {
                    item.classList.remove('drag-over');
                    e.preventDefault();
                    e.stopPropagation();
                    // Cleanup parent blue state
                    dom.assetsContent.classList.remove('drag-over-fs');

                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const targetFolderHandle = await dirHandle.getDirectoryHandle(entry.name);
                        currentDirectoryHandle = { handle: targetFolderHandle, path: `${dirPath}/${entry.name}` };
                        await handleExternalFileDrop(e);
                        return;
                    }

                    try {
                        const dataText = e.dataTransfer.getData('text/plain');
                        if (dataText) {
                            const droppedData = JSON.parse(dataText);
                            const targetFolderHandle = await dirHandle.getDirectoryHandle(entry.name);
                            await handleDropOnFolder(targetFolderHandle, `${dirPath}/${entry.name}`, droppedData);
                        }
                    } catch(err) {
                        console.warn("[AssetBrowser] Error al soltar sobre carpeta:", err);
                    }
                });
            } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                getURLForAssetPath(fullPath, currentDirHandle).then(url => {
                    if (url) {
                        imgIcon.src = url;
                        iconContainer.appendChild(imgIcon);
                    } else {
                        iconContainer.innerHTML = `<img src="icons/image.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
                    }
                });
            } else if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav')) {
                iconContainer.innerHTML = `<img src="icons/music.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.ogv')) {
                iconContainer.innerHTML = `<img src="icons/video.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.ttf') || lowerName.endsWith('.otf') || lowerName.endsWith('.woff') || lowerName.endsWith('.woff2')) {
                iconContainer.innerHTML = `<img src="icons/type.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.ces')) {
                iconContainer.innerHTML = `<img src="image/Script.png" style="width: 32px; height: 32px; object-fit: contain;">`;
            } else if (lowerName.endsWith('.chc')) {
                iconContainer.innerHTML = `<img src="icons/sparkles.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.cea')) {
                iconContainer.innerHTML = `<img src="image/cea.png" style="width: 32px; height: 32px; object-fit: contain;">`;
            } else if (lowerName.endsWith('.ceanim')) {
                iconContainer.innerHTML = `<img src="icons/route.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.cepalette')) {
                iconContainer.innerHTML = `<img src="icons/grid.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.cesprite')) {
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                getURLForAssetPath(fullPath, currentDirHandle).then(url => {
                    if (url) {
                        imgIcon.src = url;
                        iconContainer.appendChild(imgIcon);
                    } else {
                        iconContainer.innerHTML = `<img src="icons/image.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
                    }
                });
            } else if (lowerName.endsWith('.cep')) {
                iconContainer.innerHTML = `<img src="icons/box.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.cmel')) {
                iconContainer.innerHTML = `<img src="icons/image.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.cescene')) {
                iconContainer.innerHTML = `<img src="icons/map.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.ceprefab')) {
                iconContainer.innerHTML = `<img src="icons/box.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            } else if (lowerName.endsWith('.celib')) {
                iconContainer.innerHTML = `<img src="icons/box.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
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
                            iconContainer.innerHTML = `<img src="icons/box.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
                        }
                    } catch (e) {
                        console.error(`Error reading .celib file for icon: ${entry.name}`, e);
                        // Fallback icon on error
                        iconContainer.innerHTML = `<img src="icons/box.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
                    }
                })();
            } else {
                iconContainer.innerHTML = `<img src="icons/file.svg" class="ce-icon" style="width: 32px; height: 32px;">`;
            }

            const name = document.createElement('div');
            name.className = 'name';
            if (entry.kind === 'file') {
                const lastDotIndex = entry.name.lastIndexOf('.');
                name.textContent = lastDotIndex !== -1 ? entry.name.substring(0, lastDotIndex) : entry.name;
            } else {
                name.textContent = entry.name;
            }

            item.appendChild(iconContainer);
            item.appendChild(name);
            gridViewContainer.appendChild(item);
        }
    }

    async function populateFolderTree(dirHandle, currentPath, container, depth = 0) {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.style.paddingLeft = `${depth * 15 + 5}px`;
        folderItem.dataset.path = currentPath;

        const isCollapsed = collapsedFolders.has(currentPath);

        // Crear el toggle (triangulito)
        const toggle = document.createElement('span');
        toggle.className = 'folder-toggle';

        // Verificar si tiene subcarpetas para mostrar el toggle
        let hasSubfolders = false;
        try {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    hasSubfolders = true;
                    break;
                }
            }
        } catch(e) {}

        if (hasSubfolders) {
            toggle.classList.add('has-children');
            toggle.innerHTML = `<img src="icons/arrow-right.svg" class="ce-icon" style="width: 10px; height: 10px; transition: transform 0.2s; ${!isCollapsed ? 'transform: rotate(90deg);' : ''}">`;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (collapsedFolders.has(currentPath)) {
                    collapsedFolders.delete(currentPath);
                } else {
                    collapsedFolders.add(currentPath);
                }
                updateAssetBrowser(); // Refrescar el árbol
            });
        }
        folderItem.appendChild(toggle);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = dirHandle.name;
        folderItem.appendChild(nameSpan);

        if (currentDirectoryHandle.handle && await dirHandle.isSameEntry(currentDirectoryHandle.handle)) {
            folderItem.classList.add('active');
        }

        folderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDirectoryHandle = { handle: dirHandle, path: currentPath };
            updateAssetBrowser();
        });

        folderItem.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (hasSubfolders) {
                if (collapsedFolders.has(currentPath)) {
                    collapsedFolders.delete(currentPath);
                } else {
                    collapsedFolders.add(currentPath);
                }
                updateAssetBrowser();
            }
        });

        folderItem.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; folderItem.classList.add('drag-over'); });
        folderItem.addEventListener('dragleave', () => folderItem.classList.remove('drag-over'));
        folderItem.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            folderItem.classList.remove('drag-over');
            // Cleanup parent blue state
            dom.assetsContent.classList.remove('drag-over-fs');

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                currentDirectoryHandle = { handle: dirHandle, path: currentPath };
                await handleExternalFileDrop(e);
                return;
            }

            try {
                const dataText = e.dataTransfer.getData('text/plain');
                if (dataText) {
                    const droppedData = JSON.parse(dataText);
                    await handleDropOnFolder(dirHandle, currentPath, droppedData);
                }
            } catch(err) {
                console.warn("[AssetBrowser] Error al soltar en árbol de carpetas:", err);
            }
        });

        container.appendChild(folderItem);

        if (!isCollapsed) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'folder-children';
            container.appendChild(childrenContainer);

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
        // Pass the full path to the callback now
        onAssetOpened(name, fileHandle, currentDirectoryHandle.handle, { path: path });
    }
}

async function handleGridContextMenu(e) {
    e.preventDefault();
    const item = e.target.closest('.grid-item');
    const exportOption = dom.contextMenu.querySelector('[data-action="export-package"]');
    const exportDivider = dom.contextMenu.querySelector('.folder-only-divider');
    const importSpineOption = dom.contextMenu.querySelector('[data-action="import-spine"]');
    const fileDivider = dom.contextMenu.querySelector('.file-only-divider');

    if (item) {
        // Select the item that was right-clicked
        dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const assetName = item.dataset.name;
        const assetKind = item.dataset.kind;
        onAssetSelected(assetName, item.dataset.path, assetKind);

        contextAsset = { name: assetName, kind: assetKind }; // Store asset for context action

        const isJson = assetName.toLowerCase().endsWith('.json');
        exportOption.style.display = assetKind === 'directory' ? 'block' : 'none';
        exportDivider.style.display = assetKind === 'directory' ? 'block' : 'none';
        if (importSpineOption) importSpineOption.style.display = (assetKind === 'file' && isJson) ? 'block' : 'none';
        if (fileDivider) fileDivider.style.display = (assetKind === 'file' && isJson) ? 'block' : 'none';
    } else {
        // Right-clicked on empty space, deselect all
        dom.assetGridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
        onAssetSelected(null, null, null);
        contextAsset = null; // Clear context asset
        exportOption.style.display = 'none';
        exportDivider.style.display = 'none';
        if (importSpineOption) importSpineOption.style.display = 'none';
        if (fileDivider) fileDivider.style.display = 'none';
    }

    onShowContextMenu(dom.contextMenu, e);
}

function handleGridDragStart(e) {
    const item = e.target.closest('.grid-item');
    if (item) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'Asset',
            name: item.dataset.name,
            kind: item.dataset.kind,
            path: item.dataset.path
        }));
        e.dataTransfer.effectAllowed = 'copyMove';
    }
}

function handleExternalFileDragOver(e) {
    if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        // Garantizar que se vea durante el hover
        dom.assetsContent.classList.add('drag-over-fs');
    }
}

function handleExternalFileDragLeave(e) {
    if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;

        // Timeout logic to prevent flickering when moving between child elements
        setTimeout(() => {
            if (dragCounter <= 0) {
                dragCounter = 0;
                dom.assetsContent.classList.remove('drag-over-fs');
            }
        }, 50);
    }
}

async function processEntry(entry, targetHandle, stats) {
    const L = window.Localization;
    if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.zip')) {
            await importZipFile(file, targetHandle, stats);
            return;
        }

        if (lowerName.endsWith('.celib')) {
            try {
                const projectName = new URLSearchParams(window.location.search).get('project');
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                const projectHandle = await currentDirHandle.getDirectoryHandle(projectName);
                const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

                const fileHandle = await libDirHandle.getFileHandle(file.name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file);
                await writable.close();
                stats.libs++;
            } catch (err) {
                console.error(`Error al importar la librería '${file.name}':`, err);
                showNotification(L.get('ERROR_IMPORTACION', 'Error de Importación'), `${L.get('ERROR_IMPORTAR_LIB', "No se pudo importar la librería")}: '${file.name}'.`);
            }
        } else {
            try {
                const fileHandle = await targetHandle.getFileHandle(file.name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file);
                await writable.close();
                stats.files++;
            } catch (err) {
                console.error(`Error al importar el archivo '${file.name}':`, err);
                showNotification(L.get('ERROR_IMPORTACION', 'Error de Importación'), `${L.get('ERROR_IMPORTAR_ARCHIVO', "No se pudo importar el archivo")}: '${file.name}'.`);
            }
        }
    } else if (entry.isDirectory) {
        try {
            const newDirHandle = await targetHandle.getDirectoryHandle(entry.name, { create: true });
            const reader = entry.createReader();

            const readAllEntries = async (dirReader) => {
                let allEntries = [];
                let readBatch = async () => {
                    let entries = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                    if (entries.length > 0) {
                        allEntries = allEntries.concat(entries);
                        await readBatch();
                    }
                };
                await readBatch();
                return allEntries;
            };

            const children = await readAllEntries(reader);
            for (const child of children) {
                await processEntry(child, newDirHandle, stats);
            }
        } catch (err) {
            console.error(`Error al importar la carpeta '${entry.name}':`, err);
        }
    }
}

async function importZipFile(file, targetHandle, stats) {
    const L = window.Localization;
    if (typeof JSZip === 'undefined') {
        showNotification(L.get('ERROR'), "JSZip no está cargado. No se pueden procesar archivos ZIP.");
        return;
    }
    try {
        const zip = await JSZip.loadAsync(file);
        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;

            const parts = path.split('/').filter(p => p);
            const fileName = parts.pop();
            let current = targetHandle;

            for (const part of parts) {
                current = await current.getDirectoryHandle(part, { create: true });
            }

            const fileHandle = await current.getFileHandle(fileName, { create: true });
            const blob = await zipEntry.async('blob');
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            stats.files++;
        }
        console.log(`ZIP '${file.name}' descomprimido con éxito.`);
    } catch (err) {
        console.error(`Error al descomprimir ZIP '${file.name}':`, err);
        showNotification(L.get('ERROR', 'Error'), `No se pudo descomprimir el archivo ZIP: ${file.name}`);
    }
}

async function handleExternalFileDrop(e) {
    const L = window.Localization;
    dragCounter = 0;
    dom.assetsContent.classList.remove('drag-over-fs');

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (!currentDirectoryHandle.handle) {
        console.error("[AssetBrowser] No directory handle available for import.");
        showNotification(L.get('ERROR'), L.get('SELECCIONAR_CARPETA_IMPORTAR', 'Selecciona una carpeta para importar.'));
        return;
    }

    console.log(`Iniciando importación recursiva a ${currentDirectoryHandle.path}...`);
    let stats = { files: 0, libs: 0 };

    for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
            await processEntry(entry, currentDirectoryHandle.handle, stats);
        }
    }

    if (stats.files > 0) {
        console.log(`${stats.files} archivo(s) importados con éxito.`);
        await updateAssetBrowserCallback();
    }
    if (stats.libs > 0) {
        console.log(`${stats.libs} librería(s) importada(s) con éxito.`);
        if (refreshLibraryListCallback) {
            refreshLibraryListCallback();
        }
    }
}

export function getCurrentDirectoryHandle() {
    return currentDirectoryHandle.handle;
}

export function getCurrentDirectoryPath() {
    return currentDirectoryHandle.path;
}
